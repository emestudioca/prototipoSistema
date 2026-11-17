import { useEffect, useMemo, useState } from "react";
import { api } from "@gestionate/sales/client";
import { ISale } from "@gestionate/core/shared";
import { formatCurrency, formatDateTime } from "@gestionate/core/client";
import { useToast } from "@gestionate/core/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gestionate/core/client";
import { Receipt, Search, ArrowUpDown } from "lucide-react";

const paymentLabels: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

export default function SalesPage() {
  const { toast } = useToast();
  const [sales, setSales] = useState<ISale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("todas");
  const [sellerFilter, setSellerFilter] = useState("todos");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [selected, setSelected] = useState<ISale | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getSales({ limit: 500 });
      setSales(res.sales);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    const total = sales.reduce((sum, s) => sum + s.total, 0);
    const profit = sales.reduce((sum, s) => sum + s.profit, 0);
    return { total, profit };
  }, [sales]);

  const sellerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sales) {
      if (!map.has(s.seller)) map.set(s.seller, s.sellerName);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "es")
    );
  }, [sales]);

  const filtered = useMemo(() => {
    let list = [...sales];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.sellerName.toLowerCase().includes(q) ||
          s.items.some((i) => i.productName.toLowerCase().includes(q)) ||
          s.items.some((i) => i.product.includes(q))
      );
    }
    if (paymentFilter !== "todas") {
      list = list.filter((s) => s.paymentMethod === paymentFilter);
    }
    if (sellerFilter !== "todos") {
      list = list.filter((s) => s.seller === sellerFilter);
    }
    list.sort((a, b) =>
      sortDir === "desc"
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return list;
  }, [sales, search, paymentFilter, sellerFilter, sortDir]);

  const todayCount = sales.filter(
    (s) => new Date(s.createdAt).toDateString() === new Date().toDateString()
  ).length;

  const statCards = [
    { label: "Ventas totales", value: formatCurrency(totals.total) },
    { label: "Ganancia estimada", value: formatCurrency(totals.profit) },
    { label: "Ventas hoy", value: String(todayCount) },
    { label: "Total registros", value: String(sales.length) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historial de ventas</h1>
        <p className="text-sm text-muted-foreground">
          Todas las ventas registradas en el sistema
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-lg font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por vendedor o producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={sellerFilter} onValueChange={setSellerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los vendedores</SelectItem>
              {sellerOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos los pagos</SelectItem>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="tarjeta">Tarjeta</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
            aria-label="Cambiar orden"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">Sin ventas</p>
            <p className="text-sm text-muted-foreground">
              No hay ventas que coincidan con los filtros
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((sale) => (
            <Card key={sale._id} className="transition-colors hover:border-primary/40">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{formatCurrency(sale.total)}</p>
                      <Badge variant="secondary" className="capitalize">
                        {paymentLabels[sale.paymentMethod]}
                      </Badge>
                      <Badge variant="success">
                        {sale.items.length} ítem{sale.items.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sale.sellerName} · {formatDateTime(sale.createdAt)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {sale.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {item.productName} ×{item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="sm:shrink-0"
                    onClick={() => setSelected(sale)}
                  >
                    Ver detalle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de venta</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-background/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendedor</span>
                  <span className="font-medium">{selected.sellerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha</span>
                  <span>{formatDateTime(selected.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pago</span>
                  <span className="capitalize">{paymentLabels[selected.paymentMethod]}</span>
                </div>
              </div>

              <div className="space-y-2">
                {selected.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border bg-background/50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selected.total)}</span>
                </div>
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(selected.total)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}