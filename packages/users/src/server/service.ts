import bcrypt from "bcryptjs";
import User, { IUserDoc } from "./model";
import { connectDB } from "@gestionate/core/server";
import type { Role } from "@gestionate/core/shared";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function toPublicUser(user: IUserDoc) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function findByEmail(email: string) {
  await connectDB();
  return User.findOne({ email: email.toLowerCase() });
}

export async function createUserRecord(data: {
  name: string;
  email: string;
  password: string;
  role?: string;
}) {
  await connectDB();
  const user = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: await hashPassword(data.password),
    role: (data.role as Role) || "vendedor",
  });
  return user;
}