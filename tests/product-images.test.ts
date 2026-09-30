import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getOptimizedSupabaseImageSrc } from "../src/lib/product-images.ts";

describe("Supabase image optimization", () => {
  it("converts public Storage images to constrained render URLs", () => {
    const original =
      "https://demo.supabase.co/storage/v1/object/public/site-assets/hero/banner.png";
    const optimized = new URL(getOptimizedSupabaseImageSrc(original, 1280, 72));

    assert.equal(optimized.pathname, "/storage/v1/render/image/public/site-assets/hero/banner.png");
    assert.equal(optimized.searchParams.get("width"), "1280");
    assert.equal(optimized.searchParams.get("quality"), "72");
    assert.equal(optimized.searchParams.get("resize"), "contain");
  });

  it("leaves local and third-party image URLs unchanged", () => {
    assert.equal(getOptimizedSupabaseImageSrc("/hero.jpg", 1280), "/hero.jpg");
    assert.equal(
      getOptimizedSupabaseImageSrc("https://cdn.example.com/hero.jpg", 1280),
      "https://cdn.example.com/hero.jpg",
    );
  });
});
