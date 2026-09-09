import { supabase } from "./supabase";
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

export function mapStoreProductToDb(product: Product): any {
  const images = [product.image, ...(product.subImages || [])].filter(Boolean);
  return {
    id: product.id,
    name: product.name || "Untitled Product",
    slug: product.slug || product.id,
    price: Math.round(product.price) || 0,
    compare_at: product.salePrice ? Math.round(product.salePrice) : null,
    category_id: product.categoryId || null,
    collection_ids: product.collectionId ? [product.collectionId] : [],
    images: images.length > 0 ? images : ["/placeholder.svg"],
    description: product.description || "",
    frame_fit: product.details?.material || product.details?.frameMaterial || null,
    variants: Array.isArray(product.variants) ? product.variants : [],
    stock: Math.max(0, Math.round(product.stock) || 0),
    enabled: product.status !== "Draft",
    created_at: product.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function mapDbProductToStore(raw: any): Product {
  const images: string[] =
    Array.isArray(raw.images) && raw.images.length > 0
      ? raw.images
      : raw.image
        ? [raw.image]
        : [];
  return {
    id: raw.id,
    name: raw.name || "Product",
    slug: raw.slug || raw.id,
    price: Number(raw.price) || 0,
    salePrice: raw.compare_at ? Number(raw.compare_at) : raw.salePrice ? Number(raw.salePrice) : null,
    categoryId: raw.category_id || raw.categoryId || "cat-glasses",
    collectionId:
      (Array.isArray(raw.collection_ids) && raw.collection_ids[0]) || raw.collectionId || null,
    image: images[0] || "/placeholder.svg",
    hoverImage: images[1] || null,
    subImages: images.slice(1) || [],
    description: raw.description || "",
    stock: Number(raw.stock) || 0,
    variants: Array.isArray(raw.variants) ? raw.variants : [],
    details: raw.details || {
      material: raw.frame_fit || "Acetate / Stainless Steel",
      lensInfo: "UV400 Polarized",
      care: "Clean with microfiber cloth provided",
    },
    featured: Boolean(raw.featured),
    status: raw.enabled === false ? "Draft" : raw.status || "Published",
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
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

export function mapStoreHeroSlideToDb(slide: HeroSlide): any {
  return {
    id: slide.id,
    title: slide.headline || "",
    subtitle: slide.subtext || "",
    image: slide.image || "",
    button_text: slide.ctaText || "",
    link: slide.ctaLink || "",
  };
}

export function mapDbHeroSlideToStore(raw: any): HeroSlide {
  return {
    id: raw.id,
    headline: raw.title || raw.headline || "",
    subtext: raw.subtitle || raw.subtext || "",
    image: raw.image || "",
    ctaText: raw.button_text || raw.ctaText || "",
    ctaLink: raw.link || raw.ctaLink || "",
    eyebrow: raw.eyebrow || "",
    enabled: raw.enabled ?? true,
  };
}

export function mapStoreBrandToDb(brand: Brand): any {
  return {
    id: brand.id,
    name: brand.name,
    logo: brand.logo || "",
  };
}

export function mapDbBrandToStore(raw: any): Brand {
  return {
    id: raw.id,
    name: raw.name,
    logo: raw.logo || "",
    enabled: raw.enabled ?? true,
  };
}

export function mapStoreSocialReelToDb(reel: SocialReel): any {
  return {
    id: reel.id,
    title: reel.title || "Reel",
    video_url: reel.videoUrl || "",
    platform: reel.platform || "instagram",
  };
}

export function mapDbSocialReelToStore(raw: any): SocialReel {
  return {
    id: raw.id,
    title: raw.title,
    videoUrl: raw.video_url || raw.videoUrl || "",
    platform: raw.platform || "instagram",
    thumbnail: raw.thumbnail || "",
    creatorName: raw.creatorName || "",
    creatorHandle: raw.creatorHandle || "",
    duration: raw.duration || "00:30",
    productId: raw.productId || null,
    enabled: raw.enabled ?? true,
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
  };
}

export function mapDbTestimonialToStore(raw: any): Testimonial {
  const img = raw.review_image || raw.reviewImage || raw.avatar || raw.photo || null;
  return {
    id: raw.id,
    name: raw.name,
    quote: raw.review || raw.quote || "",
    rating: raw.rating || 5,
    photo: img,
    reviewImage: img,
    verified: raw.verified ?? true,
    email: raw.email || null,
    productId: raw.productId || null,
    productName: raw.productName || null,
    title: raw.title || null,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
  };
}

export function mapStoreFaqToDb(f: FAQItem): any {
  return {
    id: f.id,
    question: f.question,
    answer: f.answer,
    category: f.category || "General",
  };
}

export function mapDbFaqToStore(raw: any): FAQItem {
  return {
    id: raw.id,
    question: raw.question,
    answer: raw.answer,
    category: raw.category || "General",
    enabled: raw.enabled ?? true,
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
    productName: raw.product_name || raw.productName || raw.items?.[0]?.productName || "General enquiry",
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
      supabase.from("hero_slides").select("*"),
      supabase.from("brands").select("*"),
      supabase.from("social_reels").select("*"),
      supabase.from("testimonials").select("*"),
      supabase.from("faqs").select("*"),
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
          adminPassword: settingsRaw.adminPassword || import.meta.env.VITE_ADMIN_PASSWORD || "",
          aboutHeadline: settingsRaw.aboutHeadline || "",
          aboutBody: settingsRaw.aboutBody || "",
        }
      : null;

    const announcementRaw = announcementRes.status === "fulfilled" ? (announcementRes.value.data as any) : null;
    const announcement: AnnouncementSettings | null = announcementRaw
      ? {
          enabled: announcementRaw.active ?? announcementRaw.enabled ?? true,
          messages: announcementRaw.text ? [announcementRaw.text] : announcementRaw.messages || ["Complimentary delivery"],
          background: announcementRaw.background || "#000000",
          textColor: announcementRaw.textColor || "#ffffff",
        }
      : null;

    const videoRaw = videoRes.status === "fulfilled" ? (videoRes.value.data as any) : null;
    const video: VideoSettings | null = videoRaw
      ? {
          lockedChannel: videoRaw.lockedChannel || "",
          videoUrl: videoRaw.video_url || videoRaw.videoUrl || "",
          videoId: videoRaw.videoId || null,
          caption: videoRaw.title || videoRaw.caption || "",
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
    const allOrdersRaw = ordersRes.status === "fulfilled" && ordersRes.value.data ? (ordersRes.value.data as any[]) : [];

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
              source: ((o.source ||
                o.items?.[0]?.source ||
                ((o.productName || o.items?.[0]?.productName || "")
                  .toLowerCase()
                  .includes("whatsapp")
                  ? "whatsapp"
                  : "cart")) as OrderSource),
              status: (o.status
                ? o.status.charAt(0).toUpperCase() + o.status.slice(1).toLowerCase()
                : "New") as OrderStatus,
              stockDeducted: o.stockDeducted ?? true,
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
        ? (categoriesRes.value.data as Category[])
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
    if (typeof window !== "undefined" && localStorage.getItem("optique_initial_seeded") === "true") {
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
    const { count: catCount } = await supabase.from("categories").select("*", { count: "exact", head: true });
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
    const { count: colCount } = await supabase.from("collections").select("*", { count: "exact", head: true });
    if (!colCount) {
      console.log("Seeding collections into Supabase...");
      const payload = seed.collections.map(mapStoreCollectionToDb);
      await supabase.from("collections").upsert(payload);
    }

    // 3. Products
    const { count: prodCount } = await supabase.from("products").select("*", { count: "exact", head: true });
    if (!prodCount) {
      console.log("Seeding products into Supabase...");
      const payload = seed.products.map(mapStoreProductToDb);
      const { error } = await supabase.from("products").upsert(payload);
      if (error) console.error("Error seeding products to Supabase:", error);
    }

    // 4. Hero slides
    const { count: heroCount } = await supabase.from("hero_slides").select("*", { count: "exact", head: true });
    if (!heroCount) {
      console.log("Seeding hero slides into Supabase...");
      const payload = seed.heroSlides.map(mapStoreHeroSlideToDb);
      await supabase.from("hero_slides").upsert(payload);
    }

    // 5. Brands
    const { count: brandCount } = await supabase.from("brands").select("*", { count: "exact", head: true });
    if (!brandCount) {
      console.log("Seeding brands into Supabase...");
      const payload = seed.brands.map(mapStoreBrandToDb);
      await supabase.from("brands").upsert(payload);
    }

    // 6. Social reels
    const { count: reelCount } = await supabase.from("social_reels").select("*", { count: "exact", head: true });
    if (!reelCount) {
      console.log("Seeding social reels into Supabase...");
      const payload = seed.socialReels.map(mapStoreSocialReelToDb);
      await supabase.from("social_reels").upsert(payload);
    }

    // 7. Testimonials
    const { count: testCount } = await supabase.from("testimonials").select("*", { count: "exact", head: true });
    if (!testCount) {
      console.log("Seeding testimonials into Supabase...");
      const payload = seed.testimonials.map(mapStoreTestimonialToDb);
      await supabase.from("testimonials").upsert(payload);
    }

    // 8. FAQs
    const { count: faqCount } = await supabase.from("faqs").select("*", { count: "exact", head: true });
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

export async function dbUpsertProduct(product: Product) {
  try {
    const payload = mapStoreProductToDb(product);
    const { error } = await supabase.from("products").upsert(payload);
    if (error) {
      console.error("Failed to sync product to Supabase:", error);
    }
  } catch (e) {
    console.error("Failed to sync product to Supabase:", e);
  }
}

export async function dbDeleteProduct(id: string) {
  try {
    await supabase.from("products").delete().eq("id", id);
  } catch (e) {
    console.error("Failed to delete product from Supabase:", e);
  }
}

export async function dbUpsertCategory(category: Category) {
  try {
    await supabase.from("categories").upsert({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image || null,
      banner: category.banner || null,
    });
  } catch (e) {
    console.error("Failed to sync category to Supabase:", e);
  }
}

export async function dbDeleteCategory(id: string) {
  try {
    await supabase.from("categories").delete().eq("id", id);
  } catch (e) {
    console.error("Failed to delete category from Supabase:", e);
  }
}

export async function dbUpsertCollection(collection: Collection) {
  try {
    const payload = mapStoreCollectionToDb(collection);
    await supabase.from("collections").upsert(payload);
  } catch (e) {
    console.error("Failed to sync collection to Supabase:", e);
  }
}

export async function dbDeleteCollection(id: string) {
  try {
    await supabase.from("collections").delete().eq("id", id);
  } catch (e) {
    console.error("Failed to delete collection from Supabase:", e);
  }
}

export async function dbInsertOrder(order: Order) {
  try {
    const payload: any = {
      id: order.id,
      customer_name: order.customerName || "Customer",
      phone: order.contact || "N/A",
      address: order.message || "N/A",
      city: "N/A",
      source: order.source || "cart",
      items: [
        {
          reference: order.reference,
          productId: order.productId,
          productName: order.productName,
          variantId: order.variantId,
          variantLabel: order.variantLabel,
          source: order.source || "cart",
        },
      ],
      total: 0,
      status: order.status || "New",
      created_at: order.createdAt || new Date().toISOString(),
    };
    await supabase.from("orders").upsert(payload);
  } catch (e) {
    console.error("Failed to save order to Supabase:", e);
  }
}

export async function dbUpdateOrderStatus(orderId: string, status: string, stockDeducted: boolean) {
  try {
    await supabase.from("orders").update({ status }).eq("id", orderId);
  } catch (e) {
    console.error("Failed to update order status in Supabase:", e);
  }
}

export async function dbUpsertHeroSlide(slide: HeroSlide) {
  try {
    const payload = mapStoreHeroSlideToDb(slide);
    await supabase.from("hero_slides").upsert(payload);
  } catch (e) {
    console.error("Failed to sync hero slide to Supabase:", e);
  }
}

export async function dbUpsertHeroSlides(slides: HeroSlide[]) {
  try {
    const payload = slides.map(mapStoreHeroSlideToDb);
    await supabase.from("hero_slides").upsert(payload);
  } catch (e) {
    console.error("Failed to sync hero slides to Supabase:", e);
  }
}

export async function dbUpsertBrand(brand: Brand) {
  try {
    const payload = mapStoreBrandToDb(brand);
    await supabase.from("brands").upsert(payload);
  } catch (e) {
    console.error("Failed to sync brand to Supabase:", e);
  }
}

export async function dbDeleteBrand(id: string) {
  try {
    await supabase.from("brands").delete().eq("id", id);
  } catch (e) {
    console.error("Failed to delete brand from Supabase:", e);
  }
}

export async function dbUpsertSocialReel(reel: SocialReel) {
  try {
    const payload = mapStoreSocialReelToDb(reel);
    await supabase.from("social_reels").upsert(payload);
  } catch (e) {
    console.error("Failed to sync reel to Supabase:", e);
  }
}

export async function dbDeleteSocialReel(id: string) {
  try {
    await supabase.from("social_reels").delete().eq("id", id);
  } catch (e) {
    console.error("Failed to delete reel from Supabase:", e);
  }
}

export async function dbUpsertTestimonial(t: Testimonial) {
  try {
    const payload = mapStoreTestimonialToDb(t);
    await supabase.from("testimonials").upsert(payload);
  } catch (e) {
    console.error("Failed to sync testimonial to Supabase:", e);
  }
}

export async function dbDeleteTestimonial(id: string) {
  try {
    await supabase.from("testimonials").delete().eq("id", id);
  } catch (e) {
    console.error("Failed to delete testimonial from Supabase:", e);
  }
}

export async function dbUpsertFaq(faq: FAQItem) {
  try {
    const payload = mapStoreFaqToDb(faq);
    await supabase.from("faqs").upsert(payload);
  } catch (e) {
    console.error("Failed to sync FAQ to Supabase:", e);
  }
}

export async function dbDeleteFaq(id: string) {
  try {
    await supabase.from("faqs").delete().eq("id", id);
  } catch (e) {
    console.error("Failed to delete FAQ from Supabase:", e);
  }
}

export async function dbInsertSubscriber(subscriber: Subscriber) {
  try {
    await supabase.from("subscribers").upsert({
      id: subscriber.id,
      email: subscriber.email,
    });
  } catch (e) {
    console.error("Failed to save subscriber to Supabase:", e);
  }
}

export async function dbDeleteSubscriber(id: string) {
  try {
    await supabase.from("subscribers").delete().eq("id", id);
  } catch (e) {
    console.error("Failed to delete subscriber from Supabase:", e);
  }
}

export async function dbUpsertSettings(settings: StoreSettings) {
  try {
    const payload: any = {
      id: "default",
      store_name: settings.storeName || "OPTIQUE",
      whatsapp: settings.whatsapp || "",
      phone: settings.phone || "",
      email: settings.email || "",
      address: settings.address || "",
      hours: settings.hours || "",
      logo: settings.logo || "",
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
    const payload: any = {
      id: "default",
      text: announcement.messages?.[0] || "",
      active: announcement.enabled ?? true,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("announcements").upsert(payload);
  } catch (e) {
    console.error("Failed to save announcement to Supabase:", e);
  }
}

export async function dbUpsertVideo(video: VideoSettings) {
  try {
    const payload: any = {
      id: "default",
      video_url: video.videoUrl || "",
      title: video.caption || "Crafted With Precision",
      active: true,
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

