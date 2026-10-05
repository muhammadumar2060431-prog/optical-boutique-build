import assert from "node:assert/strict";
import { it } from "node:test";
import { getReelPreview } from "../src/lib/reel-preview.ts";

it("prefers custom thumbnails over the original reel preview", () => {
  assert.deepEqual(getReelPreview("https://www.instagram.com/reel/abc/", "/custom.webp"), {
    kind: "image",
    src: "/custom.webp",
  });
});

it("uses native reel previews when the custom thumbnail is empty", () => {
  assert.deepEqual(getReelPreview("https://www.instagram.com/reel/abc/?igsh=test", ""), {
    kind: "iframe",
    src: "https://www.instagram.com/reel/abc/embed/",
  });
  assert.deepEqual(getReelPreview("https://youtu.be/abcdefghijk", ""), {
    kind: "image",
    src: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
  });
  assert.deepEqual(getReelPreview("https://example.com/reel.mp4?token=test", ""), {
    kind: "video",
    src: "https://example.com/reel.mp4?token=test",
  });
});

it("does not embed unrecognized or unsafe sources", () => {
  assert.equal(getReelPreview("https://instagram.com.evil.test/reel/abc/", ""), null);
  assert.equal(getReelPreview("javascript:alert(1)", ""), null);
});
