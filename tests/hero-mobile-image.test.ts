import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveHeroMobileImage } from "../src/lib/hero-image.ts";

describe("Hero mobile image resolution & fallback", () => {
  const desktop = "https://example.com/desktop-banner.jpg";

  it("returns mobile image when a valid mobile URL is provided", () => {
    const mobile = "https://example.com/mobile-banner.jpg";
    const result = resolveHeroMobileImage(mobile, desktop);
    assert.deepEqual(result, { src: mobile, isMobileSpecific: true });
  });

  it("falls back to desktop image when mobileImage is null", () => {
    const result = resolveHeroMobileImage(null, desktop);
    assert.deepEqual(result, { src: desktop, isMobileSpecific: false });
  });

  it("falls back to desktop image when mobileImage is undefined", () => {
    const result = resolveHeroMobileImage(undefined, desktop);
    assert.deepEqual(result, { src: desktop, isMobileSpecific: false });
  });

  it("falls back to desktop image when mobileImage is an empty string", () => {
    const result = resolveHeroMobileImage("", desktop);
    assert.deepEqual(result, { src: desktop, isMobileSpecific: false });
  });

  it("falls back to desktop image when mobileImage contains only whitespace", () => {
    const result = resolveHeroMobileImage("   ", desktop);
    assert.deepEqual(result, { src: desktop, isMobileSpecific: false });
  });
});
