import { NextRequest } from "next/server";
import { connectDB } from "@gestionate/core/server";
import Category from "./model";

interface CapturedRequest extends NextRequest {
  __gestionateDeletedCategory?: string;
}

export function getDeletedCategoryName(req: NextRequest): string | null {
  return (req as CapturedRequest).__gestionateDeletedCategory ?? null;
}

function captureDeletedCategoryName(req: NextRequest, name: string): void {
  (req as CapturedRequest).__gestionateDeletedCategory = name;
}

export async function listCategories() {
  try {
    await connectDB();
    const categories = await Category.find({ active: true }).sort({ name: 1 });
    return Response.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function createCategory(req: NextRequest) {
  try {
    await connectDB();
    const { name, color } = await req.json();

    const cleanName = String(name || "").trim();
    if (!cleanName) {
      return Response.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const existing = await Category.findOne({
      name: { $regex: `^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (existing) {
      return Response.json({ error: "Ya existe esa categoría" }, { status: 409 });
    }

    const category = await Category.create({
      name: cleanName,
      color: String(color || "") || undefined,
    });
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function deleteCategory(_req: NextRequest, ctx: unknown) {
  try {
    await connectDB();
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return Response.json({ error: "Categoría no encontrada" }, { status: 404 });
    }
    captureDeletedCategoryName(_req, category.name);
    return Response.json({ message: "Categoría eliminada" });
  } catch (error) {
    console.error("Delete category error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}