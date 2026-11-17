import { requireRole } from "@gestionate/auth/server";
import { closeRegister } from "@gestionate/cash-register/server";

export const POST = requireRole(["super_admin", "encargado"])(closeRegister);