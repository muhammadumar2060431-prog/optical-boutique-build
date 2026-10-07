import assert from "node:assert/strict";
import { it } from "node:test";
import { hasStorefrontContent, withStorefrontTimeout } from "../src/lib/storefront-loading.ts";
import type { InitialSupabaseData } from "../src/lib/supabaseSync.ts";

it("bounds a stalled data or auth request", async () => {
  await assert.rejects(
    withStorefrontTimeout(new Promise(() => {}), 10),
    /Storefront request timed out/,
  );
});

it("preserves successful and failed requests", async () => {
  assert.equal(await withStorefrontTimeout(Promise.resolve("fresh"), 100), "fresh");
  await assert.rejects(withStorefrontTimeout(Promise.reject(new Error("offline"))), /offline/);
});

it("does not mistake failed queries for an intentionally empty storefront", () => {
  const content: InitialSupabaseData = {
    products: [],
    categories: [],
    collections: [],
    heroSlides: [],
    orders: null,
    queries: null,
    subscribers: null,
    brands: [],
    socialReels: [],
    testimonials: [],
    faqs: [],
    settings: null,
    announcement: null,
    video: null,
  };
  assert.equal(hasStorefrontContent(content), true);
  assert.equal(hasStorefrontContent({ ...content, heroSlides: null }), false);
  assert.equal(hasStorefrontContent({ ...content, products: null }), false);
  assert.equal(hasStorefrontContent(null), false);
});
