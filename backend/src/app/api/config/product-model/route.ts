import { requireAuth, requireRole } from "@gestionate/auth/server";
import { getProductModel, updateProductModel } from "@gestionate/settings/server";

export const GET = requireAuth(getProductModel);
export const PUT = requireRole(["super_admin"])(updateProductModel);