================================================================================
GESTIONATE - GUIA DEL PROYECTO (MONOREPO / FASE 2)
================================================================================

ESTE ARCHIVO CONTIENE:
  1. Que es el proyecto y como quedo despues de los cambios (Fase 2)
  2. Estructura del repositorio
  3. Como ejecutarlo localmente
  4. Reglas/convenciones importantes del codigo
  5. Como subir cambios al repositorio (workflow git)
  6. Como implementar un MODULO NUEVO paso a paso


-------------------------------------------------------------------------------
1. QUE ES Y COMO QUEDO EL PROYECTO
-------------------------------------------------------------------------------

Gestionate es una aplicacion de gestion de comercio: POS, productos, stock,
ventas, caja, categorias, usuarios y configuracion. Stack: React 19 + Vite
(frontend), Next.js 15 + API Routes (backend), MongoDB + Mongoose, TypeScript
estricto, Tailwind CSS + shadcn/ui (radix + lucide).

ANTES (Fase 1): todo el codigo estaba en dos carpetas grandes sin separar:
  frontend/src/core (UI, auth, layout) y frontend/src/modules/* (paginas).
  backend/src/core y backend/src/modules/* (controllers/servicios).

AHORA (Fase 2 - MODULARIZACION POR DOMINIO): el codigo se extrajo a 10
paquetes internos y las apps solo son "adaptadores finos" (rutas HTTP en el
backend, composicion en el frontend).

  - Todo el codigo de dominio (modelos, servicios, controllers, UI, API
    clients) vive en packages/@gestionate/*.
  - Cada app importa esos paquetes por nombre: @gestionate/core,
    @gestionate/products, etc. (ya no existen alias "@/" ni importaciones
    relativas hacia otras apps).
  - Las dos apps compilan consumiendo el TYPESCRIPT FUENTE de los paquetes
    (no se publican, no se buildan por separado):

      * Backend (Next):  transpilePackages: ["@gestionate/*"] en next.config.ts
      * Frontend (Vite): Vite ya resuelve los paquetes linkeados via
                         workspaces, y transpila el TS por si solo.

  - Los paquetes se vinculan como workspaces: npm los enlaza automaticamente
    a node_modules/@gestionate/* (junctions/symlinks locales).

Esto quedo VERIFICADO:
  - Backend : npx tsc --noEmit OK  y  next build OK (19 rutas API).
  - Frontend: npx tsc OK  y  vite build OK (3721 modulos).

LOS 10 PAQUETES (packages/):
  core           -> TODO lo compartido:
                      ./shared : tipos compartidos (Role, IUser, IProduct,
                                 ISale, ICashRegister, ICategory,
                                 ProductFieldDef, ProductImportError/Result).
                      ./server : connectDB, signToken/verifyToken, AuthUser.
                      ./client : registry de modulos, AuthContext, layout
                                 (AppLayout/Sidebar/MobileNav), toda la UI
                                 base (button, dialog, toast, confirm, ...),
                                 theme y lib (http, storage, utils, format).
  auth           -> login/registro/me. server: getAuthUser/requireAuth/
                    requireRole. client: LoginPage + api.
  users          -> CRUD de usuarios (server + client).
  categories     -> categorias de productos (server + client).
  products       -> productos, stock, export/import (server + client).
  sales          -> ventas (server + client).
  cash-register  -> caja (server + client).
  settings       -> configuracion (clave/valor + campos del modelo de producto)
                    (server + client).
  dashboard      -> solo client (panel con graficos).
  pos            -> solo client (pantalla de venta).

DEPENDENCIAS ENTRE PAQUETES (con "*" para version interna):
  products -> core, categories, settings
  sales    -> core, products          (sin dependencia de caja)
  cash-register -> core, sales        (usa getCapturedSale de sales)
  settings -> core
  users/categories/auth/dashboard/pos -> core
  (auth usa users/server y core/server)

LOS 8 MODULOS REGISTRADOS EN EL FRONTEND (con rutas):
  dashboard      -> /            (Panel/Inicio, todos)
  pos            -> /pos         (Vender, todos, mobile)
  products       -> /productos   (roles: super_admin, encargado)
  stock          -> /stock       (roles: super_admin, encargado)
  sales          -> /ventas      (roles: super_admin, encargado, mobile)
  cash-register  -> /caja        (roles: super_admin, encargado, mobile)
  users          -> /usuarios    (roles: super_admin)
  settings       -> /configuracion (roles: super_admin)
  (roles se definen en packages/core/src/shared, tipo Role)

LAS 19 RUTAS API (backend/src/app/api):
  auth/login, auth/register, auth/me
  users, users/[id]
  categories, categories/[id]
  products, products/[id], products/stock, products/import,
  products/template, products/upload
  sales, sales/[id]
  cash-register, cash-register/close
  config/product-model


-------------------------------------------------------------------------------
2. ESTRUCTURA DEL REPOSITORIO
-------------------------------------------------------------------------------

  gestionate/
  ├── package.json               <- workspaces root (backend, frontend, packages/*)
  ├── .gitignore                 <- node_modules, dist, .next, .env*, *.tsbuildinfo
  ├── backend/                   <- app Next.js (SOLO rutas HTTP + config)
  │   ├── next.config.ts         <- transpilePackages @gestionate/* + outputFileTracingRoot
  │   ├── tsconfig.json          <- sin alias @/, sin paths (resolucion por exports)
  │   ├── src/app/api/**/route.ts<- "adapters": reciben req, llaman servicios del paquete
  │   ├── src/seed.ts            <- crea super admin inicial desde backend/.env
  │   └── src/reset-users.ts
  ├── frontend/                  <- app Vite (SOLO composicion de modulos)
  │   ├── vite.config.ts         <- alias @/ ELIMINADO; proxy /api y /uploads -> :3001
  │   ├── tailwind.config.js     <- content incluye ../packages/**/*.{ts,tsx}
  │   └── src/
  │       ├── main.tsx           <- punto de entrada (sin cambios)
  │       ├── App.tsx            <- ThemeProvider + BrowserRouter + AuthProvider(api) + Routes
  │       ├── registry.ts        <- COMPOSITION ROOT: aqui se registran los modulos
  │       └── routes/index.tsx   <- rutas; usa getModules() de @gestionate/core/client
  └── packages/                  <- 10 paquetes internos @gestionate/* (CODIGO REAL)
      ├── core/
      │   ├── package.json       <- exports: ./shared ./server ./client
      │   └── src/
      │       ├── shared/        <- tipos puros (sin deps)
      │       ├── server/        <- mongoose, connectDB, jwt
      │       └── client/        <- ui/, lib/, layouts/, contexts/, registry.ts
      └── <modulo>/              <- modelo de paquete tipico:
          ├── package.json       <- exports: ./server ./client
          └── src/
              ├── server/        <- model.ts, controller.ts, index.ts
              └── client/        <- <Pagina>.tsx, api.ts, components/, index.ts

  Puntos clave del package.json de un paquete:
    "private": true,
    "exports": {
      "./server": { "types": "./src/server/index.ts", "default": "./src/server/index.ts" },
      "./client": { "types": "./src/client/index.ts", "default": "./src/client/index.ts" }
    }
  (core tiene ademas "./shared". Los paquetes dashboard y pos solo client:
   exports con "./client".)

  IMPORTANTE: no hay versiones publicadas; las apps consumen el .ts fuente.
  Por eso "types" y "default" apuntan a los .ts y los package.json deben
  guardarse SIN BOM UTF-8 (un BOM rompe next build).


-------------------------------------------------------------------------------
3. COMO EJECUTARLO LOCALMENTE
-------------------------------------------------------------------------------

REQUISITOS: Node.js (>=20), npm, MongoDB corriendo en localhost:27017.

1) INSTALAR (una vez, desde la raiz del repo):

     cd gestionate
     npm install        (en PowerShell USA npm.cmd, no npm.ps1)

   Esto enlaza los workspaces: crear node_modules/@gestionate/* apuntando a
   packages/*, y hoistea las dependencias externas (react, next, mongoose...)
   en la raiz. Cuando agregues dependencias nuevas, vuelve a correrlo.

2) CONFIGURAR BACKEND (backend/.env): copia backend/.env.example a backend/.env
   y ajusta los valores. Variables disponibles:

     MONGODB_URI=mongodb://localhost:27017/gestate
     JWT_SECRET=cambia-este-secreto-en-produccion
     NEXT_PUBLIC_API_URL=http://localhost:3001/api
     SUPER_ADMIN_EMAIL=admin@orbita.com
     SUPER_ADMIN_NAME=Super Admin
     SUPER_ADMIN_PASSWORD=cambia-esta-clave

   backend/.env NO se sube a git (esta ignorado).

3) SEMBRAR USUARIO ADMIN (primera vez):

     cd backend
     npm run seed          (crea el super admin definido en .env)

   Si necesitas resetear claves: npm run reset-users.

4) LEVANTAR LAS DOS APPS:

     Terminal 1:  cd backend   npm run dev      -> API en http://localhost:3001
     Terminal 2:  cd frontend  npm run dev      -> APP en http://localhost:3000

   El frontend (Vite) proxye /api y /uploads hacia localhost:3001, asi que el
   codigo de los paquetes usa rutas relativas ("/api/...") sin configurar URLs.

5) BUILD / VERIFICACION DE PRODUCCION:

     Backend :  cd backend   npm run build     (next build; ya verificado)
     Frontend:  cd frontend  npm run build     (tsc -b && vite build)

   Tambien puedes chequear tipos solo:
     Backend :  cd backend   npx.cmd tsc --noEmit
     Frontend:  cd frontend  npx.cmd tsc

   NOTA PowerShell: el .ps1 de npm esta bloqueado por la Execution Policy;
   usa siempre npm.cmd / npx.cmd (o .ps1 con la policy ajustada).


-------------------------------------------------------------------------------
4. REGLAS Y CONVENCIONES DEL CODIGO
-------------------------------------------------------------------------------

  - Un paquete NO importa "hacia afuera" salvo a otros @gestionate/* o a
    dependencias que tenga declaradas en SU package.json ("*" para paquetes
    internos). Si un paquete usa lucide-react, react-router-dom, mongoose,
    jspdf, etc., esa lib DEBE estar en su package.json.
  - Nada de imports "@/" ni rutas relativas hacia otras apps/paquetes.
    Dentro de un paquete se usa ruta relativa.
  - Resolucion de imports en los client: del modulo a la API client siempre
    "@gestionate/<modulo>/client"; tipos de "@gestionate/core/shared".
  - LOS MODELOS se re-exportan de sus index.ts como named Y default:
      export { default as User, default } from "./model";
  - Cada index.ts de cliente expone la pagina como default export y opciones
    named (ej: products/client expone ProductsPage y StockPage). Si no hay
    default, el registro usa .then(m => ({ default: m.XPage })).
  - Los roles y permisos se centralizan en core/shared (tipo Role) y en las
    helpers de frontend/src/routes (RequireAuth, RequireRole,
    canManageProducts, canManageUsers, canManageCashRegister, canManageConfig).
  - Auth: el login se inyecta como dependencia. AuthProvider recibe
    api={authApi} (objeto { login, me } de @gestionate/auth/client). Ver
    frontend/src/App.tsx y packages/core/src/client/contexts/AuthContext.tsx.
  - El AuthContext (server-side? no: client) consulta /api/auth/me para
    restaurar sesion y guarda el token via lib/http.
  - CICLOS DE IMPORTACION RESUELTOS (no volver a crearlas):
      * El registro de campos del modelo de producto ("fields") vive en
        settings/server (settings/fields.ts); products lo importa a traves
        de @gestionate/settings/server. NUNCA importes settings desde products
        de vuelta (settings no puede depender de products).
      * sales/createSale NO crea registro de caja. Captura datos en el objeto
        req como string key:
            sales/server      -> captureSale(req, {...}) / getCapturedSale(req)
            categories/server -> captureDeletedCategoryName(req, nombre) /
                                 getDeletedCategoryName(req)
        y los "composers" (wrapping de handlers) hacen el trabajo extra:
            - withRegisterTracking(handler) en cash-register/server
              (lee getCapturedSale y actualiza la caja) -> compone
              backend/src/app/api/sales/route.ts
            - resetProductsOnCategoryDelete(handler) en products/server
              (borra productos de la categoria eliminada) -> compone
              backend/src/app/api/categories/[id]/route.ts
        Patron: un modulo que necesita datos de otro los obtiene via helpers
        sobre el request, no importando el modulo AHI. Evita ciclos.
  - Los archivos de los paquetes y de los apps: SIEMPRE UTF-8 SIN BOM.
  - Tailwind: el CSS base/theme vive en frontend (index.css) y las clases de
    los paquetes se detectan porque tailwind.config.js escanea
    ../packages/**/*.{ts,tsx}. Si agregas una clase en un paquete nuevo, no
    toques configs: ya esta cubierto.
  - Icons: lucide-react (los icons de menu se definen en frontend/src/registry.ts).
  - Config del backend en next.config.ts: NO quitar transpilePackages
    ["@gestionate/*"] ni outputFileTracingRoot (sin ellos Next no compila los
    paquetes ni incluye sus assets en el build).


