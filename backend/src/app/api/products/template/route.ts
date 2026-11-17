import { requireAuth } from "@gestionate/auth/server";
import { getProductTemplate } from "@gestionate/products/server";

export const GET = requireAuth(getProductTemplate);