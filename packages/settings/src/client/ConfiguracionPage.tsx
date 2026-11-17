import { useEffect, useRef, useState } from "react";
import { api as settingsApi } from "@gestionate/settings/client";
import { api as categoriesApi } from "@gestionate/categories/client";
import { ProductFieldDef, ProductFieldType, ICategory } from "@gestionate/core/shared";
import { useToast } from "@gestionate/core/client";
import { useConfirm } from "@gestionate/core/client";
import { Badge } from "@gestionate/core/client";
import { Button } from "@gestionate/core/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@gestionate/core/client";
import { Input } from "@gestionate/core/client";
import { Label } from "@gestionate/core/client";
import { Skeleton } from "@gestionate/core/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@gestionate/core/client";
import {
  Settings,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Package,
  Hash,
  Type,
  CheckSquare,
  Calendar,
  List,
  Tags,
} from "lucide-react";
import { slugify } from "@gestionate/core/client";

const TYPE_LABELS: Record<ProductFieldType, { label: string; icon: React.ElementType; color: string }> = {
  text: { label: "Texto", icon: Type, color: "text-sky-500 bg-sky-500/10" },
  number: { label: "Número", icon: Hash, color: "text-violet-500 bg-violet-500/10" },
  select: { label: "Selección", icon: List, color: "text-amber-500 bg-amber-500/10" },
  boolean: { label: "Sí/No", icon: CheckSquare, color: "text-emerald-500 bg-emerald-500/10" },
  date: { label: "Fecha", icon: Calendar, color: "text-pink-500 bg-pink-500/10" },
};

