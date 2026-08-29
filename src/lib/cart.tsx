import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Product, Variant } from "./types";

export interface CartItem {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  image: string;
  price: number;
  qty: number;
}

interface CartApi {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (product: Product, variant?: Variant | null, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback<CartApi["addItem"]>((product, variant, qty = 1) => {
    const key = `${product.id}:${variant?.id ?? "base"}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          variantId: variant?.id ?? null,
          name: product.name,
          variantLabel: variant?.label ?? null,
          image: variant?.image ?? product.image,
          price: product.price,
          qty,
        },
      ];
    });
  }, []);

  const setQty = useCallback<CartApi["setQty"]>((key, qty) => {
    const safe = Math.max(1, Math.round(qty) || 1);
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty: safe } : i)));
  }, []);

  const removeItem = useCallback<CartApi["removeItem"]>((key) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartApi>(() => {
    const count = items.reduce((n, i) => n + i.qty, 0);
    const subtotal = items.reduce((n, i) => n + i.qty * i.price, 0);
    return { items, count, subtotal, addItem, setQty, removeItem, clearCart };
  }, [items, addItem, setQty, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
