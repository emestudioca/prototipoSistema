import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun } from "lucide-react";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../lib/theme";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  encargado: "Encargado",
  vendedor: "Vendedor",
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:flex">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <MobileNav />
          <header className="sticky top-0 z-30 hidden h-16 items-center justify-end gap-4 border-b bg-card/80 px-6 backdrop-blur lg:flex">
            <Badge variant="secondary" className="capitalize">
              {user && roleLabels[user.role]}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Cambiar tema"
              className="text-muted-foreground"
            >
              {theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Cerrar sesión">
              <LogOut className="h-[18px] w-[18px]" />
            </Button>
          </header>
          <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}