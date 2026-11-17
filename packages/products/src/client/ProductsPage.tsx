import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@gestionate/core/client";
import { api as productsApi } from "@gestionate/products/client";
import { api as settingsApi } from "@gestionate/settings/client";
import { IProduct, ProductFieldDef } from "@gestionate/core/shared";
import { formatCurrency, resolveImageUrl } from "@gestionate/core/client";
import { useToast } from "@gestionate/core/client";
import { useConfirm } from "@gestionate/core/client";
import { Badge } from "@gestionate/core/client";
import { Button } from "@gestionate/core/client";
import { Card, CardContent } from "@gestionate/core/client";
import { Input } from "@gestionate/core/client";
import { Skeleton } from "@gestionate/core/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@gestionate/core/client";
import { ProductForm } from "@gestionate/products/client";
import { ImportDialog } from "@gestionate/products/client";
import { Search, Package, Plus, Pencil, Trash2, FileSpreadsheet, FileText, FileUp } from "lucide-react";

export default function ProductsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const canManage = user && (user.role === "super_admin" || user.role === "encargado");

  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<IProduct | null>(null);
  const [modelFields, setModelFields] = useState<ProductFieldDef[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [prodRes, modelRes] = await Promise.all([
        productsApi.getProducts({ search }),
        settingsApi.getProductModel().catch(() => ({ fields: [] as ProductFieldDef[] })),
      ]);
      setProducts(prodRes.products);
      setModelFields(modelRes.fields.filter((f) => f.active));
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products]
  );

  const handleDelete = async (product: IProduct) => {
    const ok = await confirm({
      title: "Eliminar producto",
      message: `¿Eliminar "${product.name}" del catálogo? Esta acción se puede revertir reactivándolo.`,
      confirmLabel: "Eliminar",
    });
    if (!ok) return;
    try {
      await productsApi.deleteProduct(product._id);
      toast("Producto eliminado");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const handleExport = async (type: "excel" | "pdf") => {
    if (products.length === 0) {
      toast("No hay productos para exportar", "error");
      return;
    }
    const { exportProductsToExcel, exportProductsToPDF } = await import("@gestionate/products/client");
    if (type === "excel") exportProductsToExcel(products);
    else exportProductsToPDF(products);
    toast(`Exportado a ${type === "excel" ? "Excel" : "PDF"}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} productos en el catálogo
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {canManage && (
            <>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportOpen(true)}
                  title="Importar productos desde Excel"
                >
                  <FileUp className="h-4 w-4 text-indigo-500" />
                  Importar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("excel")}
                  title="Exportar a Excel (xlsx)"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("pdf")}
                  title="Exportar a PDF"
                >
                  <FileText className="h-4 w-4 text-red-500" />
                  PDF
                </Button>
              </div>
              <Button
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
                size="lg"
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Nuevo producto
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No se encontraron productos</p>
            <p className="text-sm text-muted-foreground">
              {canManage
                ? "Creá tu primer producto para comenzar"
                : "Consultá con un encargado para agregar productos"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const lowStock = product.stock <= product.minStock;
            return (
              <Card key={product._id} className="transition-colors hover:border-primary/40">
                <CardContent className="p-4">
                  {product.image && (
                    <div className="mb-3 h-32 w-full overflow-hidden rounded-lg border bg-muted">
                      <img
                        src={resolveImageUrl(product.image)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{product.name}</h3>
                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                    </div>
                    <Badge variant={lowStock ? "warning" : "success"}>
                      {product.stock} u.
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{product.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      mínimo {product.minStock}
                    </span>
                  </div>

                  {modelFields.length > 0 && product.attributes && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {modelFields.slice(0, 3).map((field) => {
                        const val = product.attributes?.[field.key];
                        if (val == null || val === "") return null;
                        return (
                          <span
                            key={field.key}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {field.label}: {String(val)}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-lg font-bold">{formatCurrency(product.price)}</p>
                      <p className="text-xs text-muted-foreground">
                        Costo: {formatCurrency(product.cost)}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditing(product);
                            setDialogOpen(true);
                          }}
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-400"
                          onClick={() => handleDelete(product)}
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editing}
            categories={categories}
            onCancel={() => setDialogOpen(false)}
            onSuccess={() => {
              setDialogOpen(false);
              setEditing(null);
              toast(editing ? "Producto actualizado" : "Producto creado");
              load();
            }}
          />
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={(res) => {
          toast(
            `${res.created} producto${res.created !== 1 ? "s" : ""} importado${res.created !== 1 ? "s" : ""}${
              res.skipped > 0 ? ` · ${res.skipped} omitido${res.skipped !== 1 ? "s" : ""}` : ""
            }${res.errors.length > 0 ? ` · ${res.errors.length} con error` : ""}`,
            res.errors.length > 0 ? "info" : "success"
          );
          load();
        }}
      />
    </div>
  );
}