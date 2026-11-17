import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api as productsApi } from "@gestionate/products/client";
import { api as salesApi } from "@gestionate/sales/client";
import { IProduct } from "@gestionate/core/shared";
import { formatCurrency, resolveImageUrl } from "@gestionate/core/client";
import { useAuth } from "@gestionate/core/client";
import { useToast } from "@gestionate/core/client";
import { Badge } from "@gestionate/core/client";
import { Button } from "@gestionate/core/client";
import { Card, CardContent, CardHeader, CardTitle } from "@gestionate/core/client";
import { Input } from "@gestionate/core/client";
import { Skeleton } from "@gestionate/core/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetCloseButton,
} from "@gestionate/core/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gestionate/core/client";
import { CartList, CartLine } from "@gestionate/pos/client";
import {
  Search,
  ShoppingCart,
  Loader2,
  Package,
  CheckCircle2,
  Receipt,
} from "lucide-react";

const paymentMethods = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
];

export default function POSPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todas");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [showCart, setShowCart] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await productsApi.getProducts();
      setProducts(res.products.filter((p) => p.stock > 0));
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

  const visible = useMemo(() => {
    let list = products;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }
    if (category !== "todas") {
      list = list.filter((p) => p.category === category);
    }
    return list;
  }, [products, search, category]);

  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const total = cart.reduce(
    (sum, l) => sum + l.product.price * l.quantity,
    0
  );

  const addToCart = (product: IProduct) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast(`Stock máximo de ${product.name}`, "info");
          return prev;
        }
        return prev.map((l) =>
          l.product._id === product._id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const line = cart.find((l) => l.product._id === productId);
    if (!line) return;
    if (quantity > line.product.stock) {
      toast(`Stock máximo de ${line.product.name}`, "info");
      quantity = line.product.stock;
    }
    if (quantity < 1) {
      setCart((prev) => prev.filter((l) => l.product._id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((l) =>
        l.product._id === productId ? { ...l, quantity } : l
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.product._id !== productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckingOut(true);
    try {
      await salesApi.createSale({
        items: cart.map((l) => ({ productId: l.product._id, quantity: l.quantity })),
        paymentMethod,
      });
      toast("Venta registrada correctamente", "success");
      setCart([]);
      setShowCart(false);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
      load();
    } finally {
      setCheckingOut(false);
    }
  };

  const CartContent = (
    <>
      <div className="flex-1 overflow-y-auto px-4 sm:px-0">
        <CartList
          items={cart}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
        />
      </div>

      <div className="space-y-3 border-t bg-card/50 p-4 sm:p-0 sm:pt-4 sm:bg-transparent sm:border-t-0">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Método de pago
          </label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total ({cartCount} ítems)</p>
            <p className="text-2xl font-bold">{formatCurrency(total)}</p>
          </div>
          <Badge variant="secondary">
            {cart.length} producto{cart.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <Button
          size="lg"
          className="w-full"
          disabled={cart.length === 0 || checkingOut}
          onClick={handleCheckout}
        >
          {checkingOut ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Cobrar {formatCurrency(total)}
            </>
          )}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col gap-4 lg:h-[calc(100vh-8.5rem)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Punto de venta</h1>
          <p className="text-sm text-muted-foreground">
            {user?.name} · {products.length} productos disponibles
          </p>
        </div>
        <Link to="/ventas">
          <Button variant="outline" className="w-full sm:w-auto">
            <Receipt className="h-4 w-4" />
            Historial
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <FilterChip active={category === "todas"} onClick={() => setCategory("todas")}>
            Todas
          </FilterChip>
          {categories.map((c) => (
            <FilterChip
              key={c}
              active={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        <div className="flex-1 overflow-y-auto pr-0.5">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                <Skeleton key={i} className="h-36 sm:h-44" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Package className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">Sin productos</p>
              <p className="text-sm text-muted-foreground">
                No hay productos que coincidan con la búsqueda
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((product) => {
                const inCart = cart.find((l) => l.product._id === product._id);
                return (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="group relative flex flex-col rounded-xl border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-md active:scale-[0.98]"
                  >
                    {product.stock <= product.minStock && (
                      <Badge variant="warning" className="absolute left-2 top-2 z-10">
                        {product.stock} u.
                      </Badge>
                    )}
                    {inCart && (
                      <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {inCart.quantity}
                      </div>
                    )}
                    <div className="mb-3 h-28 w-full overflow-hidden rounded-lg border bg-muted sm:h-36">
                      {product.image ? (
                        <img
                          src={resolveImageUrl(product.image)}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <h3 className="line-clamp-1 text-sm font-medium">{product.name}</h3>
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">
                      {product.category}
                    </p>
                    <div className="mt-auto pt-2">
                      <p className="text-base sm:text-lg font-bold text-primary">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Card className="hidden lg:flex w-80 flex-col overflow-hidden lg:flex-0 shrink-0">
          <CardHeader className="border-b py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4" />
              Carrito
              {cartCount > 0 && (
                <Badge variant="default" className="ml-auto">
                  {cartCount}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          {CartContent}
        </Card>
      </div>

      {cartCount > 0 && (
        <div className="lg:hidden fixed bottom-[76px] left-0 right-0 z-40 px-4">
          <Button
            size="lg"
            className="w-full shadow-dialog"
            onClick={() => setShowCart(true)}
          >
            <ShoppingCart className="h-4 w-4" />
            Ver carrito · {cartCount} · {formatCurrency(total)}
          </Button>
        </div>
      )}

      <Sheet open={showCart} onOpenChange={setShowCart}>
        <SheetContent className="lg:hidden flex max-h-[85vh] flex-col">
          <SheetHeader className="border-b p-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base">Carrito de venta</SheetTitle>
              <SheetCloseButton />
            </div>
          </SheetHeader>
          {CartContent}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-transparent text-muted-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
