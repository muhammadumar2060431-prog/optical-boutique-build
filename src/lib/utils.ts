import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDiscountPercent(price: number, salePrice?: number | null): number | null {
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    salePrice == null ||
    !Number.isFinite(salePrice) ||
    salePrice < 0 ||
    salePrice >= price
  ) {
    return null;
  }
  const percent = Math.round(((price - salePrice) / price) * 100);
  return percent > 0 ? percent : null;
}

const DEFAULT_SITE_URL = "https://www.nigah.store";

export function getSiteUrl(path: string = ""): string {
  const base =
    import.meta.env["VITE_SITE_URL"] ||
    (typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : DEFAULT_SITE_URL);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/$/, "")}${cleanPath}`;
}
