import { useRef, useEffect, useMemo, useState } from "react";
import { useAuth } from "@gestionate/core/client";
import { api as productsApi } from "@gestionate/products/client";
import { IProduct } from "@gestionate/core/shared";
import { formatCurrency } from "@gestionate/core/client";
import { useToast } from "@gestionate/core/client";
import { Badge } from "@gestionate/core/client";
import { Button } from "@gestionate/core/client";
import { Card, CardContent } from "@gestionate/core/client";
import { Input } from "@gestionate/core/client";
import { Label } from "@gestionate/core/client";
import { Skeleton } from "@gestionate/core/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@gestionate/core/client";
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
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  Loader2,
  Package,
  Pencil,
} from "lucide-react";

export default function StockPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = user && (user.role === "super_admin" || user.role === "encargado");

  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IProduct | null>(null);
  const [adjustType, setAdjustType] = useState<"entrada" | "salida">("entrada");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await productsApi.getProducts({ search });
      setProducts(res.products);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const lowStock = useMemo(
    () => products.filter((p) => p.stock <= p.minStock),
    [products]
  );

  const filtered = tab === "bajo" ? lowStock : products;

  const handleAdjust = async () => {
    if (!editing) return;
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      toast("Ingresá una cantidad válida", "error");
      return;
    }
    setSaving(true);
    try {
      await productsApi.updateStock(editing._id, qty, adjustType);
      toast(
        adjustType === "entrada"
          ? `Se agregaron ${qty} unidades a ${editing.name}`
          : `Se retiraron ${qty} unidades de ${editing.name}`
      );
      setDialogOpen(false);
      setQuantity("");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock</h1>
        <p className="text-sm text-muted-foreground">
          Control de inventario de productos
        </p>
      </div>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/15 p-2">
              <Package className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-medium">
                {lowStock.length} producto{lowStock.length !== 1 ? "s" : ""} con stock bajo
              </p>
              <p className="text-xs text-muted-foreground">
                Stock menor o igual al mínimo configurado
              </p>
            </div>
          </div>
          {canManage && (
            <Button variant="outline" onClick={() => setTab("bajo")} size="sm">
              Ver ahora
            </Button>
          )}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="bajo">Stock bajo</TabsTrigger>
          </TabsList>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="todos">
          <StockTable
            products={filtered}
            loading={loading}
            canManage={!!canManage}
            onEdit={(p, type) => {
              setEditing(p);
              setAdjustType(type);
              setQuantity("");
              setDialogOpen(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
          />
        </TabsContent>
        <TabsContent value="bajo">
          <StockTable
            products={filtered}
            loading={loading}
            canManage={!!canManage}
            onEdit={(p, type) => {
              setEditing(p);
              setAdjustType(type);
              setQuantity("");
              setDialogOpen(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar stock: {editing?.name}</DialogTitle>
            <DialogDescription>
              Stock actual: <span className="font-mono font-semibold">{editing?.stock} u.</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de movimiento</Label>
              <Select
                value={adjustType}
                onValueChange={(v) => setAdjustType(v as "entrada" | "salida")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (aumentar stock)</SelectItem>
                  <SelectItem value="salida">Salida (reducir stock)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                ref={inputRef}
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={saving}
              variant={adjustType === "salida" ? "destructive" : "default"}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ajustando...
                </>
              ) : adjustType === "entrada" ? (
                <>
                  <ArrowDownToLine className="h-4 w-4" />
                  Agregar stock
                </>
              ) : (
                <>
                  <ArrowUpFromLine className="h-4 w-4" />
                  Retirar stock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StockTable({
  products,
  loading,
  canManage,
  onEdit,
}: {
  products: IProduct[];
  loading: boolean;
  canManage: boolean;
  onEdit: (product: IProduct, type: "entrada" | "salida") => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">Sin resultados</p>
          <p className="text-sm text-muted-foreground">No hay productos que coincidan</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => {
        const low = product.stock <= product.minStock;
        const pct = product.minStock > 0 ? (product.stock / (product.minStock * 2)) * 100 : 50;
        const barColor = low ? "bg-amber-500" : "bg-primary";
        const barWidth = Math.min(100, Math.max(pct, product.stock > 0 ? 8 : pct));

        return (
          <Card key={product._id} className="transition-colors hover:border-primary/40">
            <CardContent className="p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{product.name}</h3>
                  <p className="text-xs text-muted-foreground">{product.sku}</p>
                </div>
                <Badge variant={low ? "warning" : "success"}>
                  {product.stock} u.
                </Badge>
              </div>

              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Mínimo: {product.minStock} u.</span>
                <span>Costo: {formatCurrency(product.cost)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${barColor} transition-all`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {canManage && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(product, "entrada")}
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                    Entrada
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-400 border-red-500/30 hover:text-red-400"
                    onClick={() => onEdit(product, "salida")}
                  >
                    <ArrowUpFromLine className="h-3.5 w-3.5" />
                    Salida
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}