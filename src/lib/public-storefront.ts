import type { InitialSupabaseData } from "./supabaseSync.ts";

export const PUBLIC_TESTIMONIAL_COLUMNS =
  "id,source,name,product_id,product_name,title,review,rating,avatar,verified,enabled,sort_order,created_at";
export const PUBLIC_SETTINGS_COLUMNS =
  "id,store_name,whatsapp,phone,email,address,hours,logo,low_stock_threshold,about_headline,about_body,updated_at";

// Apply at cache ingress and egress so old cached payloads cannot expose private data.
export function publicStorefrontData(data: InitialSupabaseData): InitialSupabaseData {
  return {
    products: data.products,
    categories: data.categories,
    collections: data.collections,
    heroSlides: data.heroSlides,
    brands: data.brands,
    socialReels: data.socialReels,
    faqs: data.faqs,
    announcement: data.announcement,
    video: data.video,
    orders: null,
    queries: null,
    subscribers: null,
    settings: data.settings
      ? {
          storeName: data.settings.storeName,
          logo: data.settings.logo,
          whatsapp: data.settings.whatsapp,
          email: data.settings.email,
          phone: data.settings.phone,
          address: data.settings.address,
          hours: data.settings.hours,
          lowStockThreshold: data.settings.lowStockThreshold,
          adminEmail: "",
          aboutHeadline: data.settings.aboutHeadline,
          aboutBody: data.settings.aboutBody,
        }
      : null,
    testimonials:
      data.testimonials?.map((review) => ({
        id: review.id,
        source: review.source ?? "manual",
        name: review.name,
        productId: review.productId ?? null,
        productName: review.productName ?? null,
        title: review.title ?? null,
        quote: review.quote,
        rating: review.rating,
        photo: review.photo ?? null,
        reviewImage: review.reviewImage ?? null,
        ...(review.createdAt !== undefined ? { createdAt: review.createdAt } : {}),
        verified: review.verified ?? false,
        sortOrder: review.sortOrder ?? 0,
      })) ?? null,
  };
}
