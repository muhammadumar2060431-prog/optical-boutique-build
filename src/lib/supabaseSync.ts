/* eslint-disable @typescript-eslint/no-explicit-any, no-empty -- Legacy Supabase schema variants are normalized at this boundary. */
import { supabase } from "./supabase";
import { deleteDatabaseRecord, requireDatabaseAdmin } from "./database-delete.ts";
import { createMutationQueue } from "./mutation-queue.ts";
import {
  publicStorefrontData,
  PUBLIC_SETTINGS_COLUMNS,
  PUBLIC_TESTIMONIAL_COLUMNS,
} from "./public-storefront.ts";
import type { MetaEventInput } from "./meta-events.types";
import { escapePostgrestFilter, sanitizeDbInput } from "./security";
import type {
  AnnouncementSettings,
  Brand,
  Category,
  Collection,
  ContactQuery,
  FAQItem,
  HeroSlide,
  Order,
  OrderSource,
  OrderStatus,
  Product,
  SocialReel,
  StoreSettings,
  Subscriber,
  Testimonial,
  VideoSettings,
} from "./types";

// -- Database Schema Mappers (Frontend Store <-> Supabase DB) --

// -- Supabase Storage Image Upload ------------------------------------------
const STORAGE_BUCKET = "optique-images";
const MAX_STORAGE_IMAGE_BYTES = 5 * 1024 * 1024;
const STORAGE_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function imageExtension(mimeType: string): string {
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("avif")) return "avif";
  return "jpg";
}

function sanitizeStorageFolder(folder: string): string {
  const cleanFolder = folder
    .split("/")
    .map((part) => part.replace(/[^A-Za-z0-9_-]/g, ""))
    .filter(Boolean)
    .join("/");
  return cleanFolder || "uploads";
}

function createStorageId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("Secure random number generation is unavailable in this browser.");
}

/**
 * Uploads an optimized image to the pre-provisioned public storage bucket.
 * Bucket creation belongs in database migrations, not in the browser.
 */
export async function uploadImageToStorage(
  image: Blob | string,
  folder = "products",
  options: { throwOnError?: boolean } = {},
): Promise<string | null> {
  if (typeof image === "string" && !image.startsWith("data:image/")) return null;

  try {
    const blob = typeof image === "string" ? await (await fetch(image)).blob() : image;
    if (!STORAGE_IMAGE_MIME_TYPES.has(blob.type)) {
      throw new Error("Use a JPG, PNG, WebP, or AVIF image.");
    }
    if (blob.size > MAX_STORAGE_IMAGE_BYTES) {
      throw new Error("The processed image exceeds the 5 MB storage limit.");
    }

    if (options.throwOnError) {
      const { data: auth, error: authError } = await supabase.auth.getSession();
      if (authError || !auth.session) {
        throw new Error("Your admin session has expired. Sign in again and retry the upload.");
      }
    }

    const extension = imageExtension(blob.type);
    const fileName = `${sanitizeStorageFolder(folder)}/${createStorageId()}.${extension}`;
    const storage = supabase.storage.from(STORAGE_BUCKET);
    let { data, error } = await storage.upload(fileName, blob, {
      upsert: false,
      contentType: blob.type,
      cacheControl: "31536000",
    });

    if (options.throwOnError && error && Number(error.status) === 401) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        ({ data, error } = await storage.upload(fileName, blob, {
          upsert: false,
          contentType: blob.type,
          cacheControl: "31536000",
        }));
      }
    }

    if (error) {
      const status = Number(error.status);
      if (status === 401 || status === 403) {
        throw new Error(
          "Storage denied this upload (" +
            status +
            "). Sign in again; if it persists, check the Nigah images upload policy.",
        );
      }
      throw new Error(
        "Storage upload failed" + (status ? " (" + status + ")" : "") + ": " + error.message,
      );
    }
    if (!data) throw new Error("Storage did not return an uploaded image path.");

    return storage.getPublicUrl(data.path).data.publicUrl;
  } catch (error) {
    console.warn("[uploadImageToStorage] Exception:", error);
    if (options.throwOnError) throw error;
    return null;
  }
}
// ----------------------------------------------------------------------------

