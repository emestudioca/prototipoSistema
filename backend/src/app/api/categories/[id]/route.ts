import { requireRole } from "@gestionate/auth/server";
import { deleteCategory } from "@gestionate/categories/server";
import { resetProductsOnCategoryDelete } from "@gestionate/products/server";

export const DELETE = resetProductsOnCategoryDelete(
  requireRole(["super_admin", "encargado"])(deleteCategory)
);