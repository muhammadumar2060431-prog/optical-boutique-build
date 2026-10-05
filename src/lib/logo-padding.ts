export function findLogoBounds(pixels: Uint8ClampedArray, width: number, height: number) {
  const full = { x: 0, y: 0, width, height };
  const background = Array.from(pixels.slice(0, 4));
  const transparent = (background[3] ?? 0) < 16;
  const isBackground = (offset: number) => {
    if (transparent) return (pixels[offset + 3] ?? 0) < 16;
    return background.every(
      (channel, index) => Math.abs((pixels[offset + index] ?? 0) - channel) <= 24,
    );
  };

  // Only trim a uniform outer background, not a framed or multicolored image.
  if (![4 * (width - 1), 4 * width * (height - 1), 4 * (width * height - 1)].every(isBackground)) {
    return full;
  }

  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isBackground((y * width + x) * 4)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return full;

  const padding = Math.max(2, Math.round(Math.min(width, height) * 0.02));
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding);
  bottom = Math.min(height - 1, bottom + padding);
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export function trimLogoPadding(source: string): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onerror = () => resolve(source);
    image.onload = () => {
      try {
        const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) return resolve(source);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const bounds = findLogoBounds(pixels, canvas.width, canvas.height);
        if (bounds.width === canvas.width && bounds.height === canvas.height)
          return resolve(source);

        const cropped = document.createElement("canvas");
        cropped.width = bounds.width;
        cropped.height = bounds.height;
        const croppedContext = cropped.getContext("2d");
        if (!croppedContext) return resolve(source);
        croppedContext.drawImage(
          canvas,
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height,
          0,
          0,
          bounds.width,
          bounds.height,
        );
        resolve(cropped.toDataURL("image/png"));
      } catch {
        // External hosts may prohibit pixel access; retain the original logo.
        resolve(source);
      }
    };
    image.src = source;
  });
}
