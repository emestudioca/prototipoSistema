import * as XLSX from "xlsx";
import { connectDB } from "@gestionate/core/server";
import Setting, {
  PRODUCT_MODEL_KEY,
  DEFAULT_PRODUCT_FIELDS,
} from "@gestionate/settings/server";
import type { ProductFieldDef } from "@gestionate/core/shared";

const BASE_COLUMNS: { label: string; key: string }[] = [
  { label: "Nombre", key: "name" },
  { label: "SKU", key: "sku" },
  { label: "Precio", key: "price" },
  { label: "Costo", key: "cost" },
  { label: "Categoría", key: "category" },
  { label: "Stock", key: "stock" },
  { label: "Stock Mínimo", key: "minStock" },
  { label: "Descripción", key: "description" },
];

const BASE_KEYWORDS: Record<string, string> = {
  nombre: "name",
  sku: "sku",
  precio: "price",
  costo: "cost",
  categoria: "category",
  stock: "stock",
  "stock minimo": "minStock",
  descripcion: "description",
};

export const MAX_IMPORT_ROWS = 5000;

export interface ImportRow {
  name: string;
  sku: string;
  price: number;
  cost: number;
  category: string;
  stock: number;
  minStock: number;
  description: string;
  attributes: Record<string, unknown>;
}

export interface ImportError {
  row: number;
  sku: string;
  error: string;
}

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export async function getActiveModelFields(): Promise<ProductFieldDef[]> {
  await connectDB();
  const setting = await Setting.findOne({ key: PRODUCT_MODEL_KEY });
  const source: ProductFieldDef[] =
    Array.isArray(setting?.value) && setting.value.length
      ? setting.value
      : DEFAULT_PRODUCT_FIELDS;
  return source.filter((f) => f.active);
}

function exampleFor(field: ProductFieldDef): unknown {
  switch (field.type) {
    case "text":
      return "Texto libre";
    case "number":
      return 0;
    case "select":
      return field.options?.[0] ?? "valor";
    case "boolean":
      return "Sí";
    case "date":
      return new Date().toISOString().slice(0, 10);
  }
}

function describeField(field: ProductFieldDef): string {
  switch (field.type) {
    case "text":
      return "Texto libre (opcional)";
    case "number":
      return "Número (ej: 1.5)";
    case "select":
      return `Una de: ${(field.options ?? []).join(", ")}`;
    case "boolean":
      return "Sí / No";
    case "date":
      return "Fecha en formato AAAA-MM-DD";
  }
}

