import bcrypt from "bcryptjs";
import { connectDB } from "@gestionate/core/server";
import User from "@gestionate/users/server";

async function resetUsers() {
  await connectDB();

  const email = process.env.SUPER_ADMIN_EMAIL;
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Falta SUPER_ADMIN_EMAIL o SUPER_ADMIN_PASSWORD en el .env");
    process.exit(1);
  }

  await User.deleteMany({});
  console.log("Usuarios eliminados.");

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 12),
    role: "super_admin",
    active: true,
  });

  console.log(`Super Admin creado: ${user.email} / super_admin (clave desde .env)`);
  process.exit(0);
}

resetUsers().catch((err) => {
  console.error(err);
  process.exit(1);
});