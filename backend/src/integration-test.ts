const BASE = process.env.API_URL || "http://localhost:3001/api";

const ADMIN = { email: "admin@orbita.com", password: process.env.SUPER_ADMIN_PASSWORD || "kYE!gYpQE2dKEFeb3N" };
const ENCARGADO = { email: "encargado@orbita.com", password: "Encargado123!" };
const VENDEDOR = { email: "venta@orbita.com", password: "Venta123!" };

let pass = 0;
let fail = 0;
const failures: string[] = [];
const findings: string[] = [];

function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    pass++;
    console.log(`  [OK]   ${name}`);
  } else {
    fail++;
    failures.push(name + (extra ? ` -- ${extra}` : ""));
    console.log(`  [FALLA] ${name} ${extra}`);
  }
}

function finding(title: string, detail: string) {
  findings.push(`${title} :: ${detail}`);
  console.log(`  [HALLAZGO] ${title}`);
}

async function req(
  path: string,
  options: { method?: string; token?: string; body?: unknown; formData?: FormData; raw?: boolean } = {}
) {
  const headers: Record<string, string> = {};
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method: options.method || (options.body !== undefined || options.formData ? "POST" : "GET"),
    headers,
    body: options.formData ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  });
  if (options.raw) return { status: res.status, buffer: Buffer.from(await res.arrayBuffer()) };
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* sin cuerpo JSON */
  }
  return { status: res.status, data };
}

async function ensureUser(token: string, creds: typeof ADMIN, name: string, role: string) {
  const login = await req("/auth/login", { body: creds });
  if (login.status === 200) return login.data.token;
  const created = await req("/users", {
    method: "POST",
    token,
    body: { name, email: creds.email, password: creds.password, role },
  });
  if (created.status !== 201) {
    console.error(`  No se pudo crear ${creds.email}: ${JSON.stringify(created.data)}`);
    process.exit(1);
  }
  const retry = await req("/auth/login", { body: creds });
  if (retry.status !== 200) {
    console.error(`  ${creds.email} creado pero no puede loguearse`);
    process.exit(1);
  }
  console.log(`  (usuario ${creds.email}/${role} creado por el test)`);
  return retry.data.token;
}

const TAG = Date.now();
const SKU_T = `TST-${TAG}`;
const CAT_T = `TSTCat-${TAG}`;

