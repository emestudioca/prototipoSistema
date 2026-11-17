import { useEffect, useRef, useState } from "react";
import { api as productsApi } from "@gestionate/products/client";
import { ProductImportResult } from "@gestionate/core/shared";
import { useToast } from "@gestionate/core/client";
import { Button } from "@gestionate/core/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gestionate/core/client";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  X,
} from "lucide-react";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (result: ProductImportResult) => void;
}

export function ImportDialog({
  open,
  onOpenChange,
  onImported,
}: ImportDialogProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<"choose" | "importing" | "done">("choose");
  const [file, setFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [importError, setImportError] = useState("");
  const [result, setResult] = useState<ProductImportResult | null>(null);

  useEffect(() => {
    if (open) {
      setStage("choose");
      setFile(null);
      setImportError("");
      setResult(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [open]);

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const blob = await productsApi.downloadProductTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla_productos.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast("Plantilla descargada");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setStage("importing");
    setImportError("");
    try {
      const res = await productsApi.importProducts(file);
      setResult(res);
      setStage("done");
      onImported(res);
    } catch (err) {
      setImportError((err as Error).message);
      setStage("choose");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar productos desde Excel</DialogTitle>
          <DialogDescription>
            Descargá la plantilla generada según tu modelo de producto, completala
            y subí el archivo.
          </DialogDescription>
        </DialogHeader>

        {stage === "done" && result ? (
          <div className="space-y-4">
            <div
              className={`flex items-start gap-3 rounded-lg border p-4 ${
                result.errors.length > 0
                  ? "border-amber-500/30 bg-amber-500/10"
                  : "border-emerald-500/30 bg-emerald-500/10"
              }`}
            >
              {result.errors.length > 0 ? (
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              )}
              <div className="text-sm">
                <p className="font-medium">
                  {result.errors.length > 0
                    ? "Importación con observaciones"
                    : "Importación completada"}
                </p>
                <p className="text-muted-foreground">
                  {result.created} producto{result.created !== 1 ? "s" : ""} importado
                  {result.created !== 1 ? "s" : ""}
                  {result.skipped > 0 ? ` · ${result.skipped} omitido${result.skipped !== 1 ? "s" : ""}` : ""}
                  {result.errors.length > 0
                    ? ` · ${result.errors.length} fila${result.errors.length !== 1 ? "s" : ""} con error`
                    : ""}
                </p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Fila</th>
                      <th className="px-3 py-2 font-medium">SKU</th>
                      <th className="px-3 py-2 font-medium">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((err, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-1.5">{err.row || "—"}</td>
                        <td className="px-3 py-1.5 font-mono">{err.sku || "—"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{err.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Listo</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Plantilla de productos</p>
                  <p className="text-xs text-muted-foreground">
                    Incluye las columnas de tu modelo de producto
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Descargar
              </Button>
            </div>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              {file ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    <X className="h-3 w-3" />
                    Quitar archivo
                  </button>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">
                    Seleccioná el archivo Excel
                  </p>
                  <p className="text-xs text-muted-foreground">
                    .xlsx, .xls o .csv · máx. 5MB
                  </p>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            {importError && (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {importError}
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={!file || stage === "importing"}>
                {stage === "importing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Importar{file ? ` (${file.name})` : ""}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}