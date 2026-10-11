import type { Product, Variant } from "./types.ts";

export interface DiscountCampaign {
  enabled: boolean;
  mode: "flat" | "upto";
  percentage: number;
  categories: Record<string, number>;
}

export const emptyDiscountCampaign: DiscountCampaign = {
  enabled: false,
  mode: "flat",
  percentage: 20,
  categories: {},
};

export function discountedPrice(originalPrice: number, percentage: number): number {
  if (
    !Number.isFinite(originalPrice) ||
    originalPrice < 0 ||
    !Number.isFinite(percentage) ||
    percentage < 0 ||
    percentage > 100
  ) {
    throw new Error(
      "Price and discount must be valid nonnegative numbers; discount cannot exceed 100%.",
    );
  }
  const cents = Math.round(originalPrice * 100);
  const basisPoints = Math.round(percentage * 100);
  return Number((BigInt(cents) * BigInt(10000 - basisPoints) + 5000n) / 10000n) / 100;
}

export function getProductUnitPrice(product: Product, variant?: Variant | null): number {
  if (variant?.price != null) {
    return product.bulkDiscountPercent != null
      ? discountedPrice(variant.price, product.bulkDiscountPercent)
      : variant.price;
  }
  return product.salePrice ?? product.price;
}

export function productForEditing(product: Product): Product {
  const editable = {
    ...product,
    salePrice:
      (product.manualSalePrice !== undefined ? product.manualSalePrice : product.salePrice) ?? null,
  };
  delete editable.manualSalePrice;
  delete editable.bulkDiscountPercent;
  return editable;
}

export function validateDiscountCampaign(campaign: DiscountCampaign): void {
  if (typeof campaign.enabled !== "boolean" || !["flat", "upto"].includes(campaign.mode)) {
    throw new Error("Invalid discount settings.");
  }
  const rates = [campaign.percentage, ...Object.values(campaign.categories)];
  if (
    rates.some(
      (rate) =>
        !Number.isFinite(rate) || rate < 0 || rate > 100 || Math.round(rate * 100) / 100 !== rate,
    )
  ) {
    throw new Error("Enter a percentage from 0 to 100 with up to two decimal places.");
  }
  if (campaign.mode === "upto" && rates.some((rate) => rate > campaign.percentage)) {
    throw new Error("Category discounts cannot exceed the Up to percentage.");
  }
}
