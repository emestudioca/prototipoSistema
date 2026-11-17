import { readFile, stat } from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/**
 * Next.js solo sirve los archivos que ya existian en public/ al arrancar.
 * Los productos subidos en runtime quedaban en 404, asi que se sirven desde aqui.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ file: string }> }
) {
  const { file } = await ctx.params;

  if (!file || file.includes("/") || file.includes("\\") || file.includes("..")) {
    return Response.json({ error: "Archivo inválido" }, { status: 400 });
  }

  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext];
  if (!type) {
    return Response.json({ error: "Tipo no permitido" }, { status: 404 });
  }

  const fullPath = path.join(UPLOAD_DIR, file);

  try {
    const info = await stat(fullPath);
    if (!info.isFile()) {
      return Response.json({ error: "Archivo no encontrado" }, { status: 404 });
    }
    const data = await readFile(fullPath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return Response.json({ error: "Archivo no encontrado" }, { status: 404 });
  }
}
