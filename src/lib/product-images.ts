import type { Product } from "./types";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Returns the canonical secondary product images.
 * Legacy database rows are normalized by mapDbProductToStore before reaching UI code.
 */
export function getProductSubImages(product: Product): string[] {
  const candidates =
    product.subImages.length > 0 ? product.subImages : (product.details.subImages ?? []);
  return candidates.filter(isNonEmptyString);
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
