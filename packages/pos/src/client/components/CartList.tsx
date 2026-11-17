import { useState } from "react";
import { IProduct } from "@gestionate/core/shared";
import { formatCurrency } from "@gestionate/core/client";
import { Button } from "@gestionate/core/client";
import { Minus, Plus, Trash2 } from "lucide-react";

export interface CartLine {
  product: IProduct;
  quantity: number;
}

interface Props {
  items: CartLine[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export function CartList({ items, onUpdateQuantity, onRemove }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Trash2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          El carrito está vacío
        </p>
        <p className="text-xs text-muted-foreground">
          Tocá un producto para agregarlo
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((line) => {
        const subtotal = line.product.price * line.quantity;
        return (
          <div
            key={line.product._id}
            className="flex items-center gap-3 rounded-lg border bg-background/50 p-2.5"
          >
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{line.product.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(line.product.price)} × {line.quantity}
              </p>
            </div>
            <button
              onClick={() => onUpdateQuantity(line.product._id, line.quantity - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-accent disabled:opacity-40"
              disabled={line.quantity <= 1}
              aria-label="Restar"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-7 text-center text-sm font-medium font-mono">
              {line.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(line.product._id, line.quantity + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-accent disabled:opacity-40"
              disabled={line.quantity >= line.product.stock}
              aria-label="Sumar"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <div className="w-16 text-right">
              <p className="text-sm font-semibold">{formatCurrency(subtotal)}</p>
            </div>
            <button
              onClick={() => onRemove(line.product._id)}
              className="p-1 text-muted-foreground hover:text-red-400"
              aria-label="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}