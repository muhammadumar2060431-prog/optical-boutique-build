import assert from "node:assert/strict";
import { it } from "node:test";
import { findLogoBounds } from "../src/lib/logo-padding.ts";

it("trims the empty background around a square logo without cropping its artwork", () => {
  const pixels = new Uint8ClampedArray(100 * 100 * 4).fill(230);
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
  for (let y = 35; y < 65; y++) {
    for (let x = 15; x < 85; x++) {
      pixels.set([0, 0, 0, 255], (y * 100 + x) * 4);
    }
  }
  assert.deepEqual(findLogoBounds(pixels, 100, 100), { x: 13, y: 33, width: 74, height: 34 });
});

it("supports transparent padding and leaves an empty image unchanged", () => {
  const pixels = new Uint8ClampedArray(20 * 20 * 4);
  assert.deepEqual(findLogoBounds(pixels, 20, 20), { x: 0, y: 0, width: 20, height: 20 });
  pixels.set([0, 0, 0, 255], (10 * 20 + 10) * 4);
  assert.deepEqual(findLogoBounds(pixels, 20, 20), { x: 8, y: 8, width: 5, height: 5 });
});