export function buildTemplateBuffer(fields: ProductFieldDef[]): Buffer {
  const header = [...BASE_COLUMNS.map((c) => c.label), ...fields.map((f) => f.label)];
  const example = [
    "Ej: Alfajor de chocolate",
    "ALF-001",
    1200,
    800,
    "Alfajores",
    10,
    5,
    "Descripción opcional del producto",
    ...fields.map(exampleFor),
  ];

  const ws = XLSX.utils.aoa_to_sheet([header, example]);
  ws["!cols"] = [
    { wch: 30 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
    { wch: 38 },
    ...fields.map(() => ({ wch: 18 })),
  ];

  const instrRows: unknown[][] = [
    ["Columna", "Descripción y valores esperados"],
    ...BASE_COLUMNS.map((c) => {
      const desc: Record<string, string> = {
        name: "Nombre del producto (obligatorio)",
        sku: "Código único e irrepetible (obligatorio)",
        price: "Precio de venta en ARS (obligatorio)",
        cost: "Costo en ARS. Vacío = se usa el precio",
        category: "Categoría. Si no existe, se crea automáticamente. Vacío = General",
        stock: "Cantidad inicial en stock. Vacío = 0",
        minStock: "Mínimo para alerta de bajo stock. Vacío = 5",
        description: "Texto libre (opcional)",
      };
      return [c.label, desc[c.key]];
    }),
    ...fields.map((f) => [f.label, describeField(f)]),
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrRows);
  wsInstr["!cols"] = [{ wch: 22 }, { wch: 70 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Productos");
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instrucciones");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function parseNumber(v: unknown): number | null {
  if (v == null || `${v}`.trim() === "") return null;
  const n = Number(`${v}`.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseBoolean(v: unknown): boolean | null {
  if (v == null || `${v}`.trim() === "") return null;
  const t = norm(`${v}`);
  if (["si", "yes", "true", "verdadero", "activado", "1"].includes(t)) return true;
  if (["no", "false", "falso", "desactivado", "0"].includes(t)) return false;
  return null;
}

export function parseProductFile(
  buffer: ArrayBuffer,
  fields: ProductFieldDef[]
): { rows: ImportRow[]; errors: ImportError[] } {
  const errors: ImportError[] = [];
  const rows: ImportRow[] = [];

  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    errors.push({ row: 0, sku: "", error: "El archivo no contiene una hoja de cálculo válida" });
    return { rows, errors };
  }

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });
  if (aoa.length < 2) {
    errors.push({ row: 0, sku: "", error: "El archivo está vacío o solo tiene encabezados" });
    return { rows, errors };
  }

  const headers = aoa[0].map((h) => norm(`${h ?? ""}`));

  const fieldsByKeyword = new Map<string, ProductFieldDef>();
  for (const f of fields) {
    fieldsByKeyword.set(norm(f.key), f);
    fieldsByKeyword.set(norm(f.label), f);
  }

  const colMap = new Map<
    number,
    { kind: "base"; key: string } | { kind: "attr"; field: ProductFieldDef }
  >();
  headers.forEach((h, idx) => {
    if (!h) return;
    const base = BASE_KEYWORDS[h];
    if (base) {
      colMap.set(idx, { kind: "base", key: base });
      return;
    }
    const field = fieldsByKeyword.get(h);
    if (field) colMap.set(idx, { kind: "attr", field });
  });

  const hasName = [...colMap.values()].some((c) => c.kind === "base" && c.key === "name");
  const hasSku = [...colMap.values()].some((c) => c.kind === "base" && c.key === "sku");
  if (!hasName || !hasSku) {
    errors.push({
      row: 0,
      sku: "",
      error: "No se reconocen las columnas (faltan Nombre o SKU). Descargá la plantilla",
    });
    return { rows, errors };
  }

  const dataRows = aoa.length - 1;
  if (dataRows > MAX_IMPORT_ROWS) {
    errors.push({
      row: 0,
      sku: "",
      error: `El archivo tiene ${dataRows} filas. El máximo permitido es ${MAX_IMPORT_ROWS}`,
    });
    return { rows, errors };
  }

  for (let i = 1; i < aoa.length; i++) {
    const rowNum = i + 1; // 1-based, fila 1 = encabezados
    const cells = aoa[i];
    const record = new Map<string, unknown>();
    const attrs: Record<string, unknown> = {};

    for (const [idx, col] of colMap.entries()) {
      const raw = cells[idx];
      const empty = raw == null || `${raw}`.trim() === "";
      if (col.kind === "base") {
        if (!empty) record.set(col.key, raw);
      } else if (!empty) {
        attrs[col.field.key] = raw;
      }
    }

    const name = String(record.get("name") ?? "").trim();
    const sku = String(record.get("sku") ?? "").trim();

    if (!name && !sku) continue;

    if (!name) {
      errors.push({ row: rowNum, sku, error: "Falta el nombre del producto" });
      continue;
    }
    if (!sku) {
      errors.push({ row: rowNum, sku, error: "Falta el SKU" });
      continue;
    }

    const price = parseNumber(record.get("price"));
    if (price == null) {
      errors.push({ row: rowNum, sku, error: "Falta el precio (debe ser numérico)" });
      continue;
    }
    if (price < 0) {
      errors.push({ row: rowNum, sku, error: "El precio no puede ser negativo" });
      continue;
    }

    const attributes: Record<string, unknown> = {};
    let attrError: string | null = null;
    for (const field of fields) {
      if (!(field.key in attrs)) continue;
      const raw = attrs[field.key];
      switch (field.type) {
        case "number": {
          const n = parseNumber(raw);
          if (n == null) {
            attrError = `"${field.label}" debe ser numérico`;
          } else {
            attributes[field.key] = n;
          }
          break;
        }
        case "boolean": {
          const b = parseBoolean(raw);
          if (b == null) {
            attrError = `"${field.label}" debe ser Sí o No`;
          } else {
            attributes[field.key] = b;
          }
          break;
        }
        case "select": {
          const s = String(raw).trim();
          const opts = (field.options ?? []).map((o) => norm(o));
          if (opts.length > 0 && !opts.includes(norm(s))) {
            attrError = `"${field.label}" debe ser una de: ${(field.options ?? []).join(", ")}`;
          } else {
            attributes[field.key] = s;
          }
          break;
        }
        case "date": {
          const rawDate = raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw).trim();
          attributes[field.key] = rawDate;
          break;
        }
        default:
          attributes[field.key] = String(raw).trim();
      }
      if (attrError) break;
    }
    if (attrError) {
      errors.push({ row: rowNum, sku, error: attrError });
      continue;
    }

    const cost = parseNumber(record.get("cost")) ?? price;
    const stock = Math.max(0, Math.floor(parseNumber(record.get("stock")) ?? 0));
    const minStock = Math.max(0, Math.floor(parseNumber(record.get("minStock")) ?? 5));
    const category = String(record.get("category") ?? "General").trim() || "General";
    const description = String(record.get("description") ?? "").trim();

    rows.push({
      name,
      sku,
      price,
      cost,
      category,
      stock,
      minStock,
      description,
      attributes,
    });
  }

  return { rows, errors };
}