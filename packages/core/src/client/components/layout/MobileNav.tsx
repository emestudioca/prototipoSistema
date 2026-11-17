import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, X, Moon, Sun, MoreHorizontal } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../lib/theme";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { BrandWordmark } from "../brand/BrandWordmark";
import { getNavItems, type NavItem } from "./Sidebar";
import type { Role } from "../../../shared";
import { getModules } from "../../registry";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  encargado: "Encargado",
  vendedor: "Vendedor",
};

type Tab = { to: string; label: string; icon: NavItem["icon"]; roles: Role[] | null };

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  if (!user) return null;

  const navItems = getNavItems();
  const tabs: Tab[] = getModules()
    .filter((module) => module.mobile)
    .map((module) => ({
      to: module.path,
      label: module.mobileLabel ?? module.label,
      icon: module.mobileIcon ?? module.icon,
      roles: module.roles ?? null,
    }));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const visibleTabs = tabs.filter((t) => (t.roles ? t.roles.includes(user.role) : true));

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/85 px-4 backdrop-blur lg:hidden">
        <BrandWordmark />
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Cambiar tema"
          >
            {theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
          </button>
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-card shadow-dialog animate-in slide-in-from-left">
            <div className="flex items-center justify-between border-b p-4">
              <BrandWordmark subtitle={user.email} />
              <button onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-accent" aria-label="Cerrar menú">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {navItems.map((item) => {
                const visible = item.roles ? item.roles.includes(user.role) : true;
                if (!visible) return null;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative",
                        isActive
                          ? "bg-primary/12 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute -left-3 h-5 w-[3px] rounded-r bg-primary" />}
                        <item.icon className="h-[18px] w-[18px]" />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="border-t p-4">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="mb-3 text-xs capitalize text-muted-foreground">{roleLabels[user.role]}</p>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-card/90 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 pb-[max(0px,env(safe-area-inset-bottom))]">
          {visibleTabs.map((tab) => {
            const isPos = tab.to === "/pos";
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative flex flex-col items-center gap-0.5 py-2.5 transition-colors",
                    isPos ? "w-14 shrink-0" : "w-full",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isPos ? (
                      <span
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-full shadow-card transition-transform",
                          isActive ? "brand-mark text-white -translate-y-1 dark:text-background" : "bg-primary text-white dark:text-background"
                        )}
                      >
                        <tab.icon className="h-5 w-5" />
                      </span>
                    ) : (
                      <tab.icon className="h-[22px] w-[22px]" />
                    )}
                    <span className="text-[10px] font-medium tracking-tight">{tab.label}</span>
                    {isActive && !isPos && (
                      <span className="absolute -top-px h-0.5 w-8 rounded-b bg-primary" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            className="flex w-full flex-col items-center gap-0.5 py-2.5 text-muted-foreground"
          >
            <MoreHorizontal className="h-[22px] w-[22px]" />
            <span className="text-[10px] font-medium tracking-tight">Más</span>
          </button>
        </div>
      </nav>
    </>
  );
}