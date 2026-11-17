import { NextRequest } from "next/server";
import { connectDB } from "@gestionate/core/server";
import Setting from "./model";
import {
  PRODUCT_MODEL_KEY,
  DEFAULT_PRODUCT_FIELDS,
  isValidFieldKey,
} from "./fields";
import type { ProductFieldDef } from "@gestionate/core/shared";

export async function getProductModel() {
  try {
    await connectDB();
    let setting = await Setting.findOne({ key: PRODUCT_MODEL_KEY });
    if (!setting) {
      setting = await Setting.create({
        key: PRODUCT_MODEL_KEY,
        value: DEFAULT_PRODUCT_FIELDS,
      });
    }
    return Response.json({ fields: setting.value });
  } catch (error) {
    console.error("Get product model error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function updateProductModel(req: NextRequest) {
  try {
    await connectDB();
    const { fields } = (await req.json()) as { fields: ProductFieldDef[] };

    if (!Array.isArray(fields)) {
      return Response.json({ error: "fields debe ser un array" }, { status: 400 });
    }

    for (const field of fields) {
      if (!field.key || !field.label || !field.type) {
        return Response.json(
          { error: "Cada campo debe tener key, label y type" },
          { status: 400 }
        );
      }
      if (!isValidFieldKey(field.key)) {
        return Response.json(
          { error: `Key inválida: "${field.key}". Solo minúsculas, números y guiones bajos.` },
          { status: 400 }
        );
      }
      if (!["text", "number", "select", "boolean", "date"].includes(field.type)) {
        return Response.json(
          { error: `Tipo inválido: "${field.type}"` },
          { status: 400 }
        );
      }
      if (field.type === "select" && (!field.options || field.options.length === 0)) {
        return Response.json(
          { error: `El campo "${field.label}" es select pero no tiene opciones` },
          { status: 400 }
        );
      }
    }

    const keys = fields.map((f) => f.key);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      return Response.json({ error: "Keys duplicadas" }, { status: 400 });
    }

    const result = await Setting.findOneAndUpdate(
      { key: PRODUCT_MODEL_KEY },
      { value: fields },
      { new: true, upsert: true }
    );

    return Response.json({ fields: result.value });
  } catch (error) {
    console.error("Update product model error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}