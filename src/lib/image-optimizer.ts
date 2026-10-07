import { imageDataUrlToBlob } from "./image-data.ts";

export interface ImageOptimizationOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  outputType?: "image/jpeg" | "image/png" | "image/webp";
  maxBytes?: number;
}

const DEFAULT_OUTPUT_TYPE = "image/webp";

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected file is not a decodable image."));
    image.src = source;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: ImageOptimizationOptions["outputType"],
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The browser could not encode the optimized image."));
      },
      type,
      quality,
    );
  });
}

export class ImageOptimizer {
  private readonly maxWidth: number;
  private readonly maxHeight: number;
  private readonly quality: number;
  private readonly outputType: NonNullable<ImageOptimizationOptions["outputType"]>;
  private readonly maxBytes: number;

  constructor(options: ImageOptimizationOptions) {
    this.maxWidth = Math.max(1, Math.round(options.maxWidth));
    this.maxHeight = Math.max(1, Math.round(options.maxHeight));
    this.quality = Math.min(1, Math.max(0.1, options.quality));
    this.outputType = options.outputType ?? DEFAULT_OUTPUT_TYPE;
    this.maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
  }

  async optimize(dataUrl: string): Promise<Blob> {
    const image = await loadImage(dataUrl);
    const scale = Math.min(1, this.maxWidth / image.width, this.maxHeight / image.height);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is not available in this browser.");

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);

    let quality = this.quality;
    let encoded = await canvasToBlob(canvas, this.outputType, quality);
    if (scale === 1 && dataUrl.startsWith("data:image/")) {
      const original = imageDataUrlToBlob(dataUrl);
      if (
        ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(original.type) &&
        original.size <= encoded.size &&
        original.size <= this.maxBytes
      ) {
        return original;
      }
    }
    while (encoded.size > this.maxBytes && quality > 0.45) {
      quality = Math.max(0.45, quality - 0.1);
      encoded = await canvasToBlob(canvas, this.outputType, quality);
    }
    // Reduce pixel count only after trying the quality budget; redraw from the source each time.
    for (let attempt = 0; encoded.size > this.maxBytes && attempt < 8; attempt++) {
      canvas.width = Math.max(1, Math.round(canvas.width * 0.8));
      canvas.height = Math.max(1, Math.round(canvas.height * 0.8));
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      encoded = await canvasToBlob(canvas, this.outputType, quality);
    }
    if (encoded.size > this.maxBytes) {
      throw new Error("The image could not fit the size limit. Use a smaller image.");
    }
    return encoded;
  }

  static toDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === "string"
          ? resolve(reader.result)
          : reject(new Error("The optimized image could not be read."));
      reader.onerror = () => reject(new Error("The optimized image could not be read."));
      reader.readAsDataURL(blob);
    });
  }
}
