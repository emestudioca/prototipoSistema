import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB, signToken } from "@gestionate/core/server";
import { findByEmail, toPublicUser, createUserRecord } from "@gestionate/users/server";
import { getAuthUser } from "./service";

export async function login(req: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const user = await findByEmail(email);
    if (!user) {
      return Response.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (!user.active) {
      return Response.json({ error: "Usuario desactivado" }, { status: 403 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return Response.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const token = signToken({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return Response.json({ token, user: toPublicUser(user) });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function register(req: NextRequest) {
  try {
    await connectDB();
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return Response.json(
        { error: "Nombre, email y contraseña requeridos" },
        { status: 400 }
      );
    }

    const existingUser = await findByEmail(email);
    if (existingUser) {
      return Response.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const user = await createUserRecord({ name, email, password, role });

    return Response.json({ user: toPublicUser(user) }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function me(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  return Response.json({ user });
}