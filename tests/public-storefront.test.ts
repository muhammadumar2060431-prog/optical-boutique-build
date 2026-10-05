import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicStorefrontData } from "../src/lib/public-storefront.ts";
import { createReviewRecord } from "../src/lib/api/review-record.ts";
import { createStorefrontCacheHandler } from "../src/lib/api/storefront-cache.server.ts";
import type { InitialSupabaseData } from "../src/lib/supabaseSync.ts";

const privateData = {
  products: [],
  categories: [],
  collections: [],
  heroSlides: [],
  brands: [],
  socialReels: [],
  faqs: [],
  announcement: null,
  video: null,
  orders: [{ secret: "private-order" }],
  queries: [{ secret: "private-query" }],
  subscribers: [{ email: "subscriber@example.test" }],
  testimonials: [
    {
      id: "review",
      name: "Customer",
      quote: "Nice",
      rating: 5,
      email: "customer@example.test",
      hiddenSecret: "not-public",
      verified: true,
    },
  ],
  settings: {
    storeName: "Shop",
    logo: null,
    whatsapp: "",
    email: "public@example.test",
    phone: "",
    address: "",
    hours: "",
    lowStockThreshold: 3,
    adminEmail: "owner@example.test",
    admin_email: "legacy-private@example.test",
    aboutHeadline: "",
    aboutBody: "",
  },
} as unknown as InitialSupabaseData;

describe("public storefront privacy", () => {
  it("removes private rows and review/admin emails without modifying the input", () => {
    const original = JSON.stringify(privateData);
    const result = publicStorefrontData(privateData);
    const serialized = JSON.stringify(result);
    for (const secret of [
      "private-order",
      "private-query",
      "subscriber@example.test",
      "customer@example.test",
      "owner@example.test",
      "legacy-private@example.test",
      "not-public",
    ])
      assert.ok(!serialized.includes(secret));
    assert.ok(serialized.includes("public@example.test"));
    assert.equal(result.testimonials?.[0]?.verified, true);
    assert.equal(JSON.stringify(privateData), original);
  });
  it("sanitizes older Redis cache hits as well as newly loaded data", async () => {
    for (const hit of [true, false]) {
      const handler = createStorefrontCacheHandler({
        getCache: async () => (hit ? privateData : null),
        loadData: async () => privateData,
        setCache: async (_key, value) => {
          assert.deepEqual(value, publicStorefrontData(privateData));
          return true;
        },
      });
      const response = await handler();
      assert.deepEqual(
        (await response.json()).data,
        JSON.parse(JSON.stringify(publicStorefrontData(privateData))),
      );
    }
  });
  it("keeps a new review unverified and saves its email only in the private record", () => {
    const input = {
      name: "Customer",
      email: "customer@example.test",
      productId: "product",
      productName: "Frame",
      title: "Review",
      quote: "Good",
      rating: 5,
    };
    const result = createReviewRecord(input, "review", "2026-10-02T00:00:00Z", null);
    assert.equal(result.record.email, input.email);
    assert.equal(result.record.verified, false);
    assert.equal(result.response.verified, false);
    assert.ok(!("email" in result.response));
    assert.equal(input.email, "customer@example.test");
  });
});
