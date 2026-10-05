export interface ImageOptimizationOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  outputType?: "image/jpeg" | "image/png" | "image/webp";
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

  constructor(options: ImageOptimizationOptions) {
    this.maxWidth = Math.max(1, Math.round(options.maxWidth));
    this.maxHeight = Math.max(1, Math.round(options.maxHeight));
    this.quality = Math.min(1, Math.max(0.1, options.quality));
    this.outputType = options.outputType ?? DEFAULT_OUTPUT_TYPE;
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

    const encoded = await canvasToBlob(canvas, this.outputType, this.quality);
    if (scale === 1 && dataUrl.startsWith("data:image/")) {
      const original = await (await fetch(dataUrl)).blob();
      if (
        ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(original.type) &&
        original.size <= encoded.size
      ) {
        return original;
      }
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
