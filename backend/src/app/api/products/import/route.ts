import { requireRole } from "@gestionate/auth/server";
import { importProducts } from "@gestionate/products/server";

export const POST = requireRole(["super_admin", "encargado"])(importProducts);