// Supabase PostgREST caches old table shapes; retry with legacy payloads when a column is missing.
function isMissingColumnError(error: any, column: string) {
  const message = String(error?.message || error || "");
  return error?.code === "PGRST204" && message.includes(`'${column}' column`);
}
function mapStoreProductToDb(product: Product): any {
  const subImages = (
    Array.isArray(product.subImages) && product.subImages.length > 0
      ? product.subImages
      : Array.isArray((product.details as any)?.subImages)
        ? (product.details as any).subImages
        : []
  ).filter((s: any) => s && typeof s === "string" && s.trim().length > 0);

  // images[] column: primary image + all sub images
  const images = [product.image, ...subImages].filter(
    (img) => img && typeof img === "string" && img.trim().length > 0,
  );

  // Merge existing details with subImages so the JSONB column always has them
  const existingDetails =
    typeof product.details === "object" && product.details !== null
      ? (product.details as Record<string, any>)
      : {};

  return {
    id: product.id,
    name: product.name || "Untitled Product",
    slug: product.slug || product.id,
    sku: product.sku || null,
    price: Math.round(Math.max(0, Number(product.price) || 0)),
    compare_at:
      product.salePrice && Number(product.salePrice) > 0
        ? Math.round(Number(product.salePrice))
        : null,
    category_id: product.categoryId || null,
    collection_ids: product.collectionId ? [product.collectionId] : [],
    images: images.length > 0 ? images : ["/placeholder.svg"],
    hover_image: product.hoverImage || null,
    new_arrival_image: (product as any).newArrivalImage || null,
    is_new_arrival: !!(product as any).isNewArrival,
    is_bestseller: !!(product as any).isBestseller,
    featured: !!product.featured,
    description: product.description || "",
    frame_fit: product.details?.material || product.details?.frameMaterial || null,
    // CRITICAL: details JSONB must always include subImages array
    details: {
      ...existingDetails,
      subImages,
    },
    variants: Array.isArray(product.variants) ? product.variants : [],
    stock: Math.max(0, Math.round(Number(product.stock) || 0)),
    enabled: product.status !== "Draft",
    created_at: product.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function mapDbProductToStore(raw: any): Product {
  const images: string[] =
    Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : raw.image ? [raw.image] : [];

  // Primary image is images[0]; hover may be stored separately in hover_image column
  const primaryImage = images[0] || "/placeholder.svg";
  const hoverFromDb = raw.hover_image || null;

  let rawDetails = raw.details;
  if (typeof rawDetails === "string") {
    try {
      rawDetails = JSON.parse(rawDetails);
    } catch {}
  }

  // subImages = all gallery angles
  const rawSubImages = rawDetails?.subImages ?? raw.subImages ?? raw.sub_images;
  const subImages: string[] = Array.isArray(rawSubImages)
    ? rawSubImages.filter((s: any) => typeof s === "string" && s.trim().length > 0)
    : images.length > 1
      ? images.slice(1)
      : [];

  return {
    id: raw.id,
    name: raw.name || "Product",
    slug: raw.slug || raw.id,
    sku: raw.sku || null,
    price: Number(raw.price) || 0,
    salePrice: raw.compare_at
      ? Number(raw.compare_at)
      : raw.salePrice
        ? Number(raw.salePrice)
        : null,
    categoryId: raw.category_id !== undefined ? raw.category_id || "" : raw.categoryId || "",
    collectionId: Array.isArray(raw.collection_ids)
      ? raw.collection_ids[0] || null
      : raw.collectionId || null,
    image: primaryImage,
    hoverImage: hoverFromDb || null,
    subImages,
    description: raw.description || "",
    stock: Number(raw.stock) || 0,
    variants: Array.isArray(raw.variants) ? raw.variants : [],
    details: {
      ...(typeof rawDetails === "object" && rawDetails !== null ? rawDetails : {}),
      material: rawDetails?.material || raw.frame_fit || "Acetate / Stainless Steel",
      lensInfo: rawDetails?.lensInfo || "UV400 Polarized",
      care: rawDetails?.care || "Clean with microfiber cloth provided",
      subImages,
    },
    // Extended fields stored in DB
    ...(raw.new_arrival_image != null ? { newArrivalImage: raw.new_arrival_image } : {}),
    ...(raw.is_new_arrival != null ? { isNewArrival: Boolean(raw.is_new_arrival) } : {}),
    ...(raw.is_bestseller != null ? { isBestseller: Boolean(raw.is_bestseller) } : {}),
    featured: Boolean(raw.featured != null ? raw.featured : raw.is_bestseller),
    status: raw.enabled === false ? "Draft" : raw.status || "Published",
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
  } as Product;
}

function mapStoreCategoryToDb(category: Category, index?: number): any {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    image: category.image || null,
    banner: category.banner || null,
    sort_order: index ?? category.sortOrder ?? 0,
  };
}

export function mapDbCategoryToStore(raw: any): Category {
  return {
    id: raw.id,
    name: raw.name || "Category",
    slug: raw.slug || raw.id,
    image: raw.image || null,
    banner: raw.banner || null,
    sortOrder: Number(raw.sort_order ?? raw.sortOrder ?? 0),
  };
}

function mapStoreCollectionToDb(collection: Collection): any {
  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    category_id: collection.categoryId || null,
    banner: collection.banner || null,
    description: collection.description || "",
    show_in_nav: collection.showInNav ?? true,
    sort_order: collection.sortOrder ?? 0,
  };
}

export function mapDbCollectionToStore(raw: any): Collection {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    categoryId: raw.category_id || raw.categoryId || "",
    banner: raw.banner || null,
    sortOrder: raw.sort_order ?? raw.sortOrder ?? 0,
    showInNav: raw.show_in_nav ?? raw.showInNav ?? true,
    description: raw.description || "",
  };
}

function mapStoreHeroSlideToDb(slide: HeroSlide, index?: number): any {
  return {
    id: slide.id,
    // DB columns: headline, subtext (matching schema)
    headline: slide.headline || "",
    subtext: slide.subtext || "",
    image: slide.image || "",
    cta_text: slide.ctaText || "",
    cta_link: slide.ctaLink || "",
    eyebrow: slide.eyebrow || "",
    enabled: slide.enabled ?? true,
    sort_order: index ?? slide.sortOrder ?? 0,
  };
}

