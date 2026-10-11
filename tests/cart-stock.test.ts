import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { productStockForCartItem, resolveCartItemStock } from "../src/lib/cart-stock.ts";
import type { Product } from "../src/lib/types.ts";

const product: Product = {
  id: "frame-1",
  slug: "frame-1",
  name: "Frame",
  categoryId: "glasses",
  collectionId: null,
  price: 450,
  salePrice: null,
  description: "",
  image: "/frame.jpg",
  hoverImage: null,
  subImages: [],
  stock: 0,
  variants: [
    { id: "grey", label: "Grey", image: "/grey.jpg", stock: 2 },
    { id: "black", label: "Black", image: "/black.jpg", stock: 0 },
  ],
  details: {
    material: "",
    lensInfo: "",
    care: "",
  },
  featured: false,
  createdAt: "2026-10-11T00:00:00.000Z",
};

describe("cart stock resolution", () => {
  it("uses the exact variant stock when a cart line has a variant", () => {
    assert.equal(productStockForCartItem(product, "grey"), 2);
    assert.equal(resolveCartItemStock({ variantId: "grey", stockSnapshot: 9 }, product), 2);
  });

  it("falls back to the add-time stock snapshot when storefront products are stale", () => {
    assert.equal(resolveCartItemStock({ variantId: null, stockSnapshot: 2 }, undefined), 2);
  });

  it("does not let stale snapshots override a loaded zero-stock product", () => {
    assert.equal(resolveCartItemStock({ variantId: "black", stockSnapshot: 2 }, product), 0);
  });
});
