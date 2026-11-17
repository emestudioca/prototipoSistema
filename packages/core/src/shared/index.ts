export type Role = "super_admin" | "encargado" | "vendedor";

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type ProductFieldType = "text" | "number" | "select" | "boolean" | "date";

export interface ProductFieldDef {
  key: string;
  label: string;
  type: ProductFieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  active: boolean;
}

export interface IProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  image?: string;
  active: boolean;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface ISaleItem {
  product: string;
  productName: string;
  quantity: number;
  price: number;
  cost: number;
  subtotal: number;
}

export interface ISale {
  _id: string;
  items: ISaleItem[];
  total: number;
  costTotal: number;
  profit: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  seller: string;
  sellerName: string;
  cashRegister?: string;
  createdAt: string;
}

export interface ICashRegister {
  _id: string;
  openedBy: string;
  openedByName: string;
  closedBy?: string;
  closedByName?: string;
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
  difference?: number;
  totalSales: number;
  totalExpenses: number;
  status: "abierta" | "cerrada";
  openedAt: string;
  closedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface ICategory {
  _id: string;
  name: string;
  color?: string;
  active: boolean;
  createdAt: string;
}

export interface ProductImportError {
  row: number;
  sku: string;
  error: string;
}

export interface ProductImportResult {
  created: number;
  skipped: number;
  errors: ProductImportError[];
}