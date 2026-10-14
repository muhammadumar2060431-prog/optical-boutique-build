import type { Product } from "./types";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeImageList(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter(isNonEmptyString).map((src) => src.trim()))]
    : [];
}

export function resolveProductSubImages(primaryImage: string, ...sources: unknown[]): string[] {
  for (const source of sources) {
    const images = normalizeImageList(source).filter((src) => src !== primaryImage);
    if (images.length > 0) return images;
  }
  return [];
}

/**
 * Returns the canonical secondary product images.
 * Legacy database rows are normalized by mapDbProductToStore before reaching UI code.
 */
export function getProductSubImages(product: Product): string[] {
  return resolveProductSubImages(product.image, product.subImages, product.details?.subImages);
}

export function getProductGalleryImages(product: Product): string[] {
  return normalizeImageList([
    product.image,
    ...getProductSubImages(product),
    product.hoverImage,
    ...(product.variants ?? []).map((variant) => variant.image),
  ]).filter((src) => src !== "/placeholder.svg");
}

const SUPABASE_PUBLIC_OBJECT_PATH = "/storage/v1/object/public/";
const SUPABASE_PUBLIC_RENDER_PATH = "/storage/v1/render/image/public/";

/**
 * Uses Supabase's image renderer for public Storage images while leaving all
 * local and third-party image URLs untouched.
 */
export function getOptimizedSupabaseImageSrc(src: string, width: number, quality = 75): string {
  try {
    const url = new URL(src);
    const isSupabaseHost = url.hostname === "supabase.co" || url.hostname.endsWith(".supabase.co");

    if (!isSupabaseHost || !url.pathname.includes(SUPABASE_PUBLIC_OBJECT_PATH)) return src;
    // Supabase's renderer does not support AVIF inputs; serve those originals directly.
    if (/\.avif$/i.test(url.pathname)) return src;

    url.pathname = url.pathname.replace(SUPABASE_PUBLIC_OBJECT_PATH, SUPABASE_PUBLIC_RENDER_PATH);
    url.searchParams.set("width", String(Math.max(1, Math.round(width))));
    url.searchParams.set("quality", String(Math.min(100, Math.max(1, Math.round(quality)))));
    url.searchParams.set("resize", "contain");
    return url.toString();
  } catch {
    return src;
  }
}
