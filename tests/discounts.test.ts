import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  discountedPrice,
  getProductUnitPrice,
  productForEditing,
  validateDiscountCampaign,
} from "../src/lib/discounts.ts";
import type { Product } from "../src/lib/types.ts";

const product = {
  price: 1000,
  salePrice: 800,
  manualSalePrice: 900,
  bulkDiscountPercent: 20,
} as Product;
describe("discount pricing", () => {
  it("uses the original price rather than stacking an existing sale", () => {
    assert.equal(getProductUnitPrice(product), 800);
    assert.equal(discountedPrice(product.price, 20), 800);
    assert.equal(productForEditing(product).salePrice, 900);
    assert.equal(productForEditing(product).bulkDiscountPercent, undefined);
  });
  it("discounts an explicit variant price and preserves its original value", () => {
    const variant = { id: "red", label: "Red", image: "", stock: 3, price: 1250 };
    assert.equal(getProductUnitPrice(product, variant), 1000);
    assert.equal(variant.price, 1250);
    assert.equal(
      getProductUnitPrice({ ...product, bulkDiscountPercent: null, salePrice: 900 }, variant),
      1250,
    );
    assert.equal(
      getProductUnitPrice({ ...product, bulkDiscountPercent: null, salePrice: 900 }),
      900,
    );
  });
  it("handles free prices and decimal rounding", () => {
    assert.equal(discountedPrice(450, 100), 0);
    assert.equal(discountedPrice(12.25, 10), 11.03);
    assert.equal(discountedPrice(999.99, 12.5), 874.99);
    assert.equal(discountedPrice(9999999999.99, 33.33), 6666999999.99);
    assert.equal(getProductUnitPrice({ ...product, salePrice: 0 }), 0);
  });
  it("rejects invalid percentages and category rates above an Up to cap", () => {
    for (const percentage of [-1, 101, NaN, Infinity, 12.345]) {
      assert.throws(() =>
        validateDiscountCampaign({ enabled: true, mode: "flat", percentage, categories: {} }),
      );
    }
    assert.throws(() =>
      validateDiscountCampaign({
        enabled: true,
        mode: "upto",
        percentage: 20,
        categories: { glasses: 30 },
      }),
    );
    validateDiscountCampaign({
      enabled: true,
      mode: "upto",
      percentage: 20,
      categories: { glasses: 20, lenses: 10 },
    });
  });
});