export function mapDbHeroSlideToStore(raw: any): HeroSlide {
  return {
    id: raw.id,
    headline: raw.headline || raw.title || "",
    subtext: raw.subtext || raw.subtitle || "",
    image: raw.image || "",
    ctaText: raw.cta_text || raw.button_text || raw.ctaText || "",
    ctaLink: raw.cta_link || raw.link || raw.ctaLink || "",
    eyebrow: raw.eyebrow || "",
    enabled: raw.enabled ?? true,
    sortOrder: raw.sort_order ?? raw.sortOrder ?? 0,
  };
}

function mapStoreBrandToDb(brand: Brand): any {
  return {
    id: brand.id,
    name: brand.name,
    logo: brand.logo || "",
    enabled: brand.enabled ?? true,
    sort_order: brand.sortOrder ?? 0,
  };
}

export function mapDbBrandToStore(raw: any): Brand {
  return {
    id: raw.id,
    name: raw.name,
    logo: raw.logo || "",
    enabled: raw.enabled ?? true,
    sortOrder: raw.sort_order ?? raw.sortOrder ?? 0,
  };
}

function mapStoreSocialReelToDb(reel: SocialReel): any {
  return {
    id: reel.id,
    title: reel.title || "Reel",
    video_url: reel.videoUrl || "",
    platform: reel.platform || "instagram",
    // All fields needed for product page filtering and display
    thumbnail: reel.thumbnail || "",
    creator_name: reel.creatorName || "",
    creator_handle: reel.creatorHandle || "",
    duration: reel.duration || "00:30",
    product_id: reel.productId || null,
    enabled: reel.enabled ?? true,
    sort_order: reel.sortOrder ?? 0,
  };
}

export function mapDbSocialReelToStore(raw: any): SocialReel {
  return {
    id: raw.id,
    title: raw.title,
    videoUrl: raw.video_url || raw.videoUrl || "",
    platform: raw.platform || "instagram",
    thumbnail: raw.thumbnail || "",
    creatorName: raw.creator_name || raw.creatorName || "",
    creatorHandle: raw.creator_handle || raw.creatorHandle || "",
    duration: raw.duration || "00:30",
    // Support both snake_case (from DB) and camelCase (from seed/local)
    productId: raw.product_id || raw.productId || null,
    enabled: raw.enabled ?? true,
    sortOrder: raw.sort_order ?? raw.sortOrder ?? 0,
  };
}

function mapStoreTestimonialToDb(t: Testimonial): any {
  const img = t.reviewImage || t.photo || "";
  return {
    id: t.id,
    source: t.source || "manual",
    name: t.name,
    review: t.quote || "",
    rating: t.rating || 5,
    avatar: img,
    verified: t.verified ?? true,
    // Product association fields - saved so product pages filter correctly
    ...(t.email !== undefined ? { email: t.email } : {}),
    product_id: t.productId || null,
    product_name: t.productName || null,
    title: t.title || null,
    created_at: t.createdAt || new Date().toISOString(),
    enabled: true,
    sort_order: t.sortOrder ?? 0,
  };
}

export function mapDbTestimonialToStore(raw: any): Testimonial {
  const img = raw.review_image || raw.reviewImage || raw.avatar || raw.photo || null;
  return {
    id: raw.id,
    source:
      raw.source === "customer" || String(raw.id || "").startsWith("review-")
        ? "customer"
        : "manual",
    // Support both 'name' and legacy 'author' column names
    name: raw.name || raw.author || "Customer",
    // Support both 'review'/'text' and 'quote' column names
    quote: raw.review || raw.text || raw.quote || "",
    rating: raw.rating || 5,
    photo: img,
    reviewImage: img,
    verified: raw.verified ?? true,
    email: raw.email || null,
    // Support both snake_case (from DB) and camelCase (from seed)
    productId: raw.product_id || raw.productId || null,
    productName: raw.product_name || raw.productName || null,
    title: raw.title || null,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    sortOrder: raw.sort_order ?? raw.sortOrder ?? 0,
  };
}

function mapStoreFaqToDb(f: FAQItem): any {
  return {
    id: f.id,
    question: f.question,
    answer: f.answer,
    category: f.category || "General",
    enabled: f.enabled ?? true,
    show_on_home: f.showOnHome ?? false,
    sort_order: f.sortOrder ?? 0,
  };
}

export function mapDbFaqToStore(raw: any): FAQItem {
  return {
    id: raw.id,
    question: raw.question,
    answer: raw.answer,
    category: raw.category || "General",
    enabled: raw.enabled ?? true,
    showOnHome: raw.show_on_home ?? raw.showOnHome ?? false,
    sortOrder: raw.sort_order ?? raw.sortOrder ?? 0,
  };
}

function mapStoreQueryToDb(q: ContactQuery): any {
  return {
    id: q.id,
    name: q.name,
    contact: q.contact,
    product_name: q.productName,
    product_id: q.productId || null,
    message: q.message,
    status: q.status || "New",
    created_at: q.createdAt || new Date().toISOString(),
  };
}

export function mapDbQueryToStore(raw: any): ContactQuery {
  return {
    id: raw.id,
    name: raw.name || raw.customer_name || raw.customerName || "User",
    contact: raw.contact || raw.phone || "",
    productName:
      raw.product_name || raw.productName || raw.items?.[0]?.productName || "General enquiry",
    productId: raw.product_id || raw.productId || raw.items?.[0]?.productId || null,
    message: raw.message || raw.address || "",
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    status: (raw.status || "New") as "New" | "Responded" | "Archived",
  };
}

