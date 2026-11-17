import { requireRole } from "@gestionate/auth/server";
import { listRegisters, openRegister } from "@gestionate/cash-register/server";

export const GET = requireRole(["super_admin", "encargado"])(listRegisters);
export const POST = requireRole(["super_admin", "encargado"])(openRegister);