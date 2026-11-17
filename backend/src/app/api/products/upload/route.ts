import { requireRole } from "@gestionate/auth/server";
import { uploadImage } from "@gestionate/products/server";

export const POST = requireRole(["super_admin", "encargado"])(uploadImage);