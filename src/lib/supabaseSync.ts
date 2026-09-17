import { supabase } from "./supabase";
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

// ── Database Schema Mappers (Frontend Store <-> Supabase DB) ──

// ── Supabase Storage Image Upload ──────────────────────────────────────────
const STORAGE_BUCKET = "optique-images";

/** Creates the optique-images storage bucket if it does not exist yet. */
async function ensureBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b: any) => b.name === STORAGE_BUCKET);
    if (!exists) {
      await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 10485760, // 10 MB
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
      });
    }
  } catch {
    // Bucket may already exist or permissions may differ — safe to ignore
  }
}

/**
 * Uploads a base64 data URL to Supabase Storage and returns the permanent public URL.
 * Falls back gracefully (returns null) so the caller can use base64 instead.
 */
export async function uploadImageToStorage(
  base64DataUrl: string,
  folder = "products",
): Promise<string | null> {
  if (!base64DataUrl || !base64DataUrl.startsWith("data:")) return null;
  try {
    await ensureBucket();
    const res = await fetch(base64DataUrl);
    const blob = await res.blob();
    const ext = blob.type.includes("webp")
      ? "webp"
      : blob.type.includes("png")
        ? "png"
        : "jpg";
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, blob, { upsert: true, contentType: blob.type });
    if (error) {
      console.warn("[uploadImageToStorage] Upload failed:", error.message);
      return null;
    }
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);
    return urlData?.publicUrl ?? null;
  } catch (e) {
    console.warn("[uploadImageToStorage] Exception:", e);
    return null;
  }
}
// ────────────────────────────────────────────────────────────────────────────

