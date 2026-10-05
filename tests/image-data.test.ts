import assert from "node:assert/strict";
import { it } from "node:test";
import { imageDataUrlToBlob } from "../src/lib/image-data.ts";

it("decodes local image bytes without a network request", async () => {
  const blob = imageDataUrlToBlob("data:image/png;base64,AP+A");
  assert.equal(blob.type, "image/png");
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), new Uint8Array([0, 255, 128]));
});

it("rejects unsupported or malformed image data", () => {
  for (const source of [
    "https://example.com/image.png",
    "data:text/html;base64,AAAA",
    "data:image/png;base64",
    "data:image/png;base64,!!!",
  ]) {
    assert.throws(() => imageDataUrlToBlob(source));
  }
});
