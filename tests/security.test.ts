import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSafeUrl, sanitizeHref, sanitizeImageSrc, sanitizeText } from "../src/lib/security.ts";

describe("browser input sanitization", () => {
  it("blocks executable and insecure production URLs", () => {
    assert.equal(isSafeUrl("javascript:alert(1)"), false);
    assert.equal(isSafeUrl("http://attacker.example/image.jpg"), false);
    assert.equal(sanitizeHref("data:text/html,<script>alert(1)</script>"), "#");
  });

  it("allows HTTPS, relative paths, and local HTTP development", () => {
    assert.equal(isSafeUrl("https://cdn.example/image.jpg"), true);
    assert.equal(isSafeUrl("/products/classic-frame"), true);
    assert.equal(isSafeUrl("http://localhost:5173/image.jpg"), true);
  });

  it("blocks SVG data URLs while allowing raster image data", () => {
    assert.equal(sanitizeImageSrc("data:image/svg+xml,<svg onload='alert(1)'/>"), "");
    assert.equal(sanitizeImageSrc("data:image/png;base64,AAAA"), "data:image/png;base64,AAAA");
  });

  it("escapes HTML-sensitive plain text", () => {
    assert.equal(
      sanitizeText(`<img src=x onerror="alert(1)">`),
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });
});