type InitialSupabaseDataOptions = {
  includePrivate?: boolean;
  bypassStorefrontApi?: boolean;
};

export type InitialSupabaseData = {
  products: Product[] | null;
  categories: Category[] | null;
  collections: Collection[] | null;
  orders: Order[] | null;
  queries: ContactQuery[] | null;
  heroSlides: HeroSlide[] | null;
  brands: Brand[] | null;
  socialReels: SocialReel[] | null;
  testimonials: Testimonial[] | null;
  faqs: FAQItem[] | null;
  subscribers: Subscriber[] | null;
  settings: StoreSettings | null;
  announcement: AnnouncementSettings | null;
  video: VideoSettings | null;
};

/**
 * Fetch all storefront data from Supabase.
 */
async function fetchPrivateTestimonials() {
  await requireDatabaseAdmin(supabase);
  const result = await supabase.rpc("admin_testimonials_v1");
  if (result.error?.code === "PGRST202" || result.error?.code === "42883") {
    return supabase.from("testimonials").select("*").order("sort_order", { ascending: true });
  }
  return result;
}

async function fetchPrivateSettings() {
  await requireDatabaseAdmin(supabase);
  const result = await supabase.rpc("admin_store_settings_v1").maybeSingle();
  if (result.error?.code === "PGRST202" || result.error?.code === "42883") {
    return supabase.from("store_settings").select("*").eq("id", "default").single();
  }
  return result;
}

