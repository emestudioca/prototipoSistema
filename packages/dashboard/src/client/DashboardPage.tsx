import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@gestionate/core/client";
import { api as productsApi } from "@gestionate/products/client";
import { api as salesApi } from "@gestionate/sales/client";
import { api as registerApi } from "@gestionate/cash-register/client";
import { IProduct, ISale, ICashRegister } from "@gestionate/core/shared";
import { formatCurrency, cn } from "@gestionate/core/client";
import { Badge } from "@gestionate/core/client";
import { Button } from "@gestionate/core/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@gestionate/core/client";
import { Skeleton } from "@gestionate/core/client";
import {
  Package,
  AlertTriangle,
  Wallet,
  ArrowRight,
  ShoppingCart,
  DollarSign,
  ReceiptText,
  TrendingUp,
  TrendingDown,
  Users,
  Trophy,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const isManager = user?.role === "super_admin" || user?.role === "encargado";
  const [products, setProducts] = useState<IProduct[]>([]);
  const [sales, setSales] = useState<ISale[]>([]);
  const [registers, setRegisters] = useState<ICashRegister[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [prodRes, salesRes] = await Promise.all([
          productsApi.getProducts(),
          isManager
            ? salesApi.getSales({ limit: 500 })
            : salesApi.getSales({ limit: 500, seller: user?.id }),
        ]);
        setProducts(prodRes.products);
        setSales(salesRes.sales);
        if (isManager) {
          const regRes = await registerApi.getRegisters();
          setRegisters(regRes.registers);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isManager, user?.id]);

  const lowStock = useMemo(() => products.filter((p) => p.stock <= p.minStock), [products]);

  const days = useMemo(() => {
    const out: { date: Date; key: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(startOfDay(new Date()), i);
      out.push({ date: d, key: d.toDateString() });
    }
    return out;
  }, []);

  const chartData = useMemo(
    () =>
      days.map((d) => ({
        label: format(d.date, "EEE", { locale: es }),
        full: format(d.date, "dd/MM"),
        total: sales
          .filter((s) => new Date(s.createdAt).toDateString() === d.key)
          .reduce((sum, s) => sum + s.total, 0),
      })),
    [days, sales]
  );

  const today = useMemo(() => {
    const now = new Date().toDateString();
    const todaySales = sales.filter((s) => new Date(s.createdAt).toDateString() === now);
    const yesterday = subDays(new Date(), 1).toDateString();
    const yesterdayTotal = sales
      .filter((s) => new Date(s.createdAt).toDateString() === yesterday)
      .reduce((sum, s) => sum + s.total, 0);

    const total = todaySales.reduce((sum, s) => sum + s.total, 0);
    const delta = yesterdayTotal > 0 ? ((total - yesterdayTotal) / yesterdayTotal) * 100 : null;
    const ticket = todaySales.length > 0 ? total / todaySales.length : 0;

    return { total, count: todaySales.length, delta, ticket };
  }, [sales]);

  const periodTotal = useMemo(() => sales.reduce((sum, s) => sum + s.total, 0), [sales]);
  const periodProfit = useMemo(() => sales.reduce((sum, s) => sum + s.profit, 0), [sales]);
  const activeRegister = registers.find((r) => r.status === "abierta");

  const sellerStats = useMemo(() => {
    const map = new Map<string, { count: number; total: number; profit: number }>();
    for (const s of sales) {
      const key = `${s.sellerName} (${s.seller})`;
      const cur = map.get(key) || { count: 0, total: 0, profit: 0 };
      cur.count += 1;
      cur.total += s.total;
      cur.profit += s.profit;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([label, stats]) => ({ label, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [sales]);

  if (loading) return <DashboardSkeleton />;

  const stats = [
    {
      label: "Ventas de hoy",
      value: formatCurrency(today.total),
      hint:
        today.count > 0
          ? `${today.count} venta${today.count > 1 ? "s" : ""} · ticket ${formatCurrency(today.ticket)}`
          : "Sin ventas aún",
      icon: DollarSign,
      accent: "text-primary",
    },
    {
      label: "vs. ayer",
      value: today.delta == null ? "—" : `${today.delta >= 0 ? "+" : ""}${today.delta.toFixed(0)}%`,
      hint: "Comparado con el día anterior",
      icon: today.delta != null && today.delta >= 0 ? TrendingUp : TrendingDown,
      accent: today.delta != null && today.delta >= 0 ? "text-emerald-500" : "text-red-500",
    },
    {
      label: "Total del período",
      value: formatCurrency(periodTotal),
      hint: `Ganancia est. ${formatCurrency(periodProfit)}`,
      icon: ReceiptText,
      accent: "text-primary",
    },
    {
      label: "Stock bajo",
      value: lowStock.length.toString(),
      hint: `de ${products.length} productos`,
      icon: AlertTriangle,
      accent: lowStock.length > 0 ? "text-amber-500" : "text-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-[26px]">
            {user?.role === "super_admin" ? "Hola, administrador" : user?.role === "encargado" ? "Hola, encargado" : "Hola, vendedor"}
          </h1>
        </div>
        <Link to="/pos" className="w-full sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto">
            <ShoppingCart className="h-4 w-4" />
            Nueva venta
          </Button>
        </Link>
      </div>

      {activeRegister && (
        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-card">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12">
            <Wallet className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Caja abierta</p>
            <p className="truncate text-xs text-muted-foreground">
              Abierta por {activeRegister.openedByName} · fondo inicial {formatCurrency(activeRegister.openingAmount)}
            </p>
          </div>
          <Link to="/caja">
            <Button variant="ghost" size="sm">
              Ver caja
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col justify-between gap-3 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <s.icon className={cn("h-[18px] w-[18px]", s.accent)} />
                <span className="text-xs font-medium">{s.label}</span>
              </div>
              <div>
                <p className={cn("font-display text-xl font-semibold tabular-nums tracking-tight sm:text-2xl", s.accent)}>
                  {s.value}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Ingresos — últimos 7 días</CardTitle>
            <CardDescription>Volumen de ventas por día</CardDescription>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {formatCurrency(chartData.reduce((a, b) => a + b.total, 0))}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                  width={40}
                />
                <Tooltip
                  cursor={{ stroke: "hsl(var(--border))" }}
                  formatter={(value) => [formatCurrency(Number(value)), "Ventas"]}
                  labelFormatter={(_, payload) => (payload?.[0]?.payload?.full as string) ?? ""}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 13,
                    boxShadow: "0 8px 24px -8px rgb(0 0 0 / 0.2)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#revFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {isManager && sellerStats.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Rendimiento de vendedores
              </CardTitle>
              <CardDescription>Ventas por usuario en el período cargado</CardDescription>
            </div>
            <Badge variant="secondary" className="tabular-nums">
              {sellerStats.reduce((a, b) => a + b.count, 0)} ventas
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sellerStats.map((s, i) => {
                const name = s.label.replace(/\s*\(.*\)$/, "");
                const initials = name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const pct = sellerStats[0].total > 0 ? (s.total / sellerStats[0].total) * 100 : 0;
                return (
                  <div
                    key={s.label}
                    className="rounded-xl border bg-background/60 p-4 transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.count} venta{s.count > 1 ? "s" : ""} · est. {formatCurrency(s.profit)}
                        </p>
                      </div>
                      {i === 0 && (
                        <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
                      )}
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <p className="font-display text-lg font-semibold tabular-nums tracking-tight">
                        {formatCurrency(s.total)}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(s.total / s.count)}/venta
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Últimas ventas</CardTitle>
            <CardDescription>Las más recientes del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <EmptyState text="Aún no hay ventas registradas" />
            ) : (
              <div className="space-y-2">
                {sales.slice(0, 5).map((sale) => (
                  <div
                    key={sale._id}
                    className="flex items-center justify-between rounded-lg border bg-background/60 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {sale.items.length} producto{sale.items.length > 1 ? "s" : ""} · {sale.sellerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(sale.createdAt), "d MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
                    <Badge variant="success" className="capitalize shrink-0 ml-2">
                      {sale.paymentMethod}
                    </Badge>
                    <p className="w-20 text-right text-sm font-semibold tabular-nums shrink-0">
                      {formatCurrency(sale.total)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {sales.length > 0 && (
              <Link to="/ventas" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Ver todas las ventas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock bajo</CardTitle>
            <CardDescription>Productos cerca del mínimo configurado</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <EmptyState text="Todo el inventario está en orden" />
            ) : (
              <div className="space-y-2">
                {lowStock.slice(0, 6).map((p) => {
                  const pct = Math.min(100, (p.stock / (p.minStock * 2)) * 100);
                  return (
                    <div key={p._id} className="rounded-lg border bg-background/60 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="shrink-0 text-xs text-muted-foreground">
                          <span className="font-medium text-amber-500 tabular-nums">{p.stock}</span> / {p.minStock} mín.
                        </p>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(pct, 4)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {lowStock.length > 0 && (
              <Link to="/stock" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Gestionar stock <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Package className="mb-2 h-8 w-8 text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}