import { NextRequest } from "next/server";
import { connectDB } from "@gestionate/core/server";
import Product from "./model";
import Category, { getDeletedCategoryName } from "@gestionate/categories/server";
import {
  getActiveModelFields,
  parseProductFile,
  buildTemplateBuffer,
  ImportError,
} from "./import";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export function resetProductsOnCategoryDelete(handler: Function) {
  return async (req: NextRequest, ctx?: unknown) => {
    const res = await handler(req, ctx);
    const categoryName = getDeletedCategoryName(req);
    if (categoryName) {
      await connectDB();
      await Product.updateMany(
        { category: categoryName },
        { $set: { category: "General" } }
      );
    }
    return res;
  };
}

function isNonNegativeNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export async function listProducts(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const lowStock = searchParams.get("lowStock") === "true";

    const filter: Record<string, unknown> = { active: true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }
    if (category) filter.category = category;
    if (lowStock) filter.$expr = { $lte: ["$stock", "$minStock"] };

    const products = await Product.find(filter).sort({ createdAt: -1 });
    return Response.json({ products });
  } catch (error) {
    console.error("Get products error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function createProduct(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.name || !body.sku) {
      return Response.json(
        { error: "Nombre y SKU requeridos" },
        { status: 400 }
      );
    }

    if (!isNonNegativeNumber(Number(body.price))) {
      return Response.json(
        { error: "El precio debe ser un número mayor o igual a 0" },
        { status: 400 }
      );
    }

    if (!isNonNegativeNumber(Number(body.cost))) {
      return Response.json(
        { error: "El costo debe ser un número mayor o igual a 0" },
        { status: 400 }
      );
    }

    if (body.stock !== undefined && !isNonNegativeNumber(Number(body.stock))) {
      return Response.json(
        { error: "El stock debe ser un número mayor o igual a 0" },
        { status: 400 }
      );
    }

    const existing = await Product.findOne({ sku: body.sku });
    if (existing) {
      return Response.json({ error: "SKU ya registrado" }, { status: 409 });
    }

    if (body.attributes && typeof body.attributes === "object") {
      body.attributes = new Map(Object.entries(body.attributes));
    }

    const product = await Product.create(body);
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

async function getParams(ctx: unknown) {
  return (await (ctx as { params: Promise<{ id: string }> }).params).id;
}

export async function getProduct(_req: NextRequest, ctx: unknown) {
  try {
    await connectDB();
    const id = await getParams(ctx);
    const product = await Product.findById(id);
    if (!product) {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    return Response.json({ product });
  } catch (error) {
    console.error("Get product error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function updateProduct(req: NextRequest, ctx: unknown) {
  try {
    await connectDB();
    const id = await getParams(ctx);
    const body = await req.json();

    if (body.price !== undefined && !isNonNegativeNumber(Number(body.price))) {
      return Response.json(
        { error: "El precio debe ser un número mayor o igual a 0" },
        { status: 400 }
      );
    }

    if (body.cost !== undefined && !isNonNegativeNumber(Number(body.cost))) {
      return Response.json(
        { error: "El costo debe ser un número mayor o igual a 0" },
        { status: 400 }
      );
    }

    if (body.stock !== undefined && !isNonNegativeNumber(Number(body.stock))) {
      return Response.json(
        { error: "El stock debe ser un número mayor o igual a 0" },
        { status: 400 }
      );
    }

    if (body.minStock !== undefined && !isNonNegativeNumber(Number(body.minStock))) {
      return Response.json(
        { error: "El stock mínimo debe ser un número mayor o igual a 0" },
        { status: 400 }
      );
    }

    if (body.sku) {
      const existing = await Product.findOne({ sku: body.sku, _id: { $ne: id } });
      if (existing) {
        return Response.json({ error: "SKU ya registrado" }, { status: 409 });
      }
    }

    if (body.attributes && typeof body.attributes === "object") {
      body.attributes = new Map(Object.entries(body.attributes));
    }

    const product = await Product.findByIdAndUpdate(id, body, { new: true });
    if (!product) {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    return Response.json({ product });
  } catch (error) {
    console.error("Update product error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function deleteProduct(_req: NextRequest, ctx: unknown) {
  try {
    await connectDB();
    const id = await getParams(ctx);
    const product = await Product.findOneAndUpdate(
      { _id: id, active: true },
      { active: false },
      { new: true }
    );
    if (!product) {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    return Response.json({ message: "Producto eliminado" });
  } catch (error) {
    console.error("Delete product error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function adjustStock(req: NextRequest) {
  try {
    await connectDB();
    const { productId, quantity, type } = await req.json();

    if (!productId || quantity === undefined || !type) {
      return Response.json(
        { error: "productId, quantity y type requeridos" },
        { status: 400 }
      );
    }

    const cantidad = Number(quantity);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return Response.json(
        { error: "La cantidad debe ser un número mayor a 0" },
        { status: 400 }
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    if (type === "entrada") {
      product.stock += cantidad;
    } else if (type === "salida") {
      if (product.stock < cantidad) {
        return Response.json(
          { error: "Stock insuficiente" },
          { status: 400 }
        );
      }
      product.stock -= cantidad;
    } else {
      return Response.json({ error: "Tipo inválido (entrada/salida)" }, { status: 400 });
    }

    await product.save();
    return Response.json({ product });
  } catch (error) {
    console.error("Stock update error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function importProducts(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string" || !(file as File).name) {
      return Response.json({ error: "No se envió archivo" }, { status: 400 });
    }

    const uploaded = file as File;

    const maxSize = 5 * 1024 * 1024;
    if (uploaded.size > maxSize) {
      return Response.json(
        { error: "El archivo no puede superar 5MB" },
        { status: 400 }
      );
    }
    if (uploaded.size === 0) {
      return Response.json({ error: "El archivo está vacío" }, { status: 400 });
    }

    const fields = await getActiveModelFields();
    const buffer = await uploaded.arrayBuffer();
    const { rows, errors } = parseProductFile(buffer, fields);

    if (errors.length > 0 && rows.length === 0) {
      return Response.json(
        { error: errors[0].error },
        { status: 400 }
      );
    }

    const existing = await Product.find(
      { sku: { $in: rows.map((r) => r.sku) } },
      "sku"
    );
    const existingSkus = new Set(existing.map((e) => e.sku));

    const categories = new Set(
      rows.map((r) => r.category).filter((c) => c !== "General")
    );
    if (categories.size > 0) {
      await Category.bulkWrite(
        [...categories].map((name) => ({
          updateOne: {
            filter: { name },
            update: { $setOnInsert: { name, color: "", active: true } },
            upsert: true,
          },
        })),
        { ordered: false }
      );
    }

    const seen = new Set<string>();
    const importErrors: ImportError[] = [...errors];
    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      if (existingSkus.has(row.sku) || seen.has(row.sku)) {
        skipped++;
        importErrors.push({
          row: 0,
          sku: row.sku,
          error: `El SKU ya existe en el sistema (no se importó)`,
        });
        seen.add(row.sku);
        continue;
      }
      seen.add(row.sku);
      try {
        await Product.create({
          name: row.name,
          sku: row.sku,
          price: row.price,
          cost: row.cost,
          category: row.category,
          stock: row.stock,
          minStock: row.minStock,
          description: row.description,
          attributes: new Map(Object.entries(row.attributes)),
          active: true,
        });
        created++;
      } catch (error: any) {
        if (error?.code === 11000) {
          skipped++;
          importErrors.push({
            row: 0,
            sku: row.sku,
            error: "El SKU ya existe en el sistema (no se importó)",
          });
        } else {
          skipped++;
          console.error("Import insert error:", error);
          importErrors.push({
            row: 0,
            sku: row.sku,
            error: "Error interno al guardar",
          });
        }
      }
    }

    return Response.json({ created, skipped, errors: importErrors });
  } catch (error) {
    console.error("Import error:", error);
    return Response.json({ error: "Error al importar productos" }, { status: 500 });
  }
}

export async function getProductTemplate() {
  try {
    const fields = await getActiveModelFields();
    const buffer = buildTemplateBuffer(fields);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="plantilla_productos.xlsx"',
      },
    });
  } catch (error) {
    console.error("Template error:", error);
    return Response.json({ error: "Error al generar la plantilla" }, { status: 500 });
  }
}

export async function uploadImage(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No se envió archivo" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return Response.json(
        { error: "Solo se permiten imágenes (JPG, PNG, WebP, GIF)" },
        { status: 400 }
      );
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return Response.json(
        { error: "La imagen no puede superar 2MB" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));

    return Response.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Error al subir imagen" }, { status: 500 });
  }
}