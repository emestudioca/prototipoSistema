import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  useAuth,
  ToastProvider,
  ConfirmProvider,
  AppLayout,
  getModules,
} from "@gestionate/core/client";
import { LoginPage } from "@gestionate/auth/client";
import { Loader2 } from "lucide-react";
import type { IUser, Role } from "@gestionate/core/shared";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export const canManageProducts = (user: IUser | null) =>
  user && (user.role === "super_admin" || user.role === "encargado");

export const canManageUsers = (user: IUser | null) => user?.role === "super_admin";

export const canManageCashRegister = (user: IUser | null) =>
  user && (user.role === "super_admin" || user.role === "encargado");

export const canManageConfig = (user: IUser | null) => user?.role === "super_admin";

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <ToastProvider>
      <ConfirmProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            {getModules().map((module) => (
              <Route
                key={module.id}
                path={module.path}
                element={
                  module.roles ? (
                    <RequireRole roles={module.roles}>
                      <Suspense fallback={<PageLoader />}>
                        <module.Component />
                      </Suspense>
                    </RequireRole>
                  ) : (
                    <Suspense fallback={<PageLoader />}>
                      <module.Component />
                    </Suspense>
                  )
                }
              />
            ))}
          </Route>

          <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
        </Routes>
      </ConfirmProvider>
    </ToastProvider>
  );
}