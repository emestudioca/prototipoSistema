import { requireRole } from "@gestionate/auth/server";
import { adjustStock } from "@gestionate/products/server";

export const PUT = requireRole(["super_admin", "encargado"])(adjustStock);