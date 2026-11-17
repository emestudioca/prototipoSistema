import { requireRole } from "@gestionate/auth/server";
import { listUsers, createUser } from "@gestionate/users/server";

export const GET = requireRole(["super_admin", "encargado"])(listUsers);
export const POST = requireRole(["super_admin"])(createUser);