export async function fetchInitialSupabaseData(
  options: InitialSupabaseDataOptions = {},
): Promise<InitialSupabaseData | null> {
  const includePrivate = options.includePrivate === true;

  if (!includePrivate && !options.bypassStorefrontApi && typeof window !== "undefined") {
    try {
      const response = await fetch("/api/v1/storefront", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: InitialSupabaseData | null;
      } | null;
      if (response.ok && payload?.data) return publicStorefrontData(payload.data);
    } catch {}
  }

  try {
    const [
      productsRes,
      categoriesRes,
      collectionsRes,
      ordersRes,
      queriesRes,
      heroRes,
      brandsRes,
      reelsRes,
      testimonialsRes,
      faqsRes,
      subscribersRes,
      settingsRes,
      announcementRes,
      videoRes,
    ] = await Promise.allSettled([
      supabase.from("products").select("*"),
      supabase.from("categories").select("*").order("sort_order", { ascending: true }),
      supabase.from("collections").select("*").order("sort_order", { ascending: true }),
      includePrivate
        ? supabase
            .from("orders")
            .select("*")
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: null, error: null }),
      includePrivate
        ? supabase
            .from("queries")
            .select("*")
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: null, error: null }),
      supabase.from("hero_slides").select("*").order("sort_order", { ascending: true }),
      supabase.from("brands").select("*").order("sort_order", { ascending: true }),
      supabase.from("social_reels").select("*").order("sort_order", { ascending: true }),
      includePrivate
        ? fetchPrivateTestimonials()
        : supabase
            .from("testimonials")
            .select(PUBLIC_TESTIMONIAL_COLUMNS)
            .order("sort_order", { ascending: true }),
      supabase.from("faqs").select("*").order("sort_order", { ascending: true }),
      includePrivate
        ? supabase.from("subscribers").select("*").order("created_at", { ascending: false })
        : Promise.resolve({ data: null, error: null }),
      includePrivate
        ? fetchPrivateSettings()
        : supabase
            .from("store_settings")
            .select(PUBLIC_SETTINGS_COLUMNS)
            .eq("id", "default")
            .single(),
      supabase.from("announcements").select("*").eq("id", "default").single(),
      supabase.from("video_settings").select("*").eq("id", "default").single(),
    ]);

    const settingsRaw = settingsRes.status === "fulfilled" ? (settingsRes.value.data as any) : null;
    const settings: StoreSettings | null = settingsRaw
      ? {
          storeName: settingsRaw.store_name || settingsRaw.storeName || "Nigah",
          whatsapp: settingsRaw.whatsapp || "",
          phone: settingsRaw.phone || "",
          email: settingsRaw.email || "",
          address: settingsRaw.address || "",
          hours: settingsRaw.hours || "",
          logo: settingsRaw.logo || null,
          lowStockThreshold: settingsRaw.low_stock_threshold || settingsRaw.lowStockThreshold || 3,
          adminEmail: includePrivate ? settingsRaw.admin_email || settingsRaw.adminEmail || "" : "",
          aboutHeadline: settingsRaw.about_headline || settingsRaw.aboutHeadline || "",
          aboutBody: settingsRaw.about_body || settingsRaw.aboutBody || "",
        }
      : null;

    const announcementRaw =
      announcementRes.status === "fulfilled" ? (announcementRes.value.data as any) : null;
    const announcement: AnnouncementSettings | null = announcementRaw
      ? {
          enabled: announcementRaw.enabled ?? announcementRaw.active ?? true,
          // Support both old single-text and new messages-array column
          messages:
            Array.isArray(announcementRaw.messages) && announcementRaw.messages.length > 0
              ? announcementRaw.messages
              : announcementRaw.text
                ? String(announcementRaw.text)
                    .split("\n")
                    .filter((message) => message.trim().length > 0)
                : announcementRaw.message
                  ? String(announcementRaw.message)
                      .split("\n")
                      .filter((message) => message.trim().length > 0)
                  : ["Complimentary delivery"],
          background: announcementRaw.background || announcementRaw.bg_color || "#000000",
          textColor: announcementRaw.text_color || announcementRaw.textColor || "#ffffff",
        }
      : null;

    const videoRaw = videoRes.status === "fulfilled" ? (videoRes.value.data as any) : null;
    const video: VideoSettings | null = videoRaw
      ? {
          lockedChannel: videoRaw.lockedChannel || videoRaw.locked_channel || "",
          videoUrl: videoRaw.video_url || videoRaw.url || videoRaw.videoUrl || "",
          videoId: videoRaw.videoId || videoRaw.video_id || null,
          caption: videoRaw.caption || videoRaw.title || "",
        }
      : null;

    const heroSlides: HeroSlide[] | null =
      heroRes.status === "fulfilled" && heroRes.value.data
        ? (heroRes.value.data as any[]).map(mapDbHeroSlideToStore)
        : null;

    const brands: Brand[] | null =
      brandsRes.status === "fulfilled" && brandsRes.value.data
        ? (brandsRes.value.data as any[]).map(mapDbBrandToStore)
        : null;

    const testimonials: Testimonial[] | null =
      testimonialsRes.status === "fulfilled" && testimonialsRes.value.data
        ? (testimonialsRes.value.data as any[]).map(mapDbTestimonialToStore)
        : null;

    const socialReels: SocialReel[] | null =
      reelsRes.status === "fulfilled" && reelsRes.value.data
        ? (reelsRes.value.data as any[]).map(mapDbSocialReelToStore)
        : null;

    const faqs: FAQItem[] | null =
      faqsRes.status === "fulfilled" && faqsRes.value.data
        ? (faqsRes.value.data as any[]).map(mapDbFaqToStore)
        : null;

    // All orders raw data
    const allOrdersRaw =
      ordersRes.status === "fulfilled" && ordersRes.value.data
        ? (ordersRes.value.data as any[])
        : [];

    // Filter out form submissions from orders section (only checkout and whatsapp allowed in orders)
    const orders: Order[] | null =
      ordersRes.status === "fulfilled" && ordersRes.value.data
        ? allOrdersRaw
            .filter((o) => {
              // source can be at top-level OR inside items array
              const src = o.source || o.items?.[0]?.source || "";
              return src !== "form";
            })
            .map((o) => ({
              id: o.id,
              reference:
                o.reference ||
                o.items?.[0]?.reference ||
                (o.id ? `OPT-${String(o.id).slice(0, 6).toUpperCase()}` : "OPT-ORDER"),
              createdAt: o.createdAt || o.created_at || new Date().toISOString(),
              customerName: o.customerName || o.customer_name || "Customer",
              contact: o.contact || o.phone || "",
              productId: o.productId || o.items?.[0]?.productId || null,
              productName: o.productName || o.items?.[0]?.productName || "Glasses",
              variantId: o.variantId || o.items?.[0]?.variantId || null,
              variantLabel: o.variantLabel || o.items?.[0]?.variantLabel || null,
              message: o.message || o.address || "",
              // read source from top-level first, then items array, fallback to productName check or cart
              source: (o.source ||
                o.items?.[0]?.source ||
                ((o.productName || o.items?.[0]?.productName || "")
                  .toLowerCase()
                  .includes("whatsapp")
                  ? "whatsapp"
                  : "cart")) as OrderSource,
              status: (o.status
                ? o.status.charAt(0).toUpperCase() + o.status.slice(1).toLowerCase()
                : "New") as OrderStatus,
              stockDeducted: o.stock_deducted ?? o.stockDeducted ?? false,
              courierName: o.courier_name || o.courierName || o.items?.[0]?.courierName || null,
              trackingNumber:
                o.tracking_number || o.trackingNumber || o.items?.[0]?.trackingNumber || null,
              dispatchedAt: o.dispatched_at || o.dispatchedAt || null,
            }))
        : null;

    // Collect queries from dedicated table AND form-source orders table entries
    const queriesFromTable: ContactQuery[] =
      queriesRes.status === "fulfilled" && queriesRes.value.data
        ? (queriesRes.value.data as any[]).map(mapDbQueryToStore)
        : [];

    const queriesFromOrders: ContactQuery[] = allOrdersRaw
      .filter((o) => {
        const src = o.source || o.items?.[0]?.source || "";
        return src === "form";
      })
      .map(mapDbQueryToStore);

    const queryMap = new Map<string, ContactQuery>();
    [...queriesFromOrders, ...queriesFromTable].forEach((q) => queryMap.set(q.id, q));
    const queries: ContactQuery[] = Array.from(queryMap.values());

    const products: Product[] | null =
      productsRes.status === "fulfilled" && productsRes.value.data
        ? (productsRes.value.data as any[]).map(mapDbProductToStore)
        : null;

    const collections: Collection[] | null =
      collectionsRes.status === "fulfilled" && collectionsRes.value.data
        ? (collectionsRes.value.data as any[]).map(mapDbCollectionToStore)
        : null;

    const categories: Category[] | null =
      categoriesRes.status === "fulfilled" && categoriesRes.value.data
        ? (categoriesRes.value.data as any[]).map(mapDbCategoryToStore)
        : null;

    const subscribers: Subscriber[] | null =
      subscribersRes.status === "fulfilled" && subscribersRes.value.data
        ? (subscribersRes.value.data as Subscriber[])
        : null;

    const result: InitialSupabaseData = {
      products,
      categories,
      collections,
      orders,
      queries,
      heroSlides,
      brands,
      socialReels,
      testimonials,
      faqs,
      subscribers,
      settings,
      announcement,
      video,
    };
    return includePrivate ? result : publicStorefrontData(result);
  } catch {
    return null;
  }
}

