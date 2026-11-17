import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@gestionate/core/server";
import User from "./model";
import { createUserRecord, toPublicUser } from "./service";

async function getParams(ctx: unknown) {
  return (await (ctx as { params: Promise<{ id: string }> }).params).id;
}

export async function listUsers() {
  try {
    await connectDB();
    const docs = await User.find({}).select("-password").sort({ createdAt: -1 });
    return Response.json({
      users: docs.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get users error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function createUser(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return Response.json(
        { error: "Nombre, email y contraseña requeridos" },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return Response.json({ error: "Email ya registrado" }, { status: 409 });
    }

    const user = await createUserRecord({ name, email, password, role });

    return Response.json(
      { user: toPublicUser(user) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function getUser(_req: NextRequest, ctx: unknown) {
  try {
    await connectDB();
    const id = await getParams(ctx);
    const user = await User.findById(id).select("-password");
    if (!user) {
      return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    return Response.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function updateUser(req: NextRequest, ctx: unknown) {
  try {
    await connectDB();
    const id = await getParams(ctx);
    const body = await req.json();

    if (body.password) {
      body.password = await bcrypt.hash(body.password, 12);
    } else {
      delete body.password;
    }

    const user = await User.findByIdAndUpdate(id, body, { new: true }).select(
      "-password"
    );
    if (!user) {
      return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    return Response.json({ user });
  } catch (error) {
    console.error("Update user error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function deactivateUser(_req: NextRequest, ctx: unknown) {
  try {
    await connectDB();
    const id = await getParams(ctx);
    const user = await User.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );
    if (!user) {
      return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    return Response.json({ message: "Usuario desactivado" });
  } catch (error) {
    console.error("Delete user error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}