async function main() {
  console.log(`\n############ TEST DE API -- ${new Date().toLocaleString("es-AR")} ############\n`);

  console.log("=== 0. HEALTH ===");
  const sinTokenCfg = await req("/config/product-model");
  check(
    "las rutas protegidas rechazan peticiones sin token",
    sinTokenCfg.status === 401,
    `GET /config/product-model sin token devolvio ${sinTokenCfg.status}`
  );
  if (sinTokenCfg.status === 200) {
    finding(
      "GET /api/config/product-model no exige autenticacion",
      "Devuelve 200 sin token y ademas escribe en la base (crea el doc si no existe)"
    );
  }

  console.log("\n=== 1. AUTH ===");
  const admin = await req("/auth/login", { body: ADMIN });
  check("login super_admin", admin.status === 200 && admin.data?.user?.role === "super_admin", JSON.stringify(admin.data));
  const AT = admin.data?.token;
  if (!AT) {
    console.error("\nNo se pudo obtener token de admin. Abortando.");
    process.exit(1);
  }

  const ET = await ensureUser(AT, ENCARGADO, "Carlos Encargado", "encargado");
  const VT = await ensureUser(AT, VENDEDOR, "Maria Vendedora", "vendedor");
  check("login encargado", !!ET);
  check("login vendedor", !!VT);

  const bad = await req("/auth/login", { body: { email: ADMIN.email, password: "incorrecta" } });
  check("login con clave incorrecta -> 401", bad.status === 401);
  const noFields = await req("/auth/login", { body: { email: ADMIN.email } });
  check("login sin password -> 400", noFields.status === 400);

  const me = await req("/auth/me", { token: AT });
  check("GET /auth/me con token valido", me.status === 200 && me.data?.user?.email === ADMIN.email);
  const meNo = await req("/auth/me");
  check("GET /auth/me sin token -> 401", meNo.status === 401);
  const meBad = await req("/auth/me", { token: "basura.invalida" });
  check("GET /auth/me con token basura -> 401", meBad.status === 401);

  console.log("\n=== 2. RESTRICCIONES DE ROL (backend) ===");
  const pVend = await req("/products", { method: "POST", token: VT, body: { name: "X", price: 1, sku: "X1" } });
  check("vendedor NO crea producto -> 403", pVend.status === 403, `status=${pVend.status}`);
  const uVend = await req("/users", { token: VT });
  check("vendedor NO lista usuarios -> 403", uVend.status === 403, `status=${uVend.status}`);
  const cVend = await req("/categories", { method: "POST", token: VT, body: { name: "X" } });
  check("vendedor NO crea categoria -> 403", cVend.status === 403, `status=${cVend.status}`);
  const crVend = await req("/cash-register", { method: "POST", token: VT, body: { openingAmount: 1 } });
  check("vendedor NO abre caja -> 403", crVend.status === 403, `status=${crVend.status}`);
  const uEnc = await req("/users", { token: ET });
  check("encargado SI lista usuarios -> 200", uEnc.status === 200, `status=${uEnc.status}`);
  const uEncPost = await req("/users", {
    method: "POST",
    token: ET,
    body: { name: "X", email: `x${TAG}@x.com`, password: "123456" },
  });
  check("encargado NO crea usuario -> 403", uEncPost.status === 403, `status=${uEncPost.status}`);
  const cfgEnc = await req("/config/product-model", { method: "PUT", token: ET, body: { fields: [] } });
  check("encargado NO edita modelo -> 403", cfgEnc.status === 403, `status=${cfgEnc.status}`);
  const noToken = await req("/products");
  check("sin token no lista productos -> 401", noToken.status === 401, `status=${noToken.status}`);

  console.log("\n=== 3. CATEGORIAS ===");
  const cat = await req("/categories", { method: "POST", token: AT, body: { name: CAT_T, color: "#ff0000" } });
  check("crear categoria -> 201", cat.status === 201, JSON.stringify(cat.data));
  const cid = cat.data?.category?._id;
  const catDup = await req("/categories", { method: "POST", token: AT, body: { name: CAT_T.toLowerCase() } });
  check("categoria duplicada (case-insensitive) -> 409", catDup.status === 409, `status=${catDup.status}`);
  const catVacia = await req("/categories", { method: "POST", token: AT, body: { name: "   " } });
  check("categoria con nombre vacio -> 400", catVacia.status === 400, `status=${catVacia.status}`);
  const catList = await req("/categories", { token: AT });
  check("listar categorias -> 200", catList.status === 200 && Array.isArray(catList.data?.categories));

  console.log("\n=== 4. PRODUCTOS CRUD ===");
  const nuevo = {
    name: `TST Producto ${TAG}`,
    description: "producto de prueba automatica",
    price: 1000,
    cost: 400,
    sku: SKU_T,
    category: CAT_T,
    stock: 50,
    minStock: 5,
    attributes: { marca: "MarcaTest", unidad: "unidad", codigo_barras: `779${TAG}` },
  };
  const created = await req("/products", { method: "POST", token: AT, body: nuevo });
  check("crear producto -> 201", created.status === 201, JSON.stringify(created.data));
  const pid = created.data?.product?._id;

  const dupSku = await req("/products", {
    method: "POST",
    token: AT,
    body: { name: "Dup", price: 1, cost: 1, sku: SKU_T },
  });
  check("SKU duplicado -> 409", dupSku.status === 409, `status=${dupSku.status}`);
  const sinNombre = await req("/products", { method: "POST", token: AT, body: { price: 1, sku: `Z${TAG}` } });
  check("producto sin nombre -> 400", sinNombre.status === 400, `status=${sinNombre.status}`);
  const sinSku = await req("/products", { method: "POST", token: AT, body: { name: "SinSku", price: 1 } });
  check("producto sin SKU -> 400", sinSku.status === 400, `status=${sinSku.status}`);
  const sinPrecio = await req("/products", { method: "POST", token: AT, body: { name: "SinPrecio", sku: `P${TAG}` } });
  check("producto sin precio -> 400", sinPrecio.status === 400, `status=${sinPrecio.status}`);
  const precioNeg = await req("/products", {
    method: "POST",
    token: AT,
    body: { name: "PrecioNeg", price: -5, cost: 1, sku: `N${TAG}` },
  });
  check("producto con precio negativo -> 400", precioNeg.status === 400, `status=${precioNeg.status}`);
  const costoNeg = await req("/products", {
    method: "POST",
    token: AT,
    body: { name: "CostoNeg", price: 100, cost: -5, sku: `CN${TAG}` },
  });
  check("producto con costo negativo -> 400", costoNeg.status === 400, `status=${costoNeg.status}`);
  const sinCosto = await req("/products", {
    method: "POST",
    token: AT,
    body: { name: "SinCosto", price: 100, sku: `SC${TAG}` },
  });
  check("producto sin costo -> 400 (el modelo lo exige)", sinCosto.status === 400, `status=${sinCosto.status}`);
  const stockNeg = await req("/products", {
    method: "POST",
    token: AT,
    body: { name: "StockNeg", price: 100, cost: 1, stock: -5, sku: `SN${TAG}` },
  });
  check("producto con stock negativo -> 400", stockNeg.status === 400, `status=${stockNeg.status}`);
  const updPrecioNeg = await req(`/products/${pid}`, {
    method: "PUT",
    token: AT,
    body: { price: -99 },
  });
  check("actualizar a precio negativo -> 400", updPrecioNeg.status === 400, `status=${updPrecioNeg.status}`);

  const got = await req(`/products/${pid}`, { token: AT });
  check("obtener producto por id -> 200", got.status === 200 && got.data?.product?.sku === SKU_T);
  check("attributes guardados como mapa", got.data?.product?.attributes?.marca === "MarcaTest");
  check("stock inicial 50", got.data?.product?.stock === 50, `stock=${got.data?.product?.stock}`);
  const noExiste = await req(`/products/64b7f0000000000000000000`, { token: AT });
  check("producto inexistente -> 404", noExiste.status === 404, `status=${noExiste.status}`);

  const search = await req(`/products?search=${encodeURIComponent(`TST Producto ${TAG}`)}`, { token: AT });
  check("busqueda por nombre", search.status === 200 && search.data?.products?.length >= 1);
  const byCat = await req(`/products?category=${CAT_T}`, { token: AT });
  check("filtro por categoria", byCat.status === 200 && byCat.data?.products?.every((p: any) => p.category === CAT_T));

  const upd = await req(`/products/${pid}`, {
    method: "PUT",
    token: AT,
    body: { name: `TST Producto ${TAG} Premium`, price: 1500, attributes: { marca: "OtraMarca" } },
  });
  check("actualizar producto -> 200", upd.status === 200 && upd.data?.product?.price === 1500);
  check("update reemplaza attributes", upd.data?.product?.attributes?.marca === "OtraMarca");

  console.log("\n=== 5. STOCK ===");
  const ent = await req("/products/stock", {
    method: "PUT",
    token: AT,
    body: { productId: pid, quantity: 20, type: "entrada" },
  });
  check("entrada +20 (50->70)", ent.status === 200 && ent.data?.product?.stock === 70, `stock=${ent.data?.product?.stock}`);
  const sal = await req("/products/stock", {
    method: "PUT",
    token: AT,
    body: { productId: pid, quantity: 30, type: "salida" },
  });
  check("salida -30 (70->40)", sal.status === 200 && sal.data?.product?.stock === 40, `stock=${sal.data?.product?.stock}`);
  const salSinStock = await req("/products/stock", {
    method: "PUT",
    token: AT,
    body: { productId: pid, quantity: 9999, type: "salida" },
  });
  check("salida sin stock -> 400", salSinStock.status === 400, `status=${salSinStock.status}`);
  const tipoInvalido = await req("/products/stock", {
    method: "PUT",
    token: AT,
    body: { productId: pid, quantity: 1, type: "inventado" },
  });
  check("tipo de movimiento invalido -> 400", tipoInvalido.status === 400, `status=${tipoInvalido.status}`);
  const sinCantidad = await req("/products/stock", { method: "PUT", token: AT, body: { productId: pid, type: "entrada" } });
  check("ajuste sin cantidad -> 400", sinCantidad.status === 400, `status=${sinCantidad.status}`);
  const prodInexistente = await req("/products/stock", {
    method: "PUT",
    token: AT,
    body: { productId: "64b7f0000000000000000000", quantity: 1, type: "entrada" },
  });
  check("ajuste sobre producto inexistente -> 404", prodInexistente.status === 404, `status=${prodInexistente.status}`);

  const cantidadNegativa = await req("/products/stock", {
    method: "PUT",
    token: AT,
    body: { productId: pid, quantity: -10, type: "salida" },
  });
  const stockTrasNeg = await req(`/products/${pid}`, { token: AT });
  check("salida con cantidad negativa -> 400", cantidadNegativa.status === 400, `status=${cantidadNegativa.status}`);
  if (stockTrasNeg.data?.product?.stock === 50) {
    finding(
      "Ajuste de stock con cantidad negativa",
      `PUT /products/stock type=salida quantity=-10 devolvio ${cantidadNegativa.status} pero IGUAL increased stock 40 -> 50`
    );
  }

  const lowStock = await req("/products?lowStock=true", { token: AT });
  check("filtro stock bajo -> 200", lowStock.status === 200 && Array.isArray(lowStock.data?.products));

  console.log("\n=== 6. CASCADA DE CATEGORIAS ===");
  const delCat = await req(`/categories/${cid}`, { method: "DELETE", token: AT });
  check("eliminar categoria -> 200", delCat.status === 200, JSON.stringify(delCat.data));
  const reAsignado = await req(`/products/${pid}`, { token: AT });
  check(
    "productos de la categoria borrada pasan a General",
    reAsignado.data?.product?.category === "General",
    `categoria=${reAsignado.data?.product?.category}`
  );
  const catNoExiste = await req("/categories/64b7f0000000000000000000", { method: "DELETE", token: AT });
  check("eliminar categoria inexistente -> 404", catNoExiste.status === 404, `status=${catNoExiste.status}`);

  console.log("\n=== 7. USUARIOS ===");
  const emailT = `testuser-${TAG}@orbita.com`;
  const newUser = await req("/users", {
    method: "POST",
    token: AT,
    body: { name: "TEST Empleado", email: emailT, password: "Test123!", role: "vendedor" },
  });
  check("crear usuario -> 201", newUser.status === 201, JSON.stringify(newUser.data));
  const uid = newUser.data?.user?.id ?? newUser.data?.user?._id;
  const userDup = await req("/auth/register", {
    method: "POST",
    token: AT,
    body: { name: "Dup", email: emailT, password: "x123456" },
  });
  check("email duplicado -> 409", userDup.status === 409, `status=${userDup.status}`);
  const userSinPass = await req("/users", { method: "POST", token: AT, body: { name: "X", email: `np${TAG}@x.com` } });
  check("usuario sin password -> 400", userSinPass.status === 400, `status=${userSinPass.status}`);

  const updUser = await req(`/users/${uid}`, { method: "PUT", token: AT, body: { name: "TEST Empleado 2" } });
  check("actualizar usuario -> 200", updUser.status === 200 && updUser.data?.user?.name === "TEST Empleado 2");
  const loginNuevo = await req("/auth/login", { body: { email: emailT, password: "Test123!" } });
  check("usuario creado puede loguearse", loginNuevo.status === 200);
  const noExponePass = await req("/users", { token: AT });
  check("listar usuarios NO expone password", noFields.status !== 0 && (noExponePass.data?.users ?? []).every((u: any) => u.password === undefined));

  const deact = await req(`/users/${uid}`, { method: "DELETE", token: AT });
  check("desactivar usuario -> 200", deact.status === 200);
  const loginDeact = await req("/auth/login", { body: { email: emailT, password: "Test123!" } });
  check("usuario desactivado NO puede loguearse", loginDeact.status === 401 || loginDeact.status === 403, `status=${loginDeact.status}`);
  const tokenViejo = loginNuevo.data?.token;
  if (tokenViejo) {
    const conTokenViejo = await req("/auth/me", { token: tokenViejo });
    check("token de usuario desactivado queda invalidado", conTokenViejo.status === 401 || conTokenViejo.status === 403, `status=${conTokenViejo.status}`);
  }

  console.log("\n=== 8. VENTAS ===");
  const stockPre = (await req(`/products/${pid}`, { token: AT })).data?.product?.stock;
  const venta = await req("/sales", {
    method: "POST",
    token: AT,
    body: { items: [{ productId: pid, quantity: 2 }], paymentMethod: "efectivo" },
  });
  check("crear venta -> 201", venta.status === 201, JSON.stringify(venta.data));
  check("total de venta correcto (2 x 1500)", venta.data?.sale?.total === 3000, `total=${venta.data?.sale?.total}`);
  const stockPost = (await req(`/products/${pid}`, { token: AT })).data?.product?.stock;
  check("venta descuenta stock", stockPost === stockPre - 2, `${stockPre} -> ${stockPost}`);
  check("venta guarda sellerName", venta.data?.sale?.sellerName === "Super Admin");

  const carritoVacio = await req("/sales", { method: "POST", token: AT, body: { items: [], paymentMethod: "efectivo" } });
  check("venta con carrito vacio -> 400", carritoVacio.status === 400, `status=${carritoVacio.status}`);
  const sinStockVenta = await req("/sales", {
    method: "POST",
    token: AT,
    body: { items: [{ productId: pid, quantity: 9999 }], paymentMethod: "efectivo" },
  });
  check("venta sin stock -> 400", sinStockVenta.status === 400, `status=${sinStockVenta.status}`);
  const prodInactivo = await req("/products", {
    method: "POST",
    token: AT,
    body: { name: `TST Inactivo ${TAG}`, price: 100, cost: 10, sku: `INA${TAG}`, stock: 10 },
  });
  await req(`/products/${prodInactivo.data?.product?._id}`, { method: "DELETE", token: AT });
  const ventaInactivo = await req("/sales", {
    method: "POST",
    token: AT,
    body: { items: [{ productId: prodInactivo.data?.product?._id, quantity: 1 }], paymentMethod: "efectivo" },
  });
  check("venta de producto inactivo -> 400", ventaInactivo.status === 400, `status=${ventaInactivo.status}`);

  const ventaVend = await req("/sales", {
    method: "POST",
    token: VT,
    body: { items: [{ productId: pid, quantity: 1 }], paymentMethod: "tarjeta" },
  });
  check("vendedor puede vender -> 201", ventaVend.status === 201, JSON.stringify(ventaVend.data));

  const stockAntesQty0 = (await req(`/products/${pid}`, { token: AT })).data?.product?.stock;
  const ventaQty0 = await req("/sales", {
    method: "POST",
    token: AT,
    body: { items: [{ productId: pid, quantity: 0 }], paymentMethod: "efectivo" },
  });
  check("venta con cantidad 0 -> 400", ventaQty0.status === 400, `status=${ventaQty0.status}`);
  const stockDespuesQty0 = (await req(`/products/${pid}`, { token: AT })).data?.product?.stock;
  check(
    "venta con cantidad 0 NO altera el stock",
    stockAntesQty0 === stockDespuesQty0,
    `${stockAntesQty0} -> ${stockDespuesQty0}`
  );

  const stockAntesNeg = stockDespuesQty0;
  const ventaQtyNeg = await req("/sales", {
    method: "POST",
    token: AT,
    body: { items: [{ productId: pid, quantity: -5 }], paymentMethod: "efectivo" },
  });
  check("venta con cantidad negativa -> 400", ventaQtyNeg.status === 400, `status=${ventaQtyNeg.status}`);
  const stockDespuesNeg = (await req(`/products/${pid}`, { token: AT })).data?.product?.stock;
  check(
    "venta con cantidad negativa NO infla el stock",
    stockAntesNeg === stockDespuesNeg,
    `${stockAntesNeg} -> ${stockDespuesNeg}`
  );

  const stockAntesParcial = stockDespuesNeg;
  const ventaMixta = await req("/sales", {
    method: "POST",
    token: AT,
    body: {
      items: [
        { productId: pid, quantity: 1 },
        { productId: prodInactivo.data?.product?._id, quantity: 1 },
      ],
      paymentMethod: "efectivo",
    },
  });
  check("venta parcialmente invalida -> 400", ventaMixta.status === 400, `status=${ventaMixta.status}`);
  const stockDespuesParcial = (await req(`/products/${pid}`, { token: AT })).data?.product?.stock;
  check(
    "si un item falla, NINGUN item descuenta stock (todo o nada)",
    stockAntesParcial === stockDespuesParcial,
    `${stockAntesParcial} -> ${stockDespuesParcial}`
  );

  const listAll = await req("/sales?limit=5", { token: AT });
  check("listar ventas (admin) -> 200", listAll.status === 200 && listAll.data?.sales?.length >= 1);
  const listVend = await req("/sales", { token: VT });
  const vendId = ventaVend.data?.sale?.seller;
  check(
    "vendedor ve SOLO sus propias ventas",
    listVend.status === 200 && listVend.data?.sales?.every((s: any) => s.seller === vendId),
    "se filtraron ventas ajenas"
  );
  const ventaDetalle = await req(`/sales/${venta.data?.sale?._id}`, { token: AT });
  check("detalle de venta -> 200", ventaDetalle.status === 200 && ventaDetalle.data?.sale?.items?.length === 1);
  const ventaNoExiste = await req("/sales/64b7f0000000000000000000", { token: AT });
  check("detalle de venta inexistente -> 404", ventaNoExiste.status === 404, `status=${ventaNoExiste.status}`);

  console.log("\n=== 9. CAJA ===");
  const crList = await req("/cash-register", { token: AT });
  check("listar cajas -> 200", crList.status === 200 && Array.isArray(crList.data?.registers || crList.data?.cashRegisters));
  const cajas = crList.data?.registers || crList.data?.cashRegisters || [];
  const abierta = cajas.find((r: any) => r.status === "abierta");

  if (abierta) {
    const duplicada = await req("/cash-register", { method: "POST", token: AT, body: { openingAmount: 100 } });
    check("abrir caja con otra abierta -> 400", duplicada.status === 400, `status=${duplicada.status}`);
    console.log(
      `  (info) hay una caja abierta de fondo ${abierta.openingAmount} con ${abierta.totalSales} en ventas.`
    );
    console.log("  (info) test de cierre OMITIDO para no alterar la caja abierta existente.");
  } else {
    const fondoTest = 10000;
    const abierta2 = await req("/cash-register", { method: "POST", token: AT, body: { openingAmount: fondoTest } });
    check("abrir caja -> 201", abierta2.status === 201, JSON.stringify(abierta2.data));
    const cierreOk = await req("/cash-register/close", {
      method: "POST",
      token: AT,
      body: { closingAmount: fondoTest },
    });
    check("cerrar caja abierta -> 200", cierreOk.status === 200, JSON.stringify(cierreOk.data).slice(0, 150));
    const dif = cierreOk.data?.register?.difference ?? cierreOk.data?.cashRegister?.difference;
    check("cierre sin diferencia cuando se cuenta todo", dif === 0, `difference=${dif}`);
    const cierreSinCaja = await req("/cash-register/close", {
      method: "POST",
      token: AT,
      body: { closingAmount: 100 },
    });
    check("cerrar caja sin caja abierta -> 400", cierreSinCaja.status === 400, `status=${cierreSinCaja.status}`);
  }

  console.log("\n=== 10. CONFIGURACION (modelo de producto) ===");
  const modeloOrig = (await req("/config/product-model", { token: AT })).data;
  const fieldsOrig = modeloOrig?.fields ?? modeloOrig?.productModel?.fields ?? modeloOrig?.config?.fields;
  check("leer modelo de producto -> 200", !!fieldsOrig && Array.isArray(fieldsOrig), JSON.stringify(modeloOrig).slice(0, 120));
  check("modelo trae campos por defecto", Array.isArray(fieldsOrig) && fieldsOrig.length >= 3, `campos=${fieldsOrig?.length}`);

  const putValido = await req("/config/product-model", {
    method: "PUT",
    token: AT,
    body: { fields: [...(fieldsOrig ?? []), { key: `tst${TAG}`, label: `TST ${TAG}`, type: "text", active: true }] },
  });
  check("agregar campo al modelo -> 200", putValido.status === 200, JSON.stringify(putValido.data).slice(0, 120));

  const keyMala = await req("/config/product-model", {
    method: "PUT",
    token: AT,
    body: { fields: [{ key: "MAL CLAVE", label: "X", type: "text" }] },
  });
  check("clave con caracteres invalidos -> 400", keyMala.status === 400, `status=${keyMala.status}`);
  const tipoMalo = await req("/config/product-model", {
    method: "PUT",
    token: AT,
    body: { fields: [{ key: "x", label: "X", type: "color" }] },
  });
  check("tipo de campo inexistente -> 400", tipoMalo.status === 400, `status=${tipoMalo.status}`);
  const selectSinOpciones = await req("/config/product-model", {
    method: "PUT",
    token: AT,
    body: { fields: [{ key: "x", label: "X", type: "select" }] },
  });
  check("select sin opciones -> 400", selectSinOpciones.status === 400, `status=${selectSinOpciones.status}`);
  const dup = await req("/config/product-model", {
    method: "PUT",
    token: AT,
    body: { fields: [{ key: "a", label: "A", type: "text" }, { key: "a", label: "B", type: "text" }] },
  });
  check("claves duplicadas -> 400", dup.status === 400, `status=${dup.status}`);
  const sinKey = await req("/config/product-model", {
    method: "PUT",
    token: AT,
    body: { fields: [{ label: "Sin clave", type: "text" }] },
  });
  check("campo sin key -> 400", sinKey.status === 400, `status=${sinKey.status}`);

  if (fieldsOrig) {
    await req("/config/product-model", { method: "PUT", token: AT, body: { fields: fieldsOrig } });
    const restaurado = await req("/config/product-model", { token: AT });
    const rf = restaurado.data?.fields ?? restaurado.data?.productModel?.fields ?? restaurado.data?.config?.fields;
    check("modelo restaurado tras el test", JSON.stringify(rf) === JSON.stringify(fieldsOrig));
  }

  console.log("\n=== 11. IMPORTAR / EXPORTAR ===");
  const tpl = await req("/products/template", { token: AT, raw: true });
  check("descargar plantilla xlsx -> 200", tpl.status === 200 && (tpl.buffer?.length ?? 0) > 500, `bytes=${tpl.buffer?.length}`);
  check("plantilla es un zip/xlsx (PK)", tpl.buffer?.slice(0, 2)?.toString() === "PK");

  let XLSX: any = null;
  try {
    XLSX = (await import("xlsx")).default;
  } catch {
    /* sin modulo */
  }
  if (XLSX) {
    const wb = XLSX.read(tpl.buffer, { type: "buffer" });
    const hoja = wb.Sheets[wb.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" }) as Record<string, unknown>[];
    const cabeceras = filas.length ? Object.keys(filas[0]) : [];
    check("plantilla trae columna Nombre y SKU", cabeceras.some((c) => /nombre/i.test(c)) && cabeceras.some((c) => /sku/i.test(c)), `cabeceras=${cabeceras.join(",")}`);

    const nuevoXlsx = XLSX.utils.book_new();
    const datos = [
      { ...filas[0], Nombre: `TST Import A ${TAG}`, SKU: `IMPA-${TAG}`, Precio: 2500, Costo: 900, Categoría: CAT_T, Stock: 40, "Stock Mínimo": 10 },
      { ...filas[0], Nombre: `TST Import B ${TAG}`, SKU: `IMPA-${TAG}`, Precio: 1000, Costo: 300, Categoría: "General", Stock: 5, "Stock Mínimo": 2 },
      { ...filas[0], Nombre: "", SKU: `IMPC-${TAG}`, Precio: 100, Costo: 10, Categoría: "General", Stock: 1, "Stock Mínimo": 1 },
    ];
    XLSX.utils.book_append_sheet(nuevoXlsx, XLSX.utils.json_to_sheet(datos), "Productos");
    const buf = XLSX.write(nuevoXlsx, { type: "buffer", bookType: "xlsx" });

    const fd = new FormData();
    fd.append("file", new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "test.xlsx");
    const imp = await req("/products/import", { token: AT, formData: fd });
    check("importar xlsx -> 200", imp.status === 200, JSON.stringify(imp.data).slice(0, 200));
    check(
      "import crea 1 producto y omite los duplicados",
      imp.data?.created === 1 && imp.data?.skipped >= 1,
      `created=${imp.data?.created} skipped=${imp.data?.skipped} errors=${JSON.stringify(imp.data?.errors)?.slice(0, 200)}`
    );
    check(
      "el import reporta el error de la fila sin nombre",
      Array.isArray(imp.data?.errors) && imp.data.errors.some((e: any) => /nombre/i.test(e.error)),
      JSON.stringify(imp.data?.errors)?.slice(0, 200)
    );

    const imported = await req(`/products?search=${encodeURIComponent(`TST Import A ${TAG}`)}`, { token: AT });
    check("el producto importado existe en la base", imported.data?.products?.length === 1, `encontrados=${imported.data?.products?.length}`);
    check("el import respeta el stock del archivo", imported.data?.products?.[0]?.stock === 40, `stock=${imported.data?.products?.[0]?.stock}`);
    const impPid = imported.data?.products?.[0]?._id;

    const fdVacio = new FormData();
    fdVacio.append("file", new Blob([buf], { type: "x" }), "");
    const impSinArchivo = await req("/products/import", { token: AT, formData: fdVacio });
    check("import sin archivo -> 400", impSinArchivo.status === 400, `status=${impSinArchivo.status}`);

    const catCreadaImport = (await req("/categories", { token: AT })).data?.categories?.find((c: any) => c.name === CAT_T);
    if (catCreadaImport) await req(`/categories/${catCreadaImport._id}`, { method: "DELETE", token: AT });
    if (impPid) await req(`/products/${impPid}`, { method: "DELETE", token: AT });

    const impVend = await req("/products/import", { token: VT, formData: fd });
    check("vendedor NO puede importar -> 403", impVend.status === 403, `status=${impVend.status}`);
  } else {
    finding("No se pudo cargar xlsx", "Las pruebas de importacion se omitieron");
  }

  console.log("\n=== 12. SUBIDA DE IMAGENES ===");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const fdImg = new FormData();
  fdImg.append("file", new Blob([png], { type: "image/png" }), "test.png");
  const up = await req("/products/upload", { token: AT, formData: fdImg });
  check("subir imagen -> 200 con url", up.status === 200 && /^\/uploads\/.+\.png$/.test(up.data?.url || ""), JSON.stringify(up.data));
  if (up.data?.url) {
    const servido = await fetch(`${BASE.replace("/api", "")}${up.data.url}`);
    check("la imagen subida se sirve en /uploads", servido.status === 200);
    const urlImg = up.data.url;
    const pConImg = await req(`/products/${pid}`, { method: "PUT", token: AT, body: { image: urlImg } });
    check("producto acepta image en update", pConImg.status === 200 && pConImg.data?.product?.image === urlImg);
  }
  const fdGif = new FormData();
  fdGif.append("file", new Blob([png], { type: "application/x-msdownload" }), "mal.exe");
  const upMal = await req("/products/upload", { token: AT, formData: fdGif });
  check("subir tipo no permitido -> 400", upMal.status === 400, `status=${upMal.status}`);
  const upVend = await req("/products/upload", { token: VT, formData: fdImg });
  check("vendedor NO puede subir imagen -> 403", upVend.status === 403, `status=${upVend.status}`);

  console.log("\n=== 13. SOFT DELETE DE PRODUCTOS ===");
  const delProd = await req(`/products/${pid}`, { method: "DELETE", token: AT });
  check("eliminar producto -> 200", delProd.status === 200);
  const delAgain = await req(`/products/${pid}`, { method: "DELETE", token: AT });
  check("eliminar producto ya eliminado -> 404", delAgain.status === 404, `status=${delAgain.status}`);
  const listAfterDel = await req(`/products?search=${encodeURIComponent(`TST Producto ${TAG}`)}`, { token: AT });
  check("producto eliminado desaparece del listado", listAfterDel.data?.products?.length === 0, `quedan=${listAfterDel.data?.products?.length}`);
  const catFinal = (await req("/categories", { token: AT })).data?.categories?.find((c: any) => c.name === CAT_T);
  if (catFinal) await req(`/categories/${catFinal._id}`, { method: "DELETE", token: AT });
  const usrT = (await req("/users", { token: AT })).data?.users?.find((u: any) => u.email === emailT);
  if (usrT) await req(`/users/${usrT.id ?? usrT._id}`, { method: "DELETE", token: AT });

  console.log(`\n${"=".repeat(60)}`);
  console.log(`RESULTADO: ${pass} OK, ${fail} FALLA`);
  console.log("=".repeat(60));
  if (findings.length) {
    console.log("\nHALLAZGOS (bugs reales detectados):");
    for (const f of findings) console.log(`  ! ${f}`);
  }
  if (failures.length) {
    console.log("\nFALLOS:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("\nError del test:", e);
  process.exit(1);
});
