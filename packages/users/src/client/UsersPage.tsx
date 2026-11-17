import { useEffect, useState } from "react";
import { api } from "@gestionate/users/client";
import { Role } from "@gestionate/core/shared";
import { formatDateTime } from "@gestionate/core/client";
import { useToast } from "@gestionate/core/client";
import { useConfirm } from "@gestionate/core/client";
import { Badge } from "@gestionate/core/client";
import { Button } from "@gestionate/core/client";
import { Card, CardContent } from "@gestionate/core/client";
import { Input } from "@gestionate/core/client";
import { Label } from "@gestionate/core/client";
import { Skeleton } from "@gestionate/core/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@gestionate/core/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gestionate/core/client";
import {
  Users as UsersIcon,
  Plus,
  Loader2,
  Pencil,
  UserX,
} from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

const roleMeta: Record<Role, { label: string; variant: "default" | "secondary" | "outline" }> = {
  super_admin: { label: "Super Admin", variant: "default" },
  encargado: { label: "Encargado", variant: "secondary" },
  vendedor: { label: "Vendedor", variant: "outline" },
};

export default function UsersPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "vendedor" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.users);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", password: "", role: "vendedor" });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (user: UserRow) => {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        const body: Record<string, unknown> = { name: form.name, role: form.role };
        if (form.password) body.password = form.password;
        await api.updateUser(editing.id, body as never);
        toast("Usuario actualizado");
      } else {
        await api.createUser({ name: form.name, email: form.email, password: form.password, role: form.role as Role });
        toast("Usuario creado");
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setError((err as Error).message);
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (user: UserRow) => {
    const ok = await confirm({
      title: "Desactivar usuario",
      message: `¿Desactivar al usuario "${user.name}"? No podrá iniciar sesión hasta reactivarlo.`,
      confirmLabel: "Desactivar",
    });
    if (!ok) return;
    try {
      await api.deleteUser(user.id);
      toast("Usuario desactivado");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de usuarios y roles del sistema
          </p>
        </div>
        <Button onClick={openCreate} size="lg" className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <UsersIcon className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">Sin usuarios</p>
            <p className="text-sm text-muted-foreground">Creá tu primer usuario</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => {
            const meta = roleMeta[user.role];
            return (
              <Card key={user.id} className={!user.active ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        {!user.active && <Badge variant="destructive">Inactivo</Badge>}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Creado {formatDateTime(user.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(user)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {user.active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-400"
                          onClick={() => handleDeactivate(user)}
                          aria-label="Desactivar"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Actualizá los datos del usuario"
                : "Creá un usuario con su rol de acceso"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre y apellido"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="usuario@empresa.com"
                required
                disabled={!!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {editing ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? "••••••••" : "Mín. 6 caracteres"}
                required={!editing}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="encargado">Encargado</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : editing ? (
                  "Guardar cambios"
                ) : (
                  "Crear usuario"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}