import { requireAuth, requireRole } from "@gestionate/auth/server";
import { listProducts, createProduct } from "@gestionate/products/server";

export const GET = requireAuth(listProducts);
export const POST = requireRole(["super_admin", "encargado"])(createProduct);