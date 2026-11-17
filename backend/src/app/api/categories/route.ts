import { requireAuth, requireRole } from "@gestionate/auth/server";
import { listCategories, createCategory } from "@gestionate/categories/server";

export const GET = requireAuth(listCategories);
export const POST = requireRole(["super_admin", "encargado"])(createCategory);