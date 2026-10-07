import assert from "node:assert/strict";
import { it } from "node:test";
import { ImageOptimizer } from "../src/lib/image-optimizer.ts";

it("preserves smaller original encodings without bypassing resize limits", async () => {
  const previousImage = globalThis.Image;
  const previousFetch = globalThis.fetch;
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  class FakeImage {
    width = 100;
    height = 50;
    onload: (() => void) | null = null;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: () => undefined }),
    toBlob: (callback: (blob: Blob) => void) =>
      callback(new Blob([new Uint8Array(200)], { type: "image/webp" })),
  };
  globalThis.Image = FakeImage as unknown as typeof Image;
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => canvas },
  });
  try {
    const source = "data:image/avif;base64,AAAA";
    const preserved = await new ImageOptimizer({
      maxWidth: 200,
      maxHeight: 200,
      quality: 0.7,
    }).optimize(source);
    assert.equal(preserved.type, "image/avif");
    assert.equal(preserved.size, 3);
    const resized = await new ImageOptimizer({
      maxWidth: 50,
      maxHeight: 50,
      quality: 0.7,
    }).optimize(source);
    assert.equal(resized.type, "image/webp");
    assert.equal(canvas.width, 50);
    assert.equal(canvas.height, 25);
  } finally {
    globalThis.Image = previousImage;
    globalThis.fetch = previousFetch;
    if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor);
    else Reflect.deleteProperty(globalThis, "document");
  }
});

it("enforces byte budgets even when the original fits the pixel bounds", async (t) => {
  const previousImage = globalThis.Image;
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  t.after(() => {
    globalThis.Image = previousImage;
    if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor);
    else Reflect.deleteProperty(globalThis, "document");
  });
  class FakeImage {
    width = 100;
    height = 100;
    onload: (() => void) | null = null;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: () => undefined }),
    toBlob: (callback: (blob: Blob) => void, _type: string, quality: number) =>
      callback(
        new Blob([new Uint8Array(Math.ceil(canvas.width * canvas.height * quality))], {
          type: "image/webp",
        }),
      ),
  };
  globalThis.Image = FakeImage as unknown as typeof Image;
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => canvas },
  });
  const source = `data:image/png;base64,${Buffer.alloc(5000).toString("base64")}`;
  const image = await new ImageOptimizer({
    maxWidth: 100,
    maxHeight: 100,
    quality: 0.8,
    maxBytes: 2000,
  }).optimize(source);
  assert.ok(image.size <= 2000);
  assert.ok(canvas.width < 100 && canvas.height < 100);
  assert.equal(canvas.width, canvas.height);
  await assert.rejects(
    new ImageOptimizer({ maxWidth: 100, maxHeight: 100, quality: 0.8, maxBytes: 1 }).optimize(
      source,
    ),
    /size limit/,
  );
});
