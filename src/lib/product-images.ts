import type { Product } from "./types";

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Returns the canonical secondary product images.
 * Legacy database rows are normalized by mapDbProductToStore before reaching UI code.
 */
export function getProductSubImages(product: Product): string[] {
  const candidates =
    product.subImages.length > 0 ? product.subImages : (product.details.subImages ?? []);
  return candidates.filter(isNonEmptyString);
}

export function getProductDisplayImage(product: Product): string | null {
  const primary =
    isNonEmptyString(product.image) && product.image !== "/placeholder.svg" ? product.image : null;
  return (
    primary ?? getProductSubImages(product).find((image) => image !== "/placeholder.svg") ?? null
  );
}
