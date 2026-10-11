import type { Product } from "./types";

export interface CartStockItem {
  variantId: string | null;
  stockSnapshot?: number | null;
}

export function productStockForCartItem(product: Product, variantId: string | null) {
  if (variantId) {
    return Math.max(
      0,
      Math.round(Number(product.variants.find((variant) => variant.id === variantId)?.stock) || 0),
    );
  }
  return product.variants.length
    ? product.variants.reduce(
        (sum, variant) => sum + Math.max(0, Math.round(Number(variant.stock) || 0)),
        0,
      )
    : Math.max(0, Math.round(Number(product.stock) || 0));
}

export function resolveCartItemStock(item: CartStockItem, product: Product | undefined) {
  if (product) return productStockForCartItem(product, item.variantId);
  return Math.max(0, Math.round(Number(item.stockSnapshot) || 0));
}