/**
 * Automatically seed individual Supabase tables if they are empty on initial run.
 */
async function uploadProductImageData(product: Product): Promise<Product> {
  const uploadIfNeeded = async (image: string | null | undefined): Promise<string | null> => {
    if (!image) return null;
    if (!image.startsWith("data:image/")) return image;
    return requireStoredImage(image, "products");
  };

  const sourceSubImages = Array.isArray(product.subImages) ? product.subImages : [];
  const sourceVariants = Array.isArray(product.variants) ? product.variants : [];
  const [image, hoverImage, subImages, newArrivalImage, variants] = await Promise.all([
    uploadIfNeeded(product.image),
    uploadIfNeeded(product.hoverImage),
    Promise.all(sourceSubImages.map((subImage) => uploadIfNeeded(subImage))),
    uploadIfNeeded(product.newArrivalImage),
    Promise.all(
      sourceVariants.map(async (variant) => ({
        ...variant,
        image: (await uploadIfNeeded(variant.image)) ?? variant.image,
      })),
    ),
  ]);

  const normalizedSubImages = subImages.filter((value): value is string => Boolean(value));
  const changed =
    image !== product.image ||
    hoverImage !== (product.hoverImage ?? null) ||
    newArrivalImage !== (product.newArrivalImage ?? null) ||
    variants.some((variant, index) => variant.image !== sourceVariants[index]?.image) ||
    normalizedSubImages.some((value, index) => value !== sourceSubImages[index]);

  return changed
    ? {
        ...product,
        image: image ?? product.image,
        hoverImage,
        subImages: normalizedSubImages,
        newArrivalImage,
        variants,
      }
    : product;
}

const productMutations = createMutationQueue();
const deletedProductIds = new Set<string>();

export function markProductDeleted(id: string) {
  deletedProductIds.add(id);
}

export function dbUpsertProduct(product: Product) {
  return productMutations(product.id, () => upsertProduct(product));
}

