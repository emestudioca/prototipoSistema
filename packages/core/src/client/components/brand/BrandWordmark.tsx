import { BrandGlyph } from "./BrandGlyph";

interface BrandWordmarkProps {
  layout?: "inline" | "stacked";
  showTagline?: boolean;
  subtitle?: string;
  className?: string;
}

export function BrandWordmark({
  layout = "inline",
  showTagline = false,
  subtitle,
  className,
}: BrandWordmarkProps) {
  if (layout === "stacked") {
    return (
      <div className={`flex flex-col items-center text-center ${className ?? ""}`}>
        <div className="brand-mark mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl shadow-dialog dark:text-background">
          <BrandGlyph className="h-24 w-24" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight font-display">Órbita</h1>
        {showTagline && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            Para tener todo el negocio girando bajo control
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <div className="brand-mark flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg dark:text-primary-foreground">
        <BrandGlyph className="h-14 w-14" />
      </div>
      <div>
        <p className="font-display text-[15px] font-bold leading-tight tracking-tight">Órbita</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}