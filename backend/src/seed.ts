import bcrypt from "bcryptjs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { connectDB } from "@gestionate/core/server";
import User from "@gestionate/users/server";
import Product from "@gestionate/products/server";
import CashRegister from "@gestionate/cash-register/server";
import Category from "@gestionate/categories/server";

type SeedProduct = {
  name: string;
  description: string;
  price: number;
  cost: number;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  image: string;
  attributes: Record<string, string>;
};

const IMAGE_SOURCES = [
  "photo-1551024506-0bccd828d307",
  "photo-1582058091505-f87a2e55a40f",
  "photo-1599599810769-bcde5a160d32",
  "photo-1513506003901-1e6a229e2d15",
  "photo-1603006905003-be475563bc59",
  "photo-1602523961358-f9f03dd557db",
  "photo-1556910103-1c02745aae4d",
  "photo-1509440159596-0249088772ff",
  "photo-1492684223066-81342ee5ff30",
  "photo-1511795409834-ef04bbd61622",
  "photo-1527529482837-4698179dc6ce",
  "photo-1519671482749-fd09be7ccebf",
  "photo-1530103862676-de8c9debad1d",
];

const imageGroups = (term: string) => {
  const pick = (sources: string[]) =>
    `https://images.unsplash.com/${sources[term.length % sources.length]}?auto=format&fit=crop&w=640&q=80`;
  if (["alfajor", "gummy", "lollipop", "candy", "chocolate", "peanut", "marshmallow", "bubblegum", "mint"].includes(term)) {
    return pick([
      "photo-1551024506-0bccd828d307",
      "photo-1582058091505-f87a2e55a40f",
      "photo-1599599810769-bcde5a160d32",
    ]);
  }
  if (["birthday-candle", "candles", "sparkler"].includes(term)) {
    return pick([
      "photo-1513506003901-1e6a229e2d15",
      "photo-1603006905003-be475563bc59",
      "photo-1602523961358-f9f03dd557db",
    ]);
  }
  if (["sprinkles", "food-coloring", "cupcake", "pastry", "fondant", "cake-decorating", "cake", "baking"].includes(term)) {
    return pick([
      "photo-1556910103-1c02745aae4d",
      "photo-1509440159596-0249088772ff",
    ]);
  }
  if (["balloons", "party", "confetti", "masquerade", "party-hat", "hawaiian", "photobooth"].includes(term)) {
    return pick([
      "photo-1492684223066-81342ee5ff30",
      "photo-1511795409834-ef04bbd61622",
      "photo-1527529482837-4698179dc6ce",
      "photo-1530103862676-de8c9debad1d",
    ]);
  }
  return pick([
    "photo-1515003197210-e0cd71810b5f",
    "photo-1547592180-85f173990554",
    "photo-1601050690597-df0568f70950",
    "photo-1498837167922-ddd27525d352",
  ]);
};

const imageUrl = (term: string) => imageGroups(term);