async function upsertProduct(product: Product) {
  if (deletedProductIds.has(product.id)) {
    return { success: false, error: new Error("This product was deleted. Refresh before saving.") };
  }
  try {
    const storedProduct = await uploadProductImageData(product);
    const payload = sanitizeDbInput(mapStoreProductToDb(storedProduct));
    const { error } = await supabase.from("products").upsert(payload);

    if (error) {
      console.error("[dbUpsertProduct] Upsert failed:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("[dbUpsertProduct] Exception:", error);
    return { success: false, error };
  }
}
export async function dbDeleteProduct(id: string) {
  return productMutations(id, async () => {
    const deleted = await deleteDatabaseRecord(supabase, "products", id);
    if (deleted) markProductDeleted(id);
    return deleted;
  });
}

async function requireStoredImage(image: string, folder: string): Promise<string> {
  const url = await uploadImageToStorage(image, folder, { throwOnError: true });
  if (!url) throw new Error("The image could not be saved to Storage.");
  return url;
}

export async function dbUpsertCategory(category: Category) {
  try {
    let image = category.image ?? null;
    const banner = category.banner ? { ...category.banner } : null;
    if (image && image.startsWith("data:")) {
      image = await requireStoredImage(image, "categories");
    }
    if (banner?.image && banner.image.startsWith("data:")) {
      banner.image = await requireStoredImage(banner.image, "categories");
    }
    const payload = sanitizeDbInput(mapStoreCategoryToDb({ ...category, image, banner }));
    const { error } = await supabase.from("categories").upsert(payload);
    if (error) throw error;
  } catch (e) {
    console.error("Failed to sync category to Supabase:", e);
  }
}

export async function dbDeleteCategory(id: string) {
  return deleteDatabaseRecord(supabase, "categories", id);
}

export async function dbUpsertCollection(collection: Collection) {
  try {
    const banner = collection.banner ? { ...collection.banner } : null;
    if (banner?.image && banner.image.startsWith("data:")) {
      banner.image = await requireStoredImage(banner.image, "collections");
    }
    const payload = sanitizeDbInput(mapStoreCollectionToDb({ ...collection, banner }));
    const { error } = await supabase.from("collections").upsert(payload);
    if (error) throw error;
  } catch (e) {
    console.error("Failed to sync collection to Supabase:", e);
  }
}

export async function dbDeleteCollection(id: string) {
  return deleteDatabaseRecord(supabase, "collections", id);
}

async function postOrdersToApi(
  orders: Order[],
  idempotencyKey: string,
  metaEvent?: MetaEventInput,
): Promise<boolean> {
  if (orders.length === 0) return false;
  try {
    const response = await fetch("/api/v1/orders", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ orders, ...(metaEvent ? { metaEvent } : {}) }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function dbInsertOrder(order: Order, metaEvent?: MetaEventInput): Promise<boolean> {
  return postOrdersToApi([order], `order:${order.reference}`, metaEvent);
}

export async function dbInsertOrders(
  orders: Order[],
  idempotencyKey = `checkout:${orders[0]?.reference ?? "invalid"}`,
  metaEvent?: MetaEventInput,
): Promise<boolean> {
  return postOrdersToApi(orders, idempotencyKey, metaEvent);
}
async function patchOrderViaApi(orderId: string, payload: Record<string, unknown>) {
  try {
    const cleanOrderId = escapePostgrestFilter(orderId);
    if (!cleanOrderId) return false;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;

    const response = await fetch(`/api/v1/orders/${encodeURIComponent(cleanOrderId)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function dbUpdateOrderStatus(
  orderId: string,
  status: string,
  stockDeducted: boolean,
  extra?: {
    courierName?: string | null;
    trackingNumber?: string | null;
    dispatchedAt?: string | null;
  },
) {
  return patchOrderViaApi(orderId, {
    status,
    stockDeducted,
    ...(extra?.courierName !== undefined ? { courierName: extra.courierName } : {}),
    ...(extra?.trackingNumber !== undefined ? { trackingNumber: extra.trackingNumber } : {}),
  });
}

export async function dbUpdateOrderCourier(
  orderId: string,
  courierName: string | null,
  trackingNumber: string | null,
  status: string = "Dispatched",
  _dispatchedAt: string = new Date().toISOString(),
) {
  return patchOrderViaApi(orderId, { status, courierName, trackingNumber });
}
function mapStoreHeroSlideToLegacyDb(slide: HeroSlide, index = 0): any {
  return {
    id: slide.id,
    image: slide.image || "",
    title: slide.headline || "",
    subtitle: slide.subtext || "",
    button_text: slide.ctaText || "",
    link: slide.ctaLink || "",
    enabled: slide.enabled ?? true,
    sort_order: index,
  };
}

export async function dbUpsertHeroSlide(slide: HeroSlide): Promise<boolean> {
  try {
    let image = slide.image;
    if (image && image.startsWith("data:")) {
      image = (await uploadImageToStorage(image, "hero")) || image;
    }
    const updatedSlide = { ...slide, image };
    const payload = mapStoreHeroSlideToDb(updatedSlide);
    const { error } = await supabase.from("hero_slides").upsert(payload);
    if (!error) return true;

    if (error.code === "PGRST204") {
      const { error: legacyError } = await supabase
        .from("hero_slides")
        .upsert(mapStoreHeroSlideToLegacyDb(updatedSlide, slide.sortOrder ?? 0));
      if (!legacyError) return true;
      throw legacyError;
    }

    throw error;
  } catch (e) {
    console.error("Failed to sync hero slide to Supabase:", e);
    return false;
  }
}

export async function dbUpsertHeroSlides(slides: HeroSlide[]): Promise<boolean> {
  if (slides.length === 0) return true;
  try {
    const updatedSlides = await Promise.all(
      slides.map(async (slide) => {
        let image = slide.image;
        if (image && image.startsWith("data:")) {
          image = (await uploadImageToStorage(image, "hero")) || image;
        }
        return { ...slide, image };
      }),
    );
    const payload = updatedSlides.map((slide, i) => mapStoreHeroSlideToDb(slide, i));
    const { error } = await supabase.from("hero_slides").upsert(payload);
    if (!error) return true;

    if (error.code === "PGRST204") {
      const legacyPayload = updatedSlides.map((slide, i) => mapStoreHeroSlideToLegacyDb(slide, i));
      const { error: legacyError } = await supabase.from("hero_slides").upsert(legacyPayload);
      if (!legacyError) return true;
      throw legacyError;
    }

    throw error;
  } catch (e) {
    console.error("Failed to sync hero slides to Supabase:", e);
    return false;
  }
}
export async function dbDeleteHeroSlide(id: string): Promise<boolean> {
  return deleteDatabaseRecord(supabase, "hero_slides", id);
}

export async function dbUpsertBrand(brand: Brand) {
  try {
    let logo = brand.logo;
    if (logo && logo.startsWith("data:")) {
      logo = (await uploadImageToStorage(logo, "brands")) || logo;
    }
    const updatedBrand = { ...brand, logo };
    const payload = sanitizeDbInput(mapStoreBrandToDb(updatedBrand));
    const { error } = await supabase.from("brands").upsert(payload);
    if (!error) return;

    if (isMissingColumnError(error, "enabled")) {
      const { error: legacyError } = await supabase.from("brands").upsert({
        id: updatedBrand.id,
        name: updatedBrand.name,
        logo: updatedBrand.logo || "",
      });
      if (!legacyError) return;
      throw legacyError;
    }

    throw error;
  } catch (e) {
    console.error("Failed to sync brand to Supabase:", e);
  }
}

export async function dbDeleteBrand(id: string) {
  return deleteDatabaseRecord(supabase, "brands", id);
}

export async function dbUpsertSocialReel(reel: SocialReel) {
  try {
    let thumbnail = reel.thumbnail;
    if (thumbnail && thumbnail.startsWith("data:")) {
      thumbnail = (await uploadImageToStorage(thumbnail, "reels")) || thumbnail;
    }
    const payload = sanitizeDbInput(mapStoreSocialReelToDb({ ...reel, thumbnail }));
    const { error } = await supabase.from("social_reels").upsert(payload);
    if (error) throw error;
  } catch (e) {
    console.error("Failed to sync reel to Supabase:", e);
  }
}

export async function dbDeleteSocialReel(id: string) {
  return deleteDatabaseRecord(supabase, "social_reels", id);
}

export async function dbUpsertTestimonial(t: Testimonial) {
  try {
    let photo = t.photo ?? null;
    let reviewImage = t.reviewImage ?? null;
    if (photo && photo.startsWith("data:")) {
      photo = await requireStoredImage(photo, "testimonials");
    }
    if (reviewImage && reviewImage.startsWith("data:")) {
      reviewImage = await requireStoredImage(reviewImage, "testimonials");
    }
    const updated: Testimonial = { ...t, photo, reviewImage };
    const payload = sanitizeDbInput(mapStoreTestimonialToDb(updated));
    const { error } = await supabase.from("testimonials").upsert(payload);
    if (error && isMissingColumnError(error, "source")) {
      const { source: _source, ...legacyPayload } = payload as any;
      await supabase.from("testimonials").upsert(legacyPayload);
    }
  } catch (e) {
    console.error("Failed to sync testimonial to Supabase:", e);
  }
}

export async function dbDeleteTestimonial(id: string) {
  return deleteDatabaseRecord(supabase, "testimonials", id);
}

export async function dbUpsertFaq(faq: FAQItem) {
  try {
    const payload = sanitizeDbInput(mapStoreFaqToDb(faq));
    const { error } = await supabase.from("faqs").upsert(payload);
    if (error) {
      if (
        isMissingColumnError(error, "show_on_home") ||
        isMissingColumnError(error, "showOnHome")
      ) {
        const legacyPayload = { ...payload };
        delete legacyPayload.show_on_home;
        delete legacyPayload.showOnHome;
        await supabase.from("faqs").upsert(legacyPayload);
      } else {
        console.error("Failed to sync FAQ to Supabase:", error);
      }
    }
  } catch (e) {
    console.error("Failed to sync FAQ to Supabase:", e);
  }
}

export async function dbDeleteFaq(id: string) {
  return deleteDatabaseRecord(supabase, "faqs", id);
}

export async function dbInsertSubscriber(subscriber: Subscriber) {
  try {
    const payload = sanitizeDbInput({
      id: subscriber.id,
      email: subscriber.email,
    });
    const { error } = await supabase.rpc("subscribe_email", {
      p_id: payload.id,
      p_email: payload.email,
    });
    if (error) throw error;
  } catch (e) {
    console.error("Failed to save subscriber to Supabase:", e);
  }
}

export async function dbDeleteSubscriber(id: string) {
  return deleteDatabaseRecord(supabase, "subscribers", id);
}

export async function dbUpsertSettings(settings: StoreSettings) {
  try {
    let logo = settings.logo;
    if (logo && logo.startsWith("data:")) {
      logo = (await uploadImageToStorage(logo, "settings")) || logo;
    }
    const payload: any = {
      id: "default",
      store_name: settings.storeName || "Nigah",
      whatsapp: settings.whatsapp || "",
      phone: settings.phone || "",
      email: settings.email || "",
      address: settings.address || "",
      hours: settings.hours || "",
      logo: logo || "",
      low_stock_threshold: settings.lowStockThreshold ?? 3,
      ...(settings.adminEmail.trim() ? { admin_email: settings.adminEmail } : {}),
      about_headline: settings.aboutHeadline || "",
      about_body: settings.aboutBody || "",
      updated_at: new Date().toISOString(),
    };
    await supabase.from("store_settings").upsert(payload);
  } catch (e) {
    console.error("Failed to save settings to Supabase:", e);
  }
}

export async function dbUpsertAnnouncement(announcement: AnnouncementSettings): Promise<boolean> {
  try {
    const messages = announcement.messages || [];
    const { error } = await supabase.from("announcements").upsert({
      id: "default",
      messages,
      text: messages.join("\n"),
      message: messages.join("\n"),
      enabled: announcement.enabled ?? true,
      active: announcement.enabled ?? true,
      background: announcement.background || "#000000",
      text_color: announcement.textColor || "#ffffff",
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Failed to save announcement to Supabase:", error);
    return false;
  }
}
export async function dbUpsertVideo(video: VideoSettings) {
  try {
    const { error } = await supabase.from("video_settings").upsert({
      id: "default",
      locked_channel: video.lockedChannel || "",
      video_url: video.videoUrl || "",
      video_id: video.videoId || null,
      caption: video.caption || "Crafted With Precision",
      enabled: true,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  } catch (error) {
    console.error("Failed to save video settings to Supabase:", error);
  }
}
export async function dbInsertQuery(query: ContactQuery) {
  try {
    const payload = sanitizeDbInput(mapStoreQueryToDb(query));
    const { error } = await supabase.from("queries").insert(payload);
    if (error) throw error;
  } catch (error) {
    console.error("Failed to save query to Supabase:", error);
  }
}
export async function dbUpdateQueryStatus(id: string, status: string) {
  try {
    await supabase.from("queries").update({ status }).eq("id", id).is("deleted_at", null);
    await supabase.from("orders").update({ status }).eq("id", id).is("deleted_at", null);
  } catch (e) {
    console.error("Failed to update query status in Supabase:", e);
  }
}

export async function dbDeleteQuery(id: string) {
  await requireDatabaseAdmin(supabase);
  const query = await supabase.from("queries").select("id").eq("id", id).maybeSingle();
  if (query.error) throw query.error;
  return deleteDatabaseRecord(supabase, query.data ? "queries" : "orders", id);
}
