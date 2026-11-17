import { NextRequest } from "next/server";
import { connectDB, verifyToken, type AuthUser } from "@gestionate/core/server";
import User from "@gestionate/users/server";

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  const user = verifyToken(token);
  if (!user) return null;

  await connectDB();
  const dbUser = await User.findById(user.id).select("active");
  if (!dbUser || !dbUser.active) return null;

  return user;
}

export function requireAuth(handler: Function) {
  return async (req: NextRequest, ctx?: unknown) => {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    return handler(req, ctx, user);
  };
}

export function requireRole(roles: string[]) {
  return (handler: Function) => {
    return async (req: NextRequest, ctx?: unknown) => {
      const user = await getAuthUser(req);
      if (!user) {
        return Response.json({ error: "No autorizado" }, { status: 401 });
      }
      if (!roles.includes(user.role)) {
        return Response.json({ error: "Sin permisos" }, { status: 403 });
      }
      return handler(req, ctx, user);
    };
  };
}