import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isSafeUrl,
  sanitizeDbInput,
  sanitizeHref,
  sanitizeImageSrc,
  sanitizeText,
  serializeJsonForHtml,
  validateSocialVideoUrl,
} from "../src/lib/security.ts";

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

  it("rejects ambiguous external paths, malformed URLs, and disguised hosts", () => {
    for (const url of [
      "//attacker.example",
      "/\\attacker.example",
      "https://",
      "https://trusted.example@attacker.example",
      "java\nscript:alert(1)",
    ]) {
      assert.equal(isSafeUrl(url), false, url);
    }
    assert.equal(sanitizeHref("#main-content"), "#main-content");
  });

  it("matches video CDN hostnames instead of query strings and lookalike domains", () => {
    assert.equal(
      validateSocialVideoUrl("https://attacker.example/?cdn=cloudinary.com").valid,
      false,
    );
    assert.equal(
      validateSocialVideoUrl("https://cloudinary.com.attacker.example/video").valid,
      false,
    );
    assert.equal(
      validateSocialVideoUrl("https://res.cloudinary.com/demo/video/upload/sample").valid,
      true,
    );
  });

  it("does not assign prototype-changing keys from submitted objects", () => {
    const result = sanitizeDbInput(JSON.parse('{"__proto__":{"polluted":true},"name":" Safe "}'));
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
    assert.equal(Object.hasOwn(result, "__proto__"), false);
    assert.equal(result.name, "Safe");
  });

  it("escapes script-closing text while preserving the JSON data", () => {
    const payload = { title: '</script><script>alert("xss")</script>' };
    const serialized = serializeJsonForHtml(payload);
    assert.equal(serialized.includes("<"), false);
    assert.deepEqual(JSON.parse(serialized), payload);
  });
});
