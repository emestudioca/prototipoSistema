import { requireRole } from "@gestionate/auth/server";
import { getUser, updateUser, deactivateUser } from "@gestionate/users/server";

export const GET = requireRole(["super_admin"])(getUser);
export const PUT = requireRole(["super_admin"])(updateUser);
export const DELETE = requireRole(["super_admin"])(deactivateUser);