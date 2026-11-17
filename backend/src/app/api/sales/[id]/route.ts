import { requireAuth } from "@gestionate/auth/server";
import { getSale } from "@gestionate/sales/server";

export const GET = requireAuth(getSale);