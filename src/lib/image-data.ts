export function imageDataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const header = dataUrl.slice(0, comma);
  const match = /^data:(image\/(?:jpeg|png|webp|avif));base64$/i.exec(header);
  const mimeType = match?.[1];
  if (comma < 0 || !mimeType) {
    throw new Error("Use a JPG, PNG, WebP, or AVIF image.");
  }

  let decoded: string;
  try {
    decoded = atob(dataUrl.slice(comma + 1));
  } catch {
    throw new Error("The selected image data could not be decoded.");
  }

  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType.toLowerCase() });
}
