import { requireRole, register } from "@gestionate/auth/server";

export const POST = requireRole(["super_admin"])(register);