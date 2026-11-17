import { requireAuth, requireRole } from "@gestionate/auth/server";
import {
  getProduct,
  updateProduct,
  deleteProduct,
} from "@gestionate/products/server";

export const GET = requireAuth(getProduct);
export const PUT = requireRole(["super_admin", "encargado"])(updateProduct);
export const DELETE = requireRole(["super_admin", "encargado"])(deleteProduct);