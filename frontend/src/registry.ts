import { lazy } from "react";
import {
  Boxes,
  Home,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";
import { registerModule } from "@gestionate/core/client";
import { api as authApi } from "@gestionate/auth/client";

registerModule({
  id: "dashboard",
  path: "/",
  label: "Panel",
  mobileLabel: "Inicio",
  icon: LayoutDashboard,
  mobileIcon: Home,
  mobile: true,
  Component: lazy(() => import("@gestionate/dashboard/client")),
});

registerModule({
  id: "pos",
  path: "/pos",
  label: "Vender",
  icon: ShoppingCart,
  mobile: true,
  Component: lazy(() => import("@gestionate/pos/client")),
});

registerModule({
  id: "products",
  path: "/productos",
  label: "Productos",
  icon: Package,
  roles: ["super_admin", "encargado"],
  Component: lazy(() =>
    import("@gestionate/products/client").then((m) => ({ default: m.ProductsPage }))
  ),
});

registerModule({
  id: "stock",
  path: "/stock",
  label: "Stock",
  icon: Boxes,
  roles: ["super_admin", "encargado"],
  Component: lazy(() =>
    import("@gestionate/products/client").then((m) => ({ default: m.StockPage }))
  ),
});

registerModule({
  id: "sales",
  path: "/ventas",
  label: "Ventas",
  icon: Receipt,
  roles: ["super_admin", "encargado"],
  mobile: true,
  Component: lazy(() => import("@gestionate/sales/client")),
});

registerModule({
  id: "cash-register",
  path: "/caja",
  label: "Caja",
  icon: Wallet,
  roles: ["super_admin", "encargado"],
  mobile: true,
  Component: lazy(() => import("@gestionate/cash-register/client")),
});

registerModule({
  id: "users",
  path: "/usuarios",
  label: "Usuarios",
  icon: Users,
  roles: ["super_admin"],
  Component: lazy(() => import("@gestionate/users/client")),
});

registerModule({
  id: "settings",
  path: "/configuracion",
  label: "Configuración",
  icon: Settings,
  roles: ["super_admin"],
  Component: lazy(() => import("@gestionate/settings/client")),
});

export { authApi };