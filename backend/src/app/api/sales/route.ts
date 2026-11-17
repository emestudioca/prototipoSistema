import { requireRole } from "@gestionate/auth/server";
import { listSales, createSale } from "@gestionate/sales/server";
import { withRegisterTracking } from "@gestionate/cash-register/server";

export const GET = requireRole(["super_admin", "encargado", "vendedor"])(listSales);
export const POST = withRegisterTracking(
  requireRole(["super_admin", "encargado", "vendedor"])(createSale)
);