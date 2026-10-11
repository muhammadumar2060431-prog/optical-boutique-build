import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Product, Variant } from "./types";
import { trackMetaEvent } from "./meta-events";
import { productStockForCartItem } from "./cart-stock";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "./store";
import { isSupabaseConfigured, supabase } from "./supabase";
import { mapDbProductToStore } from "./supabaseSync";
import { getProductUnitPrice } from "./discounts";

export interface CartItem {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  image: string;
  price: number;
  qty: number;
  stockSnapshot?: number | null;
}

interface CartApi {
  items: CartItem[];
  count: number;
  subtotal: number;
  hydrated: boolean;
  addItem: (product: Product, variant?: Variant | null, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartApi | null>(null);

const STORAGE_KEY = "optique.cart.v1";
const LEGACY_STORAGE_KEY = "nigah.cart.v1";

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const i = value as Record<string, unknown>;
  return (
    typeof i["key"] === "string" &&
    typeof i["productId"] === "string" &&
    typeof i["name"] === "string" &&
    typeof i["image"] === "string" &&
    typeof i["price"] === "number" &&
    typeof i["qty"] === "number"
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { products } = useStore();
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const productIds = [...new Set(items.map((item) => item.productId))].sort();
  const cartProducts = useQuery({
    queryKey: ["cart-products", productIds],
    enabled: isSupabaseConfigured && hydrated && productIds.length > 0,
    staleTime: 0,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds)
        .eq("enabled", true);
      if (error) throw error;
      return (data ?? []).map(mapDbProductToStore);
    },
  });

  // Restore after mount so SSR markup and first client render match.
  useEffect(() => {
    try {
      let raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (raw) window.localStorage.setItem(STORAGE_KEY, raw);
      }
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(isCartItem).map((i) => ({
              ...i,
              variantId: typeof i.variantId === "string" ? i.variantId : null,
              variantLabel: typeof i.variantLabel === "string" ? i.variantLabel : null,
              qty: Math.max(1, Math.round(i.qty) || 1),
              stockSnapshot:
                typeof i.stockSnapshot === "number"
                  ? Math.max(0, Math.round(i.stockSnapshot) || 0)
                  : null,
            })),
          );
        }
      }
    } catch {
      /* corrupt or unavailable storage — start with an empty bag */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full or blocked — cart still works for this session */
    }
  }, [items, hydrated]);

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
          price: getProductUnitPrice(product, variant),
          qty,
          stockSnapshot: productStockForCartItem(product, variant?.id ?? null),
        },
      ];
    });
    trackMetaEvent({
      eventName: "AddToCart",
      customData: {
        value: getProductUnitPrice(product, variant) * qty,
        currency: "PKR",
        contentIds: [product.id],
        contentType: "product",
        contentName: product.name,
        numItems: qty,
      },
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
    const availableProducts = new Map(products.map((product) => [product.id, product]));
    for (const product of cartProducts.data ?? []) {
      const current = availableProducts.get(product.id);
      if (!current || (product.inventoryRevision ?? 0) >= (current.inventoryRevision ?? 0)) {
        availableProducts.set(product.id, product);
      }
    }
    const pricedItems = items.map((item) => {
      const product = availableProducts.get(item.productId);
      if (!product) return item;
      const variant = product.variants.find((entry) => entry.id === item.variantId);
      return { ...item, price: getProductUnitPrice(product, variant) };
    });
    const count = pricedItems.reduce((n, i) => n + i.qty, 0);
    const subtotal =
      Math.round(pricedItems.reduce((n, i) => n + Math.round(i.price * 100) * i.qty, 0)) / 100;
    return {
      items: pricedItems,
      count,
      subtotal,
      hydrated,
      addItem,
      setQty,
      removeItem,
      clearCart,
    };
  }, [items, products, cartProducts.data, hydrated, addItem, setQty, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