-------------------------------------------------------------------------------
5. COMO SUBIR CAMBIOS AL REPOSITORIO (WORKFLOW GIT)
-------------------------------------------------------------------------------

El repo es GIT (raiz de gestionate, rama main, remoto origin).

  a) Ver que hay pendiente:
       git status                 (todo se ejecuta desde la raiz del repo)

  b) Ver que cambiaste exactamente antes de commitear:
       git diff
       git diff --stat

  c) Agregar SOLO lo intencional (nunca subir .env ni secretos; estan
     ignorados por .gitignore):
       git add backend frontend packages
     o archivo por archivo:
       git add packages/products/src/server/controller.ts

  d) Commit con mensaje corto y descriptivo, en estilo imperativo:
       git commit -m "feat: extraer modulos a packages"

  e) Subir:
       git push origin main

  Reglas de oro:
    - Trabaja en una rama si el cambio es grande: git checkout -b feature/xxx
      y luego PR a main.
    - Cambios CON O SIN efecto visible: si tocas packages, los tres niveles
      (backend, frontend, packages) pueden verse afectados. Repite la
      verificacion (seccion 3, punto 5) antes de commitear.
    - Al agregar dependencias nuevas a un package.json: corre npm install en
      la raiz (sincroniza node_modules y el package-lock).
    - No fuerce el commit de node_modules/dist/.next (ignorados).
    - Si otro colaborador cambio cosas primero: git pull --rebase antes de
      pushear.


