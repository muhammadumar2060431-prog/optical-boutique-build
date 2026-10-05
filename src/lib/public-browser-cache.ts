import { publicStorefrontData } from "./public-storefront.ts";
import type { StoreSettings, Testimonial } from "./types.ts";

export function publicBrowserCache(key: string, value: unknown): unknown {
  if (["orders", "queries", "subscribers"].includes(key)) return undefined;
  if (key === "products" && Array.isArray(value)) {
    return value.filter((product) => product?.status === "Published");
  }
  if (key === "heroSlides" && Array.isArray(value)) {
    return value.filter((slide) => slide?.enabled === true);
  }
  if (key !== "settings" && key !== "testimonials") return value;
  const projection = publicStorefrontData({
    products: null,
    categories: null,
    collections: null,
    heroSlides: null,
    brands: null,
    socialReels: null,
    faqs: null,
    announcement: null,
    video: null,
    orders: null,
    queries: null,
    subscribers: null,
    settings: key === "settings" ? (value as StoreSettings) : null,
    testimonials: key === "testimonials" ? (value as Testimonial[]) : null,
  });
  return key === "settings" ? projection.settings : projection.testimonials;
}