const catalog: SeedProduct[] = [
  ...[
    ["Alfajor de chocolate", "Alfajor relleno con dulce de leche y cobertura de chocolate", 1200, 650, "GOL-001", 80, "alfajor"],
    ["Gomitas frutales", "Gomitas surtidas con formas y sabores frutales", 900, 420, "GOL-002", 120, "gummy"],
    ["Chupetines surtidos", "Chupetines individuales de sabores variados", 450, 180, "GOL-003", 200, "lollipop"],
    ["Caramelos masticables", "Caramelos masticables surtidos por unidad", 700, 300, "GOL-004", 150, "candy"],
    ["Confites de chocolate", "Confites de chocolate coloridos para mesa dulce", 1500, 800, "GOL-005", 70, "chocolate"],
    ["Turron de mani", "Turron blando de mani en porcion individual", 800, 380, "GOL-006", 90, "peanut"],
    ["Malvaviscos", "Malvaviscos blancos para candy bar y brochetas", 1100, 520, "GOL-007", 60, "marshmallow"],
    ["Chicles frutales", "Chicles individuales de sabores frutales", 600, 250, "GOL-008", 130, "bubblegum"],
    ["Pastillas de menta", "Pastillas refrescantes en presentacion individual", 650, 280, "GOL-009", 100, "mint"],
    ["Chocolatin con leche", "Tableta pequena de chocolate con leche", 1000, 520, "GOL-010", 85, "chocolate"],
  ].map(([name, description, price, cost, sku, stock, term], index) => ({
    name: name as string,
    description: description as string,
    price: price as number,
    cost: cost as number,
    sku: sku as string,
    category: "Golosina",
    stock: stock as number,
    minStock: 15,
    image: imageUrl(term as string),
    attributes: { unidad: "unidad", tipo: "golosina" },
  })),
  ...[
    ["Vela numero 0", "Vela decorativa para torta con forma de numero", 900, 400, "VEL-001", 35, "birthday-candle"],
    ["Vela numero 1", "Vela decorativa para torta con forma de numero", 900, 400, "VEL-002", 35, "birthday-candle"],
    ["Vela numero 2", "Vela decorativa para torta con forma de numero", 900, 400, "VEL-003", 35, "birthday-candle"],
    ["Vela numero 3", "Vela decorativa para torta con forma de numero", 900, 400, "VEL-004", 35, "birthday-candle"],
    ["Vela numero 4", "Vela decorativa para torta con forma de numero", 900, 400, "VEL-005", 35, "birthday-candle"],
    ["Vela numero 5", "Vela decorativa para torta con forma de numero", 900, 400, "VEL-006", 35, "birthday-candle"],
    ["Velas espiral pastel", "Set de velas espiral en colores pastel", 1300, 600, "VEL-007", 45, "candles"],
    ["Velas largas metalizadas", "Set de velas largas metalizadas para torta", 1600, 750, "VEL-008", 40, "candles"],
    ["Vela bengala", "Vela bengala para torta de celebracion", 1800, 850, "VEL-009", 30, "sparkler"],
    ["Vela estrella", "Vela decorativa con forma de estrella", 1200, 500, "VEL-010", 40, "birthday-candle"],
  ].map(([name, description, price, cost, sku, stock, term], index) => ({
    name: name as string,
    description: description as string,
    price: price as number,
    cost: cost as number,
    sku: sku as string,
    category: "Velas",
    stock: stock as number,
    minStock: 8,
    image: imageUrl(term as string),
    attributes: { unidad: "pack", tipo: "vela" },
  })),
  ...[
    ["Sprinkles multicolor", "Granas de colores para decorar tortas y cupcakes", 1800, 900, "REP-001", 45, "sprinkles"],
    ["Colorante alimentario rojo", "Colorante en gel para preparaciones de reposteria", 2200, 1100, "REP-002", 30, "food-coloring"],
    ["Pirotines de papel", "Pirotines estampados para cupcakes", 1400, 650, "REP-003", 60, "cupcake"],
    ["Manga pastelera descartable", "Mangas descartables para decorar", 1900, 850, "REP-004", 50, "pastry"],
    ["Boquillas para manga", "Set de boquillas metalicas para decorar", 3500, 1800, "REP-005", 20, "pastry"],
    ["Pasta de goma blanca", "Pasta de goma para modelado y decoracion", 2800, 1400, "REP-006", 25, "fondant"],
    ["Fondant rosa", "Pasta de fondant rosa para cubrir tortas", 3200, 1600, "REP-007", 20, "fondant"],
    ["Perlas comestibles", "Perlas de azucar para terminaciones", 2400, 1200, "REP-008", 35, "cake-decorating"],
    ["Topper feliz cumple", "Adorno para torta con mensaje feliz cumpleanos", 1700, 700, "REP-009", 40, "cake"],
    ["Molde de silicona", "Molde de silicona para cupcakes", 4500, 2300, "REP-010", 15, "baking"],
  ].map(([name, description, price, cost, sku, stock, term], index) => ({
    name: name as string,
    description: description as string,
    price: price as number,
    cost: cost as number,
    sku: sku as string,
    category: "Reposteria",
    stock: stock as number,
    minStock: 6,
    image: imageUrl(term as string),
    attributes: { unidad: "unidad", tipo: "reposteria" },
  })),
  ...[
    ["Globo metalizado estrella", "Globo metalizado con forma de estrella", 1800, 800, "COT-001", 50, "balloons"],
    ["Globo numero 1", "Globo metalizado con forma de numero", 2500, 1100, "COT-002", 35, "balloons"],
    ["Guirnalda feliz cumple", "Guirnalda decorativa para cumpleanos", 2800, 1300, "COT-003", 25, "party"],
    ["Banderin de colores", "Banderin multicolor para decorar fiestas", 2200, 1000, "COT-004", 30, "party"],
    ["Serpentina metalizada", "Serpentina metalizada para ambientacion", 1300, 550, "COT-005", 70, "party"],
    ["Confetti metalizado", "Confetti surtido para mesa y decoracion", 1500, 650, "COT-006", 45, "confetti"],
    ["Antifaz de cotillon", "Antifaz colorido para fotos y celebraciones", 1200, 500, "COT-007", 50, "masquerade"],
    ["Sombrero de fiesta", "Sombrero de carton con decoracion festiva", 1600, 700, "COT-008", 40, "party-hat"],
    ["Collar hawaiano", "Collar de flores artificiales para fiestas", 1900, 850, "COT-009", 30, "hawaiian"],
    ["Kit photobooth", "Set de accesorios para fotos de fiesta", 4200, 2100, "COT-010", 18, "photobooth"],
  ].map(([name, description, price, cost, sku, stock, term], index) => ({
    name: name as string,
    description: description as string,
    price: price as number,
    cost: cost as number,
    sku: sku as string,
    category: "Cotillon",
    stock: stock as number,
    minStock: 6,
    image: imageUrl(term as string),
    attributes: { unidad: "unidad", tipo: "cotillon" },
  })),
  ...[
    ["Vasos plasticos  descartables", "Vasos transparentes descartables de 250 ml", 1800, 850, "DES-001", 80, "plastic-cups"],
    ["Platos plasticos", "Platos plasticos descartables medianos", 2200, 1050, "DES-002", 70, "plastic-plates"],
    ["Cubiertos descartables", "Set de cubiertos plasticos descartables", 2500, 1200, "DES-003", 65, "disposable-cutlery"],
    ["Servilletas de colores", "Servilletas de papel estampadas", 1700, 750, "DES-004", 90, "napkins"],
    ["Mantel plastico", "Mantel plastico descartable para mesa", 3200, 1500, "DES-005", 30, "tablecloth"],
    ["Bandeja descartable", "Bandeja plastica para servir comidas", 2800, 1300, "DES-006", 40, "serving-tray"],
    ["Potes con tapa", "Potes transparentes descartables con tapa", 3000, 1450, "DES-007", 45, "food-containers"],
    ["Pajitas surtidas", "Pajitas flexibles de colores", 1200, 500, "DES-008", 100, "drinking-straws"],
    ["Bolsas para souvenirs", "Bolsitas transparentes para souvenirs", 1600, 700, "DES-009", 75, "gift-bags"],
    ["Cajas para torta", "Caja de carton con visor para tortas", 3500, 1700, "DES-010", 25, "cake-box"],
  ].map(([name, description, price, cost, sku, stock, term], index) => ({
    name: name as string,
    description: description as string,
    price: price as number,
    cost: cost as number,
    sku: sku as string,
    category: "Descartable",
    stock: stock as number,
    minStock: 10,
    image: imageUrl(term as string),
    attributes: { unidad: "pack", tipo: "descartable" },
  })),
];