-------------------------------------------------------------------------------
6. COMO IMPLEMENTAR UN MODULO NUEVO (PASO A PASO)
-------------------------------------------------------------------------------

Ejemplo: crear el modulo "proveedores". La estrategia es: crear el paquete,
poner logica real en packages/, y dejar en backend/frontend solo adaptadores y
registro.

  PASO 1 - Crear el paquete
    Crear la carpeta packages/proveedores/ y su package.json:

      {
        "name": "@gestionate/proveedores",
        "version": "0.1.0",
        "private": true,
        "exports": {
          "./server": { "types": "./src/server/index.ts", "default": "./src/server/index.ts" },
          "./client": { "types": "./src/client/index.ts", "default": "./src/client/index.ts" }
        },
        "dependencies": {
          "@gestionate/core": "*",
          "mongoose": "^8.16.1",
          "react": "^19.1.0",
          "lucide-react": "^1.46.0"
        },
        "devDependencies": {
          "@types/node": "^22.15.23",
          "@types/react": "^19.1.6",
          "typescript": "^5.8.3"
        }
      }

    (Versiones: copialas de un paquete existente; internas siempre "*").

  PASO 2 - Logica backend del paquete
    packages/proveedores/src/server/:
      model.ts      definicion del modelo Mongoose (usa types de core/shared si aplica).
      controller.ts funciones puras de negocio (listar/crear/editar/eliminar).
                    Si necesitas datos de otro modulo al borrar/crear, usa el
                    patron de "capture helpers" del request + composer (ver
                    seccion 4) para NO crear ciclos.

      index.ts      re-exporta todo, con modelos como named Y default:
                      export * from "./model";
                      export * from "./controller";
                      export { default as Proveedor, default } from "./model";

  PASO 3 - Colgar las rutas HTTP (adaptador en backend)
    Crear backend/src/app/api/proveedores/route.ts (y /[id]/route.ts si aplica):

      import connectDB from "@gestionate/core/server";
      import { requireAuth, requireRole } from "@gestionate/auth/server";
      import { listarProveedores, crearProveedor } from "@gestionate/proveedores/server";

      export async function GET(req) {
        const user = await requireAuth(req);
        await connectDB();
        const data = await listarProveedores();
        return Response.json(data);
      }
      export async function POST(req) {
        const user = await requireRole(req, ["super_admin"]);
        await connectDB();
        const body = await req.json();
        return Response.json(await crearProveedor(body));
      }

    (Si el nuevo modulo NO tiene parte de CLI/backend, omitir este paso.)

  PASO 4 - Frontend del paquete
    packages/proveedores/src/client/:
      ProveedoresPage.tsx   la pagina (usa UI de @gestionate/core/client:
                            Button, Card, Table, useToast, useConfirm, etc.).
      api.ts               funciones fetch tipo:  api.get<...>("/api/proveedores")
      components/          (opcional) subcomponentes.
      index.ts             exporta la pagina con default:
                            export * from "./api";
                            export { default as ProveedoresPage, default } from "./ProveedoresPage";

  PASO 5 - Registrar el modulo en el frontend
    Editar frontend/src/registry.ts: importar el icono de lucide (si es nuevo) y
    agregar un registerModule({ ... }):

      registerModule({
        id: "proveedores",
        path: "/proveedores",
        label: "Proveedores",
        icon: Truck,
        roles: ["super_admin", "encargado"],   // opcional; ver Role en core/shared
        mobile: true,                          // opcional: aparece en nav movil
        Component: lazy(() => import("@gestionate/proveedores/client")),
      });

    La ruta (/login, rutas de modulos, fallback a "/") ya las maneja
    frontend/src/routes/index.tsx usando getModules(): NO hace falta tocar
    routes salvo que quieras una ruta especial.

  PASO 6 - Instalar/verificar
      npm.cmd install            (raiz; crea el link @gestionate/proveedores)
      cd backend  && npx.cmd tsc --noEmit
      cd frontend && npx.cmd tsc
      cd frontend && npx.cmd vite build
      cd backend  && npx.cmd next build

    Si el paquete usa una dependencia nueva (ej. pdfmake, date-fns), agrega esa
    dependencia a su package.json ANTES de instalar. tailwind ya detecta
    packages/**, no hace falta tocar configs. Con esto ya puedes:
      git add packages backend frontend
      git commit -m "feat: modulo proveedores"
      git push origin main

  RESUMEN DEL CAMBIO NECESARIO para un modulo:
    1 packge nuevo en packages/            (logica real)
    2 rutas "adaptador" en backend/src/app/api/
    3 registro en frontend/src/registry.ts (icono + lazy import + roles)
    4 npm install en raiz si hay deps nuevas

  Eso es todo: el router, el layout, el auth y los estilos se resuelven solos.