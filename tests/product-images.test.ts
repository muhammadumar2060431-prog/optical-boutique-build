import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getOptimizedSupabaseImageSrc,
  getProductGalleryImages,
  getProductSubImages,
  resolveProductSubImages,
} from "../src/lib/product-images.ts";
import type { Product } from "../src/lib/types.ts";

describe("product gallery", () => {
  const product = (overrides: Partial<Product> = {}) =>
    ({ image: "/main.jpg", subImages: [], details: {}, variants: [], ...overrides }) as Product;

  it("includes hover-only secondary images so thumbnails are not hidden", () => {
    assert.deepEqual(getProductGalleryImages(product({ hoverImage: "/hover.jpg" })), [
      "/main.jpg",
      "/hover.jpg",
    ]);
  });

  it("includes distinct gallery, hover, and variant views without duplicates", () => {
    assert.deepEqual(
      getProductGalleryImages(
        product({
          subImages: [" /angle.jpg ", "/main.jpg", "/angle.jpg"],
          hoverImage: "/angle.jpg",
          variants: [{ image: "/variant.jpg" }, { image: "/main.jpg" }] as Product["variants"],
        }),
      ),
      ["/main.jpg", "/angle.jpg", "/variant.jpg"],
    );
  });

  it("recovers database gallery images behind empty or invalid legacy lists", () => {
    assert.deepEqual(
      resolveProductSubImages("/main.jpg", [], [null, " "], undefined, [
        "/main.jpg",
        "/angle.jpg",
        "/angle.jpg",
      ]),
      ["/angle.jpg"],
    );
  });

  it("uses populated canonical images before older database lists", () => {
    assert.deepEqual(resolveProductSubImages("/main.jpg", ["/new.jpg"], ["/old.jpg"]), [
      "/new.jpg",
    ]);
  });

  it("recovers details images when the top-level list contains only blank values", () => {
    assert.deepEqual(
      getProductSubImages(
        product({
          subImages: [" "],
          details: { subImages: ["/angle.jpg"] } as Product["details"],
        }),
      ),
      ["/angle.jpg"],
    );
  });

  it("handles missing legacy fields and excludes placeholder thumbnails", () => {
    assert.deepEqual(getProductGalleryImages({ image: "/placeholder.svg" } as Product), []);
  });
});

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
  it("serves AVIF originals directly instead of an unsupported transform", () => {
    const original =
      "https://demo.supabase.co/storage/v1/object/public/site-assets/banner.AVIF?version=2";
    assert.equal(getOptimizedSupabaseImageSrc(original, 640), original);
  });
});
