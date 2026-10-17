/**
 * Resolves the mobile image source for a hero slide.
 * If a valid mobile image is provided, returns that;
 * otherwise gracefully falls back to the desktop image.
 */
export function resolveHeroMobileImage(
  mobileImage: string | null | undefined,
  desktopImage: string,
): { src: string; isMobileSpecific: boolean } {
  const trimmed = typeof mobileImage === "string" ? mobileImage.trim() : "";
  if (trimmed.length > 0) {
    return { src: trimmed, isMobileSpecific: true };
  }
  return { src: desktopImage, isMobileSpecific: false };
}
