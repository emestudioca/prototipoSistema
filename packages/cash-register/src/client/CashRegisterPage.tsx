import { useEffect, useMemo, useState } from "react";
import { api } from "@gestionate/cash-register/client";
import { ICashRegister } from "@gestionate/core/shared";
import { formatCurrency, formatDateTime } from "@gestionate/core/client";
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
  Wallet,
  Loader2,
  Lock,
  Unlock,
  Receipt,
  ArrowLeftRight,
} from "lucide-react";

export default function CashRegisterPage() {
  const { toast } = useToast();
  const [registers, setRegisters] = useState<ICashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("actual");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getRegisters();
      setRegisters(res.registers);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const active = registers.find((r) => r.status === "abierta");

  const handleOpen = async () => {
    setSaving(true);
    try {
      await api.openRegister(parseFloat(openingAmount) || 0);
      toast("Caja abierta correctamente");
      setOpenDialog(false);
      setOpeningAmount("");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    setSaving(true);
    try {
      await api.closeRegister(parseFloat(closingAmount) || 0, notes);
      toast("Caja cerrada correctamente");
      setCloseDialog(false);
      setClosingAmount("");
      setNotes("");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const pastRegisters = useMemo(
    () => registers.filter((r) => r.status === "cerrada"),
    [registers]
  );

  if (loading) return <RegisterSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Caja</h1>
        <p className="text-sm text-muted-foreground">
          Apertura, cierre y control del flujo de dinero
        </p>
      </div>

      {active ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                  <Unlock className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">Caja abierta</p>
                    <Badge variant="success">ABIERTA</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Abierta por {active.openedByName} · {formatDateTime(active.createdAt)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Fondo inicial</p>
                  <p className="font-semibold">{formatCurrency(active.openingAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ventas en caja</p>
                  <p className="font-semibold">{formatCurrency(active.totalSales)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Esperado (fondo + ventas)</p>
                  <p className="font-semibold">
                    {formatCurrency(active.openingAmount + active.totalSales)}
                  </p>
                </div>
              </div>
              <Button onClick={() => setCloseDialog(true)} className="w-full sm:w-auto">
                <Lock className="h-4 w-4" />
                Cerrar caja
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-between gap-4 p-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Wallet className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">No hay caja abierta</p>
                <p className="text-sm text-muted-foreground">
                  Abrí la caja para registrar ventas con control de caja
                </p>
              </div>
            </div>
            <Button onClick={() => setOpenDialog(true)} size="lg" className="w-full sm:w-auto">
              <Unlock className="h-4 w-4" />
              Abrir caja
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="actual">Caja actual</TabsTrigger>
          <TabsTrigger value="historial">Historial de cierres</TabsTrigger>
        </TabsList>

        <TabsContent value="actual">
          {active ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <RegisterStat
                label="Fondo inicial"
                value={formatCurrency(active.openingAmount)}
                icon={Wallet}
                color="text-sky-500 bg-sky-500/10"
              />
              <RegisterStat
                label="Ventas registradas"
                value={formatCurrency(active.totalSales)}
                icon={Receipt}
                color="text-emerald-500 bg-emerald-500/10"
              />
              <RegisterStat
                label="Total esperado"
                value={formatCurrency(active.openingAmount + active.totalSales)}
                icon={ArrowLeftRight}
                color="text-violet-500 bg-violet-500/10"
              />
              <RegisterStat
                label="Apertura"
                value={formatDateTime(active.createdAt)}
                icon={Unlock}
                color="text-amber-500 bg-amber-500/10"
              />
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Wallet className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium">Sin caja activa</p>
                <p className="text-sm text-muted-foreground">
                  Aperturá la caja para comenzar el turno
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historial">
          {pastRegisters.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium">Sin cierres registrados</p>
                <p className="text-sm text-muted-foreground">Aún no hay cierres de caja</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pastRegisters.map((r) => {
                const diff = r.difference ?? 0;
                return (
                  <Card key={r._id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">Cierre de caja</p>
                            <Badge
                              variant={diff === 0 ? "success" : Math.abs(diff) > 0 ? "warning" : "secondary"}
                            >
                              {diff === 0
                                ? "CUADRA"
                                : Math.abs(diff) > 0
                                ? `DIFERENCIA ${diff > 0 ? "+" : ""}${formatCurrency(diff)}`
                                : ""}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {r.openedByName} → {r.closedByName} ·{" "}
                            {r.closedAt ? formatDateTime(r.closedAt) : ""}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-right sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Contado</p>
                            <p className="font-medium">{formatCurrency(r.closingAmount ?? 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Esperado</p>
                            <p className="font-medium">{formatCurrency(r.expectedAmount ?? 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Ventas</p>
                            <p className="font-medium">{formatCurrency(r.totalSales)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir caja</DialogTitle>
            <DialogDescription>
              Registrá el monto de apertura (fondo inicial)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="opening">Fondo inicial (ARS)</Label>
            <Input
              id="opening"
              type="number"
              min="0"
              step="0.01"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpen} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Abriendo...
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  Abrir caja
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cerrar caja</DialogTitle>
            <DialogDescription>
              Contá el dinero en caja y registrá el cierre. El sistema calcula la diferencia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="closing">Dinero en caja (ARS)</Label>
              <Input
                id="closing"
                type="number"
                min="0"
                step="0.01"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones del cierre"
              />
            </div>
            {parseFloat(closingAmount) > 0 && active && (
              <div className="rounded-lg border bg-background/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Esperado</span>
                  <span className="font-medium">
                    {formatCurrency(active.openingAmount + active.totalSales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diferencia</span>
                  <span
                    className={
                      (parseFloat(closingAmount) - (active.openingAmount + active.totalSales)) === 0
                        ? "font-semibold text-emerald-500"
                        : "font-semibold text-amber-500"
                    }
                  >
                    {formatCurrency(
                      parseFloat(closingAmount) - (active.openingAmount + active.totalSales)
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleClose} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cerrando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Confirmar cierre
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RegisterStat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-semibold">{value}</p>
          </div>
          <div className={`rounded-lg p-2 ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RegisterSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-28" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}