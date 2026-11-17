import { useEffect, useRef, useState } from "react";
import { api as productsApi } from "@gestionate/products/client";
import { api as settingsApi } from "@gestionate/settings/client";
import { api as categoriesApi } from "@gestionate/categories/client";
import { IProduct, ProductFieldDef } from "@gestionate/core/shared";
import { resolveImageUrl } from "@gestionate/core/client";
import { Button } from "@gestionate/core/client";
import { Input } from "@gestionate/core/client";
import { Label } from "@gestionate/core/client";
import { Textarea } from "@gestionate/core/client";
import { useToast } from "@gestionate/core/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gestionate/core/client";
import { Loader2, ImagePlus, X } from "lucide-react";

interface Props {
  product: IProduct | null;
  categories: string[];
  onSuccess: () => void;
  onCancel?: () => void;
}

export function ProductForm({ product, categories, onSuccess, onCancel }: Props) {
  const { toast } = useToast();
  const [modelFields, setModelFields] = useState<ProductFieldDef[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price?.toString() || "",
    cost: product?.cost?.toString() || "",
    sku: product?.sku || "",
    category: product?.category || "General",
    stock: product?.stock?.toString() || "0",
    minStock: product?.minStock?.toString() || "5",
  });

  const [attributes, setAttributes] = useState<Record<string, string>>(() => {
    const attrs: Record<string, string> = {};
    if (product?.attributes) {
      for (const [k, v] of Object.entries(product.attributes)) {
        attrs[k] = v != null ? String(v) : "";
      }
    }
    return attrs;
  });

  const [image, setImage] = useState(product?.image || "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      settingsApi.getProductModel().catch(() => ({ fields: [] })),
      categoriesApi.getCategories().catch(() => ({ categories: [] })),
    ]).then(([modelRes, catRes]) => {
      setModelFields(modelRes.fields.filter((f) => f.active));
      const fromApi = catRes.categories.map((c) => c.name);
      const merged = Array.from(new Set([...fromApi, ...categories, "General"]));
      setCategoryOptions(merged.sort((a, b) => a.localeCompare(b, "es")));
    });
  }, [categories]);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const updateAttr = (key: string, value: string) =>
    setAttributes((prev) => ({ ...prev, [key]: value }));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("El archivo debe ser una imagen", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("La imagen no puede superar 2MB", "error");
      return;
    }
    setUploading(true);
    try {
      const res = await productsApi.uploadImage(file);
      setImage(res.url);
      toast("Imagen subida");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const attrs: Record<string, unknown> = {};
    for (const field of modelFields.filter((f) => f.active)) {
      const val = attributes[field.key] || "";
      if (val === "") continue;
      if (field.type === "number") {
        attrs[field.key] = parseFloat(val) || 0;
      } else if (field.type === "boolean") {
        attrs[field.key] = val === "true" || val === "1";
      } else {
        attrs[field.key] = val;
      }
    }

    const body = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
      sku: form.sku.toUpperCase(),
      category: form.category,
      stock: parseInt(form.stock) || 0,
      minStock: parseInt(form.minStock) || 5,
      image: image || undefined,
      attributes: attrs,
    };

    try {
      if (product) {
        await productsApi.updateProduct(product._id, body);
      } else {
        await productsApi.createProduct(body);
      }
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border bg-muted">
          {uploading ? (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : image ? (
            <img src={resolveImageUrl(image)} alt="Producto" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImagePlus className="h-6 w-6 text-muted-foreground/60" />
            </div>
          )}
          {image && (
            <button
              type="button"
              onClick={() => setImage("")}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              aria-label="Quitar imagen"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Imagen del producto</p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG o WebP · máx. 2MB
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4" />
                {image ? "Cambiar imagen" : "Subir imagen"}
              </>
            )}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Ej: Café Latte"
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Descripción breve del producto"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU *</Label>
          <Input
            id="sku"
            value={form.sku}
            onChange={(e) => update("sku", e.target.value)}
            placeholder="CAF-001"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Categoría</Label>
          <Select
            value={form.category}
            onValueChange={(v) => update("category", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.length === 0 && (
                <SelectItem value="General">General</SelectItem>
              )}
              {categoryOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Precio de venta *</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            placeholder="0"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost">Costo</Label>
          <Input
            id="cost"
            type="number"
            min="0"
            step="0.01"
            value={form.cost}
            onChange={(e) => update("cost", e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => update("stock", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minStock">Stock mínimo</Label>
          <Input
            id="minStock"
            type="number"
            min="0"
            value={form.minStock}
            onChange={(e) => update("minStock", e.target.value)}
          />
        </div>
      </div>

      {modelFields.length > 0 && (
        <div className="border-t pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Campos personalizados
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {modelFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`attr-${field.key}`}>
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </Label>
                {field.type === "text" && (
                  <Input
                    id={`attr-${field.key}`}
                    value={attributes[field.key] || ""}
                    onChange={(e) => updateAttr(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
                {field.type === "number" && (
                  <Input
                    id={`attr-${field.key}`}
                    type="number"
                    min="0"
                    step="any"
                    value={attributes[field.key] || ""}
                    onChange={(e) => updateAttr(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
                {field.type === "date" && (
                  <Input
                    id={`attr-${field.key}`}
                    type="date"
                    value={attributes[field.key] || ""}
                    onChange={(e) => updateAttr(field.key, e.target.value)}
                    required={field.required}
                  />
                )}
                {field.type === "boolean" && (
                  <select
                    id={`attr-${field.key}`}
                    value={attributes[field.key] || ""}
                    onChange={(e) => updateAttr(field.key, e.target.value)}
                    required={field.required}
                    className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-card"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                )}
                {field.type === "select" && (
                  <select
                    id={`attr-${field.key}`}
                    value={attributes[field.key] || ""}
                    onChange={(e) => updateAttr(field.key, e.target.value)}
                    required={field.required}
                    className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-card"
                  >
                    <option value="">Seleccionar...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel || (() => {})}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || uploading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : product ? (
            "Guardar cambios"
          ) : (
            "Crear producto"
          )}
        </Button>
      </div>
    </form>
  );
}