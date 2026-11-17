import { NextRequest } from "next/server";
import { connectDB } from "@gestionate/core/server";
import Product from "@gestionate/products/server";
import Sale from "./model";

export interface CapturedSale {
  saleId: string;
  total: number;
}

interface CapturedRequest extends NextRequest {
  __gestionateCapturedSale?: CapturedSale;
}

export function getCapturedSale(req: NextRequest): CapturedSale | null {
  return (req as CapturedRequest).__gestionateCapturedSale ?? null;
}

function captureSale(req: NextRequest, data: CapturedSale): void {
  (req as CapturedRequest).__gestionateCapturedSale = data;
}

export async function listSales(
  req: NextRequest,
  _ctx: unknown,
  user: { id: string; role: string }
) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const seller = searchParams.get("seller") || "";

    const filter: Record<string, unknown> = {};
    if (seller) filter.seller = seller;
    if (user.role === "vendedor") filter.seller = user.id;

    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);
    return Response.json({ sales });
  } catch (error) {
    console.error("Get sales error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function createSale(
  req: NextRequest,
  _ctx: unknown,
  user: { id: string; name: string }
) {
  try {
    await connectDB();
    const { items, paymentMethod } = await req.json();

    if (!items || items.length === 0) {
      return Response.json({ error: "Carrito vacío" }, { status: 400 });
    }

    let total = 0;
    let costTotal = 0;
    const saleItems = [];

    for (const item of items) {
      const cantidad = Number(item?.quantity);
      if (!item?.productId || !Number.isFinite(cantidad) || cantidad <= 0) {
        return Response.json(
          { error: "Cada ítem debe tener producto y una cantidad mayor a 0" },
          { status: 400 }
        );
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        return Response.json(
          { error: `Producto no encontrado` },
          { status: 404 }
        );
      }
      if (!product.active) {
        return Response.json(
          { error: `Producto ${product.name} desactivado` },
          { status: 400 }
        );
      }
      if (product.stock < cantidad) {
        return Response.json(
          { error: `Stock insuficiente para ${product.name}` },
          { status: 400 }
        );
      }

      const price = product.price;
      const cost = product.cost;
      const subtotal = price * cantidad;

      total += subtotal;
      costTotal += cost * cantidad;
      saleItems.push({
        product: product._id,
        productName: product.name,
        quantity: cantidad,
        price,
        cost,
        subtotal,
      });
    }

    const sale = await Sale.create({
      items: saleItems,
      total,
      costTotal,
      profit: total - costTotal,
      paymentMethod: paymentMethod || "efectivo",
      seller: user.id,
      sellerName: user.name,
    });

    for (const doc of await Product.find({
      _id: { $in: saleItems.map((i) => i.product) },
    })) {
      const item = saleItems.find((i) => i.product.toString() === doc._id.toString());
      if (item) {
        doc.stock -= item.quantity;
        await doc.save();
      }
    }

    captureSale(req, { saleId: sale._id.toString(), total });

    return Response.json({ sale }, { status: 201 });
  } catch (error) {
    console.error("Create sale error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function getSale(_req: NextRequest, ctx: unknown) {
  try {
    await connectDB();
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const sale = await Sale.findById(id).populate("items.product");
    if (!sale) {
      return Response.json({ error: "Venta no encontrada" }, { status: 404 });
    }
    return Response.json({ sale });
  } catch (error) {
    console.error("Get sale error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}