export default function ConfiguracionPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [fields, setFields] = useState<ProductFieldDef[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<{ index: number; field: ProductFieldDef } | null>(null);
  const [isNew, setIsNew] = useState(false);

  const readyRef = useRef(false);
  const saveTimer = useRef<number | null>(null);
  const fieldsRef = useRef<ProductFieldDef[]>([]);
  const mountedRef = useRef(true);
  const isLoadingInitial = useRef(false);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const persist = async (f: ProductFieldDef[]) => {
    setSaveState("saving");
    try {
      await settingsApi.saveProductModel(f);
      if (mountedRef.current) setSaveState("saved");
    } catch (err) {
      if (mountedRef.current) {
        setSaveState("error");
        toast((err as Error).message, "error");
      }
    }
  };

  const [form, setForm] = useState({
    label: "",
    key: "",
    type: "text" as ProductFieldType,
    options: "",
    required: false,
    placeholder: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [res, catRes] = await Promise.all([
        settingsApi.getProductModel(),
        categoriesApi.getCategories().catch(() => ({ categories: [] })),
      ]);
      setFields(res.fields);
      setCategories(catRes.categories);
      readyRef.current = true;
      isLoadingInitial.current = true;
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) {
      toast("Escribí un nombre de categoría", "error");
      return;
    }
    setCreatingCategory(true);
    try {
      await categoriesApi.createCategory({ name });
      toast("Categoría creada");
      setNewCategory("");
      const res = await categoriesApi.getCategories();
      setCategories(res.categories);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: ICategory) => {
    const ok = await confirm({
      title: "Eliminar categoría",
      message: `¿Eliminar la categoría "${cat.name}"? Los productos de esa categoría pasarán a "General".`,
      confirmLabel: "Eliminar",
    });
    if (!ok) return;
    try {
      await categoriesApi.deleteCategory(cat._id);
      toast("Categoría eliminada");
      setCategories((prev) => prev.filter((c) => c._id !== cat._id));
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (isLoadingInitial.current) {
      isLoadingInitial.current = false;
      return;
    }
    if (!readyRef.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveState("saving");

    saveTimer.current = window.setTimeout(() => {
      persist(fieldsRef.current);
    }, 350);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [fields]);

  useEffect(() => {
    return () => {
      const pending = saveTimer.current !== null;
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      if (readyRef.current && pending) persist(fieldsRef.current);
    };
  }, []);

  const openAdd = () => {
    setIsNew(true);
    setEditing(null);
    setForm({ label: "", key: "", type: "text", options: "", required: false, placeholder: "" });
    setDialogOpen(true);
  };

  const openEdit = (index: number) => {
    setIsNew(false);
    const field = fields[index];
    setEditing({ index, field });
    setForm({
      label: field.label,
      key: field.key,
      type: field.type,
      options: field.options?.join(", ") || "",
      required: field.required || false,
      placeholder: field.placeholder || "",
    });
    setDialogOpen(true);
  };

  const handleSaveField = () => {
    const label = form.label.trim();
    const key = form.key.trim() || slugify(label);
    if (!label) {
      toast("El nombre es requerido", "error");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(key)) {
      toast("La clave solo puede tener minúsculas, números y guiones bajos", "error");
      return;
    }

    const newField: ProductFieldDef = {
      key,
      label,
      type: form.type,
      active: true,
      required: form.required,
      placeholder: form.placeholder || undefined,
      ...(form.type === "select" && form.options
        ? { options: form.options.split(",").map((o) => o.trim()).filter(Boolean) }
        : {}),
    };

    if (isNew) {
      if (fields.some((f) => f.key === key)) {
        toast("Ya existe un campo con esa clave", "error");
        return;
      }
      setFields((prev) => [...prev, newField]);
      toast("Campo agregado", "success");
    } else if (editing) {
      setFields((prev) =>
        prev.map((f, i) => (i === editing.index ? newField : f))
      );
      toast("Campo actualizado", "success");
    }
    setDialogOpen(false);
  };

  const handleDelete = async (index: number) => {
    const ok = await confirm({
      title: "Eliminar campo",
      message: `¿Eliminar el campo "${fields[index].label}" del modelo de producto?`,
      confirmLabel: "Eliminar",
    });
    if (!ok) return;
    setFields((prev) => prev.filter((_, i) => i !== index));
    toast("Campo eliminado");
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    setFields((prev) => {
      const arr = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  const handleToggleActive = (index: number) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, active: !f.active } : f))
    );
  };

  const handleLabelChange = (value: string) => {
    setForm((f) => ({ ...f, label: value, key: isNew ? slugify(value) : f.key }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
          <p className="text-sm text-muted-foreground">
            Definí qué campos piden al cargar los productos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveState === "saving" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Guardando…
            </span>
          )}
          {saveState === "saved" && <span className="text-xs text-emerald-500">Guardado</span>}
          {saveState === "error" && <span className="text-xs text-red-400">Error al guardar</span>}
          <Button variant="outline" onClick={openAdd} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Agregar campo
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-primary" />
            Modelo de producto
          </CardTitle>
          <CardDescription>
            Estos campos aparecen al crear o editar un producto.
            Solo los campos activos se muestran en el formulario.
            Los cambios se guardan automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="py-12 text-center">
              <Settings className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">Sin campos configurados</p>
              <p className="text-sm text-muted-foreground">
                Agregá campos personalizados para adaptar el sistema a tu negocio
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field, index) => {
                const meta = TYPE_LABELS[field.type];
                const Icon = meta.icon;
                return (
                  <div
                    key={field.key + index}
                    className={`flex items-center gap-3 rounded-lg border bg-background/50 p-3 transition-colors ${
                      !field.active ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <button
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                        aria-label="Mover arriba"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleMove(index, "down")}
                        disabled={index === fields.length - 1}
                        className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                        aria-label="Mover abajo"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>

                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{field.label}</p>
                        {field.required && <Badge variant="destructive" className="text-[10px] px-1.5">req</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        clave: <code className="font-mono">{field.key}</code>
                        {field.type === "select" && field.options && (
                          <span> · opciones: {field.options.join(", ")}</span>
                        )}
                      </p>
                    </div>

                    <Badge variant={meta.color.includes("sky") ? "secondary" : "outline"} className="shrink-0">
                      {meta.label}
                    </Badge>

                    <button
                      onClick={() => handleToggleActive(index)}
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        field.active
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                          : "border-input text-muted-foreground"
                      }`}
                    >
                      {field.active ? "Activo" : "Inactivo"}
                    </button>

                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(index)} aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-400"
                        onClick={() => handleDelete(index)}
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tags className="h-5 w-5 text-primary" />
            Categorías
          </CardTitle>
          <CardDescription>
            Las categorías que podrás elegir al crear o editar un producto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              placeholder="Nueva categoría, ej: Limpieza"
            />
            <Button onClick={handleAddCategory} disabled={creatingCategory} className="shrink-0">
              {creatingCategory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Agregar
            </Button>
          </div>

          {categories.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Aún no hay categorías. Agregá la primera.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat._id}
                  className="group flex items-center gap-2 rounded-full border bg-background/50 py-1 pl-3 pr-1.5 text-sm"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: cat.color || "#94a3b8" }}
                  />
                  {cat.name}
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="rounded-full p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                    aria-label={`Eliminar ${cat.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "Nuevo campo" : "Editar campo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="field-label">Nombre del campo *</Label>
              <Input
                id="field-label"
                value={form.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="Ej: Talla, Marca, Color..."
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                La clave se genera automáticamente. Podés editarla después.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-key">Clave interna (key)</Label>
              <Input
                id="field-key"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="talla, marca..."
                disabled={!isNew}
                className="font-mono text-sm"
              />
              {!isNew && (
                <p className="text-xs text-muted-foreground">
                  No se puede cambiar la clave de un campo existente.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tipo de campo</Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {(Object.entries(TYPE_LABELS) as [ProductFieldType, typeof TYPE_LABELS.text][]).map(
                  ([type, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm({ ...form, type })}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors ${
                          form.type === type
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-input hover:bg-accent"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {meta.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
            {form.type === "select" && (
              <div className="space-y-2">
                <Label htmlFor="field-options">Opciones (separadas por coma)</Label>
                <Input
                  id="field-options"
                  value={form.options}
                  onChange={(e) => setForm({ ...form, options: e.target.value })}
                  placeholder="kg, litro, docena, caja, unidad..."
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="field-placeholder">Placeholder (texto de ejemplo)</Label>
              <Input
                id="field-placeholder"
                value={form.placeholder}
                onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
                placeholder="Ej: Ingresá un valor..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="field-required"
                checked={form.required}
                onChange={(e) => setForm({ ...form, required: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="field-required" className="cursor-pointer">
                Campo obligatorio
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveField}>
              {isNew ? "Agregar campo" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}