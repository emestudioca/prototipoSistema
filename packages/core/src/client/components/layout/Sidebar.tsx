import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { BrandWordmark } from "../brand/BrandWordmark";
import type { Role } from "../../../shared";
import { getModules, type ModuleDefinition } from "../../registry";

export type NavItem = {
  to: string;
  icon: ModuleDefinition["icon"];
  label: string;
  roles: Role[] | null;
};

export function getNavItems(): NavItem[] {
  return getModules().map((module) => ({
    to: module.path,
    icon: module.icon,
    label: module.label,
    roles: module.roles ?? null,
  }));
}

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const nav = getNavItems();

  return (
    <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center border-b px-5">
        <BrandWordmark subtitle="Sistema de gestión" />
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Menú
        </p>
        {nav.map((item) => {
          const visible = item.roles ? (user ? item.roles.includes(user.role) : false) : true;
          if (!visible) return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-primary" />
                  )}
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      <div className="border-t px-5 py-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Sesión
        </p>
        <p className="mt-0.5 truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </aside>
  );
}