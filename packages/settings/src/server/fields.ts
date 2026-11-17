import type { ProductFieldDef } from "@gestionate/core/shared";

export const PRODUCT_MODEL_KEY = "product_model";

export const DEFAULT_PRODUCT_FIELDS: ProductFieldDef[] = [
  {
    key: "marca",
    label: "Marca",
    type: "text",
    placeholder: "Ej: Coca-Cola, Néstle...",
    active: true,
  },
  {
    key: "unidad",
    label: "Unidad",
    type: "select",
    options: ["unidad", "kg", "g", "litro", "ml", "docena", "caja"],
    active: true,
  },
  {
    key: "codigo_barras",
    label: "Código de barras",
    type: "text",
    placeholder: "7790000000000",
    active: true,
  },
];

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isValidFieldKey(key: string): boolean {
  return /^[a-z0-9_]+$/.test(key);
}