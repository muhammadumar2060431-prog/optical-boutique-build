const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Extracts a cropped region from the source image with optional rotation and horizontal flip.
 *
 * NOTE: `pixelCrop` must come from react-easy-crop's `onCropComplete` callback,
 * which already accounts for the current zoom/pan position in the original image's coordinate space.
 */
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotation = 0,
  flipH = false,
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  const rotRad = getRadianAngle(rotation);

  // Compute the bounding box of the rotated image so nothing is clipped
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  // Set canvas to bounding box size
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Center → rotate → flip → draw
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flipH ? -1 : 1, 1);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0);

  // When the image is flipped via CSS (mediaStyle scaleX(-1)), react-easy-crop still
  // reports crop coords from the left edge of the *visual* image.
  // We need to mirror the x-coordinate for the canvas (which was drawn flipped).
  const cropX = flipH ? bBoxWidth - pixelCrop.x - pixelCrop.width : pixelCrop.x;

  // Extract the pixel data for the crop region
  const croppedData = ctx.getImageData(
    Math.round(cropX),
    Math.round(pixelCrop.y),
    Math.round(pixelCrop.width),
    Math.round(pixelCrop.height),
  );

  // Resize canvas to the final crop dimensions and paste
  canvas.width = Math.round(pixelCrop.width);
  canvas.height = Math.round(pixelCrop.height);
  ctx.putImageData(croppedData, 0, 0);

  return canvas.toDataURL("image/png");
}
