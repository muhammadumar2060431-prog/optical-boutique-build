export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The image could not be loaded."));
    image.crossOrigin = "anonymous";
    image.src = url;
  });

/** Crop coordinates are supplied by react-easy-crop in source image pixels. */
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  limits = { maxWidth: 4096, maxHeight: 4096 },
): Promise<string> {
  const image = await createImage(imageSrc);
  const { x, y, width, height } = pixelCrop;
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    x < 0 ||
    y < 0 ||
    width < 1 ||
    height < 1 ||
    x + width > image.naturalWidth ||
    y + height > image.naturalHeight
  ) {
    throw new Error("The image crop is invalid.");
  }

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, limits.maxWidth / width, limits.maxHeight / height);
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, x, y, width, height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}