// Supabase PostgREST caches old table shapes; retry with legacy payloads when a column is missing.
function isMissingColumnError(error: any, column: string) {
  const message = String(error?.message || error || "");
  return error?.code === "PGRST204" && message.includes(`'${column}' column`);
}
export function mapStoreProductToDb(product: Product): any {
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
  const existingDetails = (typeof product.details === "object" && product.details !== null)
    ? product.details as Record<string, any>
    : {};

  return {
    id: product.id,
    name: product.name || "Untitled Product",
    slug: product.slug || product.id,
    price: Math.round(Math.max(0, Number(product.price) || 0)),
    compare_at: product.salePrice && Number(product.salePrice) > 0
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
  const subImages: string[] =
    Array.isArray(rawSubImages) && rawSubImages.length > 0
      ? rawSubImages.filter((s: any) => typeof s === "string" && s.trim().length > 0)
      : images.length > 1
        ? images.slice(1)
        : [];

  return {
    id: raw.id,
    name: raw.name || "Product",
    slug: raw.slug || raw.id,
    price: Number(raw.price) || 0,
    salePrice: raw.compare_at
      ? Number(raw.compare_at)
      : raw.salePrice
        ? Number(raw.salePrice)
        : null,
    categoryId: raw.category_id || raw.categoryId || "cat-glasses",
    collectionId:
      (Array.isArray(raw.collection_ids) && raw.collection_ids[0]) || raw.collectionId || null,
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

export function mapStoreCategoryToDb(category: Category, index?: number): any {
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

export function mapStoreCollectionToDb(collection: Collection): any {
  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    category_id: collection.categoryId || null,
    banner: collection.banner || null,
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
    showInNav: raw.showInNav ?? true,
    description: raw.description || "",
  };
}

export function mapStoreHeroSlideToDb(slide: HeroSlide, index?: number): any {
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

export function mapStoreBrandToDb(brand: Brand): any {
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

export function mapStoreSocialReelToDb(reel: SocialReel): any {
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

export function mapStoreTestimonialToDb(t: Testimonial): any {
  const img = t.reviewImage || t.photo || "";
  return {
    id: t.id,
    name: t.name,
    review: t.quote || "",
    rating: t.rating || 5,
    avatar: img,
    verified: t.verified ?? true,
    // Product association fields — saved so product pages filter correctly
    email: t.email || null,
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

export function mapStoreFaqToDb(f: FAQItem): any {
  return {
    id: f.id,
    question: f.question,
    answer: f.answer,
    category: f.category || "General",
    enabled: f.enabled ?? true,
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
    sortOrder: raw.sort_order ?? raw.sortOrder ?? 0,
  };
}

export function mapStoreQueryToDb(q: ContactQuery): any {
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

/**
 * Fetch all storefront data from Supabase.
 */
export async function fetchInitialSupabaseData() {
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
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("queries").select("*").order("created_at", { ascending: false }),
      supabase.from("hero_slides").select("*").order("sort_order", { ascending: true }),
      supabase.from("brands").select("*").order("sort_order", { ascending: true }),
      supabase.from("social_reels").select("*").order("sort_order", { ascending: true }),
      supabase.from("testimonials").select("*").order("sort_order", { ascending: true }),
      supabase.from("faqs").select("*").order("sort_order", { ascending: true }),
      supabase.from("subscribers").select("*").order("created_at", { ascending: false }),
      supabase.from("store_settings").select("*").eq("id", "default").single(),
      supabase.from("announcements").select("*").eq("id", "default").single(),
      supabase.from("video_settings").select("*").eq("id", "default").single(),
    ]);

    const settingsRaw = settingsRes.status === "fulfilled" ? (settingsRes.value.data as any) : null;
    const settings: StoreSettings | null = settingsRaw
      ? {
          storeName: settingsRaw.store_name || settingsRaw.storeName || "OPTIQUE",
          whatsapp: settingsRaw.whatsapp || "",
          phone: settingsRaw.phone || "",
          email: settingsRaw.email || "",
          address: settingsRaw.address || "",
          hours: settingsRaw.hours || "",
          logo: settingsRaw.logo || null,
          lowStockThreshold: settingsRaw.low_stock_threshold || settingsRaw.lowStockThreshold || 3,
          adminEmail: settingsRaw.adminEmail || import.meta.env.VITE_ADMIN_EMAIL || "",
          aboutHeadline: settingsRaw.aboutHeadline || "",
          aboutBody: settingsRaw.aboutBody || "",
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
              stockDeducted: o.stockDeducted ?? true,
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

    return {
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
  } catch (err) {
    console.error("Failed to fetch initial data from Supabase:", err);
    return null;
  }
}

/**
 * Automatically seed individual Supabase tables if they are empty on initial run.
 */
export async function autoSeedSupabaseIfEmpty(seed: {
  categories: Category[];
  collections: Collection[];
  products: Product[];
  heroSlides: HeroSlide[];
  brands: Brand[];
  socialReels: SocialReel[];
  testimonials: Testimonial[];
  faqs: FAQItem[];
}) {
  try {
    // If the database has already been initialized, skip auto-seeding so manual deletions are permanent
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("optique_initial_seeded") === "true"
    ) {
      return;
    }

    const { data: existingSettings } = await supabase
      .from("store_settings")
      .select("id")
      .eq("id", "default")
      .maybeSingle();
    const { count: existingProds } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    if (existingSettings || (existingProds && existingProds > 0)) {
      if (typeof window !== "undefined") {
        localStorage.setItem("optique_initial_seeded", "true");
      }
      return;
    }

    // 1. Categories
    const { count: catCount } = await supabase
      .from("categories")
      .select("*", { count: "exact", head: true });
    if (!catCount) {
      console.log("Seeding categories into Supabase...");
      const payload = seed.categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        image: c.image || null,
        banner: c.banner || null,
      }));
      await supabase.from("categories").upsert(payload);
    }

    // 2. Collections
    const { count: colCount } = await supabase
      .from("collections")
      .select("*", { count: "exact", head: true });
    if (!colCount) {
      console.log("Seeding collections into Supabase...");
      const payload = seed.collections.map(mapStoreCollectionToDb);
      await supabase.from("collections").upsert(payload);
    }

    // 3. Products
    const { count: prodCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });
    if (!prodCount) {
      console.log("Seeding products into Supabase...");
      const payload = seed.products.map(mapStoreProductToDb);
      const { error } = await supabase.from("products").upsert(payload);
      if (error) console.error("Error seeding products to Supabase:", error);
    }

    // 4. Hero slides
    const { count: heroCount } = await supabase
      .from("hero_slides")
      .select("*", { count: "exact", head: true });
    if (!heroCount) {
      console.log("Seeding hero slides into Supabase...");
      const payload = seed.heroSlides.map(mapStoreHeroSlideToDb);
      await supabase.from("hero_slides").upsert(payload);
    }

    // 5. Brands
    const { count: brandCount } = await supabase
      .from("brands")
      .select("*", { count: "exact", head: true });
    if (!brandCount) {
      console.log("Seeding brands into Supabase...");
      const payload = seed.brands.map(mapStoreBrandToDb);
      await supabase.from("brands").upsert(payload);
    }

    // 6. Social reels
    const { count: reelCount } = await supabase
      .from("social_reels")
      .select("*", { count: "exact", head: true });
    if (!reelCount) {
      console.log("Seeding social reels into Supabase...");
      const payload = seed.socialReels.map(mapStoreSocialReelToDb);
      await supabase.from("social_reels").upsert(payload);
    }

    // 7. Testimonials
    const { count: testCount } = await supabase
      .from("testimonials")
      .select("*", { count: "exact", head: true });
    if (!testCount) {
      console.log("Seeding testimonials into Supabase...");
      const payload = seed.testimonials.map(mapStoreTestimonialToDb);
      await supabase.from("testimonials").upsert(payload);
    }

    // 8. FAQs
    const { count: faqCount } = await supabase
      .from("faqs")
      .select("*", { count: "exact", head: true });
    if (!faqCount) {
      console.log("Seeding FAQs into Supabase...");
      const payload = seed.faqs.map(mapStoreFaqToDb);
      await supabase.from("faqs").upsert(payload);
    }
  } catch (err) {
    console.warn("Auto-seed error:", err);
  }
}

// ── CRUD Sync Functions ──

// ── Convert base64 images to Supabase Storage URLs ────────────────────────
export async function uploadProductImageData(product: Product): Promise<Product> {
  let updated = false;
  let image = product.image;
  let hoverImage = product.hoverImage;
  let subImages = product.subImages ? [...product.subImages] : [];

  if (image && image.startsWith("data:")) {
    const url = await uploadImageToStorage(image, "products");
    if (url) {
      image = url;
      updated = true;
    }
  }

  if (hoverImage && hoverImage.startsWith("data:")) {
    const url = await uploadImageToStorage(hoverImage, "products");
    if (url) {
      hoverImage = url;
      updated = true;
    }
  }

  if (Array.isArray(subImages)) {
    const newSubImages: string[] = [];
    for (const sub of subImages) {
      if (sub && sub.startsWith("data:")) {
        const url = await uploadImageToStorage(sub, "products");
        if (url) {
          newSubImages.push(url);
          updated = true;
        } else {
          newSubImages.push(sub);
        }
      } else {
        newSubImages.push(sub);
      }
    }
    subImages = newSubImages;
  }

  return updated ? { ...product, image, hoverImage: hoverImage ?? null, subImages } : product;
}

export async function dbUpsertProduct(product: Product) {
  try {
    // Automatically convert any base64 images to Supabase Storage URLs before saving
    product = await uploadProductImageData(product);
    const payload = mapStoreProductToDb(product);

    // Remove columns that may not exist in older schema versions
    // to avoid PGRST204 errors. We'll add them back if schema supports them.
    const safePayload = { ...payload };

    const { error: firstError } = await supabase.from("products").upsert(safePayload);

    if (!firstError) {
      return { success: true };
    }

    console.warn("[dbUpsertProduct] First upsert failed:", firstError.code, firstError.message);

    // Handle slug uniqueness conflict
    if (firstError.code === "23505" || String(firstError.message).toLowerCase().includes("slug")) {
      safePayload.slug = `${safePayload.slug || product.id}-${String(product.id).slice(-6)}`;
    }

    // Strip columns that the schema doesn't have yet (PGRST204 = column not found)
    if (firstError.code === "PGRST204" || String(firstError.message).includes("column")) {
      const msg = String(firstError.message);
      // Dynamically extract missing column name if present in PostgREST error message
      const colMatch = msg.match(/'([^']+)' column/i);
      if (colMatch && colMatch[1]) {
        delete safePayload[colMatch[1]];
      }
      if (msg.includes("new_arrival_image")) delete safePayload.new_arrival_image;
      if (msg.includes("is_new_arrival")) delete safePayload.is_new_arrival;
      if (msg.includes("is_bestseller")) delete safePayload.is_bestseller;
      if (msg.includes("hover_image")) delete safePayload.hover_image;
      if (msg.includes("frame_fit")) delete safePayload.frame_fit;
      if (msg.includes("updated_at")) delete safePayload.updated_at;
      if (msg.includes("featured")) delete safePayload.featured;
    }

    const { error: retryError } = await supabase.from("products").upsert(safePayload);

    if (!retryError) {
      return { success: true };
    }

    // If retry also failed due to another missing column, strip that too
    if (retryError.code === "PGRST204" || String(retryError.message).includes("column")) {
      const colMatch2 = String(retryError.message).match(/'([^']+)' column/i);
      if (colMatch2 && colMatch2[1]) {
        delete safePayload[colMatch2[1]];
        const { error: retry2Error } = await supabase.from("products").upsert(safePayload);
        if (!retry2Error) return { success: true };
      }
    }

    // Final fallback: strip ALL optional columns, keep only core ones
    console.error("[dbUpsertProduct] Retry failed:", retryError.code, retryError.message);
    const corePayload: any = {
      id: safePayload.id,
      name: safePayload.name,
      slug: safePayload.slug,
      price: safePayload.price,
      compare_at: safePayload.compare_at,
      category_id: safePayload.category_id,
      images: safePayload.images,
      description: safePayload.description,
      details: safePayload.details,
      variants: safePayload.variants,
      stock: safePayload.stock,
      enabled: safePayload.enabled,
      created_at: safePayload.created_at,
    };

    const { error: fallbackError } = await supabase.from("products").upsert(corePayload);
    if (fallbackError) {
      console.error("[dbUpsertProduct] Final fallback failed:", fallbackError);
      return { success: false, error: fallbackError };
    }

    return { success: true };
  } catch (e) {
    console.error("[dbUpsertProduct] Exception:", e);
    return { success: false, error: e };
  }
}

export async function dbDeleteProduct(id: string) {
  try {
    const cleanId = escapePostgrestFilter(id);
    if (!cleanId) return;
    await supabase.from("products").delete().eq("id", cleanId);
  } catch (e) {
    console.error("Failed to delete product from Supabase:", e);
  }
}

export async function dbUpsertCategory(category: Category) {
  try {
    let image = category.image ?? null;
    let banner = category.banner ? { ...category.banner } : null;
    if (image && image.startsWith("data:")) {
      image = (await uploadImageToStorage(image, "categories")) || image;
    }
    if (banner?.image && banner.image.startsWith("data:")) {
      const bannerUrl = await uploadImageToStorage(banner.image, "categories");
      if (bannerUrl) banner.image = bannerUrl;
    }
    const payload = sanitizeDbInput(mapStoreCategoryToDb({ ...category, image, banner }));
    await supabase.from("categories").upsert(payload);
  } catch (e) {
    console.error("Failed to sync category to Supabase:", e);
  }
}

export async function dbDeleteCategory(id: string) {
  try {
    const cleanId = escapePostgrestFilter(id);
    if (!cleanId) return;
    await supabase.from("categories").delete().eq("id", cleanId);
  } catch (e) {
    console.error("Failed to delete category from Supabase:", e);
  }
}

export async function dbUpsertCollection(collection: Collection) {
  try {
    let banner = collection.banner ? { ...collection.banner } : null;
    if (banner?.image && banner.image.startsWith("data:")) {
      const bannerUrl = await uploadImageToStorage(banner.image, "collections");
      if (bannerUrl) banner.image = bannerUrl;
    }
    const payload = sanitizeDbInput(mapStoreCollectionToDb({ ...collection, banner }));
    await supabase.from("collections").upsert(payload);
  } catch (e) {
    console.error("Failed to sync collection to Supabase:", e);
  }
}

export async function dbDeleteCollection(id: string) {
  try {
    const cleanId = escapePostgrestFilter(id);
    if (!cleanId) return;
    await supabase.from("collections").delete().eq("id", cleanId);
  } catch (e) {
    console.error("Failed to delete collection from Supabase:", e);
  }
}

export async function dbInsertOrder(order: Order) {
  try {
    const payload: any = sanitizeDbInput({
      id: order.id,
      customer_name: order.customerName || "Customer",
      phone: order.contact || "N/A",
      address: order.message || "N/A",
      city: "N/A",
      source: order.source || "cart",
      courier_name: order.courierName || null,
      tracking_number: order.trackingNumber || null,
      dispatched_at: order.dispatchedAt || null,
      items: [
        {
          reference: order.reference,
          productId: order.productId,
          productName: order.productName,
          variantId: order.variantId,
          variantLabel: order.variantLabel,
          source: order.source || "cart",
          courierName: order.courierName || null,
          trackingNumber: order.trackingNumber || null,
        },
      ],
      total: 0,
      status: order.status || "New",
      created_at: order.createdAt || new Date().toISOString(),
    });
    await supabase.from("orders").upsert(payload);
  } catch (e) {
    console.error("Failed to save order to Supabase:", e);
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
  try {
    const cleanOrderId = escapePostgrestFilter(orderId);
    if (!cleanOrderId) return;
    const updatePayload: any = sanitizeDbInput({ status });
    if (extra?.courierName !== undefined) updatePayload.courier_name = extra.courierName;
    if (extra?.trackingNumber !== undefined) updatePayload.tracking_number = extra.trackingNumber;
    if (extra?.dispatchedAt !== undefined) updatePayload.dispatched_at = extra.dispatchedAt;

    await supabase.from("orders").update(updatePayload).eq("id", cleanOrderId);
  } catch (e) {
    console.error("Failed to update order status in Supabase:", e);
  }
}

export async function dbUpdateOrderCourier(
  orderId: string,
  courierName: string | null,
  trackingNumber: string | null,
  status: string = "Dispatched",
  dispatchedAt: string = new Date().toISOString(),
) {
  try {
    const cleanOrderId = escapePostgrestFilter(orderId);
    if (!cleanOrderId) return;
    const cleanPayload = sanitizeDbInput({
      status,
      courier_name: courierName,
      tracking_number: trackingNumber,
      dispatched_at: dispatchedAt,
    });
    await supabase
      .from("orders")
      .update(cleanPayload)
      .eq("id", cleanOrderId);
  } catch (e) {
    console.error("Failed to update order courier in Supabase:", e);
  }
}

function mapStoreHeroSlideToLegacyDb(slide: HeroSlide, index = 0): any {
  return {
    id: slide.id,
    image: slide.image || "",
    headline: slide.headline || "",
    subtext: slide.subtext || "",
    enabled: slide.enabled ?? true,
    sort_order: index,
  };
}

export async function dbUpsertHeroSlide(slide: HeroSlide) {
  try {
    let image = slide.image;
    if (image && image.startsWith("data:")) {
      image = (await uploadImageToStorage(image, "hero")) || image;
    }
    const updatedSlide = { ...slide, image };
    const payload = mapStoreHeroSlideToDb(updatedSlide);
    const { error } = await supabase.from("hero_slides").upsert(payload);
    if (!error) return;

    if (
      isMissingColumnError(error, "cta_link") ||
      isMissingColumnError(error, "cta_text") ||
      isMissingColumnError(error, "eyebrow")
    ) {
      const { error: legacyError } = await supabase
        .from("hero_slides")
        .upsert(mapStoreHeroSlideToLegacyDb(updatedSlide));
      if (!legacyError) return;
      throw legacyError;
    }

    throw error;
  } catch (e) {
    console.error("Failed to sync hero slide to Supabase:", e);
  }
}

export async function dbUpsertHeroSlides(slides: HeroSlide[]) {
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
    if (!error) return;

    if (
      isMissingColumnError(error, "cta_link") ||
      isMissingColumnError(error, "cta_text") ||
      isMissingColumnError(error, "eyebrow")
    ) {
      const legacyPayload = updatedSlides.map((slide, i) => mapStoreHeroSlideToLegacyDb(slide, i));
      const { error: legacyError } = await supabase.from("hero_slides").upsert(legacyPayload);
      if (!legacyError) return;
      throw legacyError;
    }

    throw error;
  } catch (e) {
    console.error("Failed to sync hero slides to Supabase:", e);
  }
}
export async function dbDeleteHeroSlide(id: string) {
  try {
    const cleanId = escapePostgrestFilter(id);
    if (!cleanId) return;
    await supabase.from("hero_slides").delete().eq("id", cleanId);
  } catch (e) {
    console.error("Failed to delete hero slide from Supabase:", e);
  }
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
  try {
    const cleanId = escapePostgrestFilter(id);
    if (!cleanId) return;
    await supabase.from("brands").delete().eq("id", cleanId);
  } catch (e) {
    console.error("Failed to delete brand from Supabase:", e);
  }
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
  try {
    const cleanId = escapePostgrestFilter(id);
    if (!cleanId) return;
    await supabase.from("social_reels").delete().eq("id", cleanId);
  } catch (e) {
    console.error("Failed to delete reel from Supabase:", e);
  }
}

export async function dbUpsertTestimonial(t: Testimonial) {
  try {
    let photo = t.photo ?? null;
    let reviewImage = t.reviewImage ?? null;
    if (photo && photo.startsWith("data:")) {
      photo = (await uploadImageToStorage(photo, "testimonials")) || photo;
    }
    if (reviewImage && reviewImage.startsWith("data:")) {
      reviewImage = (await uploadImageToStorage(reviewImage, "testimonials")) || reviewImage;
    }
    const updated: Testimonial = { ...t, photo, reviewImage };
    const payload = sanitizeDbInput(mapStoreTestimonialToDb(updated));
    await supabase.from("testimonials").upsert(payload);
  } catch (e) {
    console.error("Failed to sync testimonial to Supabase:", e);
  }
}

export async function dbDeleteTestimonial(id: string) {
  try {
    const cleanId = escapePostgrestFilter(id);
    if (!cleanId) return;
    await supabase.from("testimonials").delete().eq("id", cleanId);
  } catch (e) {
    console.error("Failed to delete testimonial from Supabase:", e);
  }
}

export async function dbUpsertFaq(faq: FAQItem) {
  try {
    const payload = sanitizeDbInput(mapStoreFaqToDb(faq));
    await supabase.from("faqs").upsert(payload);
  } catch (e) {
    console.error("Failed to sync FAQ to Supabase:", e);
  }
}

export async function dbDeleteFaq(id: string) {
  try {
    const cleanId = escapePostgrestFilter(id);
    if (!cleanId) return;
    await supabase.from("faqs").delete().eq("id", cleanId);
  } catch (e) {
    console.error("Failed to delete FAQ from Supabase:", e);
  }
}

export async function dbInsertSubscriber(subscriber: Subscriber) {
  try {
    const payload = sanitizeDbInput({
      id: subscriber.id,
      email: subscriber.email,
    });
    await supabase.from("subscribers").upsert(payload);
  } catch (e) {
    console.error("Failed to save subscriber to Supabase:", e);
  }
}

export async function dbDeleteSubscriber(id: string) {
  try {
    const cleanId = escapePostgrestFilter(id);
    if (!cleanId) return;
    await supabase.from("subscribers").delete().eq("id", cleanId);
  } catch (e) {
    console.error("Failed to delete subscriber from Supabase:", e);
  }
}

export async function dbUpsertSettings(settings: StoreSettings) {
  try {
    let logo = settings.logo;
    if (logo && logo.startsWith("data:")) {
      logo = (await uploadImageToStorage(logo, "settings")) || logo;
    }
    const payload: any = {
      id: "default",
      store_name: settings.storeName || "OPTIQUE",
      whatsapp: settings.whatsapp || "",
      phone: settings.phone || "",
      email: settings.email || "",
      address: settings.address || "",
      hours: settings.hours || "",
      logo: logo || "",
      low_stock_threshold: settings.lowStockThreshold || 3,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("store_settings").upsert(payload);
  } catch (e) {
    console.error("Failed to save settings to Supabase:", e);
  }
}

export async function dbUpsertAnnouncement(announcement: AnnouncementSettings) {
  try {
    const message = (announcement.messages || []).join("\n");
    const payload: any = {
      id: "default",
      // Save both the full messages array and a single-text fallback.
      messages: announcement.messages || [],
      text: message,
      message,
      enabled: announcement.enabled ?? true,
      active: announcement.enabled ?? true,
      background: announcement.background || "#000000",
      text_color: announcement.textColor || "#ffffff",
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("announcements").upsert(payload);
    if (!error) return;

    if (isMissingColumnError(error, "enabled")) {
      const { error: activeError } = await supabase.from("announcements").upsert({
        id: "default",
        active: announcement.enabled ?? true,
        messages: announcement.messages || [],
        text: message,
        background: announcement.background || "#000000",
        text_color: announcement.textColor || "#ffffff",
        updated_at: new Date().toISOString(),
      });
      if (!activeError) return;
      if (!isMissingColumnError(activeError, "messages")) throw activeError;
    } else if (!isMissingColumnError(error, "messages")) {
      throw error;
    }

    const { error: legacyError } = await supabase.from("announcements").upsert({
      id: "default",
      active: announcement.enabled ?? true,
      text: message,
    });
    if (legacyError) throw legacyError;
  } catch (e) {
    console.error("Failed to save announcement to Supabase:", e);
  }
}

export async function dbUpsertVideo(video: VideoSettings) {
  try {
    const payload: any = {
      id: "default",
      video_url: video.videoUrl || "",
      url: video.videoUrl || "",
      caption: video.caption || "Crafted With Precision",
      title: video.caption || "Crafted With Precision",
      active: true,
      enabled: true,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("video_settings").upsert(payload);
  } catch (e) {
    console.error("Failed to save video settings to Supabase:", e);
  }
}

export async function dbInsertQuery(query: ContactQuery) {
  try {
    const payload = mapStoreQueryToDb(query);
    const { error } = await supabase.from("queries").upsert(payload);
    if (error) {
      // Fallback to storing in orders table with source = 'form'
      await supabase.from("orders").upsert({
        id: query.id,
        customer_name: query.name,
        phone: query.contact,
        address: query.message,
        city: "N/A",
        items: [
          {
            source: "form",
            productName: query.productName,
            productId: query.productId,
          },
        ],
        total: 0,
        status: query.status,
        created_at: query.createdAt,
      });
    }
  } catch (e) {
    console.error("Failed to save query to Supabase:", e);
  }
}

export async function dbUpdateQueryStatus(id: string, status: string) {
  try {
    await supabase.from("queries").update({ status }).eq("id", id);
    await supabase.from("orders").update({ status }).eq("id", id);
  } catch (e) {
    console.error("Failed to update query status in Supabase:", e);
  }
}

export async function dbDeleteQuery(id: string) {
  try {
    await supabase.from("queries").delete().eq("id", id);
    await supabase.from("orders").delete().eq("id", id);
  } catch (e) {
    console.error("Failed to delete query from Supabase:", e);
  }
}