async function downloadImage(sourceUrl: string, sku: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const cached = downloadedImages.get(sourceUrl);
  if (cached) return cached;
  const filename = `seed-${imageRevision}-${sku.toLowerCase()}.jpg`;
  try {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "Gestionate catalog seed/1.0" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let imageResponse = response;
    if (sourceUrl.includes("commons.wikimedia.org/w/api.php")) {
      const data = (await response.json()) as {
        query?: { pages?: Record<string, { imageinfo?: Array<{ url?: string }> }> };
      };
      const imageUrl = Object.values(data.query?.pages ?? {})[0]?.imageinfo?.[0]?.url;
      if (!imageUrl) throw new Error("Wikimedia no devolvio una imagen");
      imageResponse = await fetch(imageUrl, {
        headers: { "User-Agent": "Gestionate catalog seed/1.0" },
      });
      if (!imageResponse.ok) throw new Error(`Imagen HTTP ${imageResponse.status}`);
    }
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), Buffer.from(await imageResponse.arrayBuffer()));
    const localUrl = `/uploads/${filename}`;
    downloadedImages.set(sourceUrl, localUrl);
    return localUrl;
  } catch (error) {
    const fallback = `https://images.unsplash.com/${IMAGE_SOURCES[sku.length % IMAGE_SOURCES.length]}?auto=format&fit=crop&w=640&q=80`;
    console.warn(`No se pudo descargar la imagen especifica de ${sku}; se usara respaldo`, error);
    return fallback;
  }
}

const downloadedImages = new Map<string, string>();
const imageRevision = Date.now();

async function seed() {
  await connectDB();
  console.log("Conectado a MongoDB, sembrando datos del cotillon...");

  const adminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@orbita.com";
  const adminName = process.env.SUPER_ADMIN_NAME || "Super Admin";
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "Admin123!";

  await User.deleteMany({});
  await Product.deleteMany({});
  await CashRegister.deleteMany({});
  await Category.deleteMany({});

  const users = [
    { name: adminName, email: adminEmail, password: await bcrypt.hash(adminPassword, 12), role: "super_admin" },
    { name: "Carlos Encargado", email: "encargado@orbita.com", password: await bcrypt.hash("Encargado123!", 12), role: "encargado" },
    { name: "Maria Vendedora", email: "venta@orbita.com", password: await bcrypt.hash("Venta123!", 12), role: "vendedor" },
  ];
  await User.insertMany(users);

  const categories = [
    { name: "Golosina", color: "#f43f5e" },
    { name: "Velas", color: "#f59e0b" },
    { name: "Reposteria", color: "#ec4899" },
    { name: "Cotillon", color: "#8b5cf6" },
    { name: "Descartable", color: "#06b6d4" },
  ];
  await Category.insertMany(categories);

  const products = [];
  for (const product of catalog) {
    products.push({ ...product, image: await downloadImage(product.image, product.sku) });
  }
  await Product.insertMany(products);

  const encargado = await User.findOne({ role: "encargado" });
  if (!encargado) throw new Error("No se pudo crear el usuario encargado");
  await CashRegister.create({
    openedBy: encargado._id,
    openedByName: encargado.name,
    openingAmount: 50000,
    status: "abierta",
  });

  console.log(`Categorias creadas: ${categories.length}`);
  console.log(`Productos creados: ${products.length} (10 por categoria)`);
  console.log("Imagenes descargadas en backend/public/uploads");
  console.log(`Seed del cotillon completado. Usuario admin: ${adminEmail}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
