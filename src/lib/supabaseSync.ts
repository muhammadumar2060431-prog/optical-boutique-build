import { supabase } from "./supabase";
import type {
  AnnouncementSettings,
  Brand,
  Category,
  Collection,
  FAQItem,
  HeroSlide,
  Order,
  OrderStatus,
  Product,
  SocialReel,
  StoreSettings,
  Subscriber,
  Testimonial,
  VideoSettings,
} from "./types";

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
          adminPassword: settingsRaw.adminPassword || import.meta.env.VITE_ADMIN_PASSWORD || "",
          aboutHeadline: settingsRaw.aboutHeadline || "",
          aboutBody: settingsRaw.aboutBody || "",
        }
      : null;

    const announcementRaw = announcementRes.status === "fulfilled" ? (announcementRes.value.data as any) : null;
    const announcement: AnnouncementSettings | null = announcementRaw
      ? {
          enabled: announcementRaw.active ?? announcementRaw.enabled ?? true,
          messages: announcementRaw.text ? [announcementRaw.text] : (announcementRaw.messages || ["Complimentary delivery"]),
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
        ? (heroRes.value.data as any[]).map((h) => ({
            id: h.id,
            headline: h.title || h.headline || "",
            subtext: h.subtitle || h.subtext || "",
            image: h.image,
            ctaText: h.button_text || h.ctaText || "",
            ctaLink: h.link || h.ctaLink || "",
            eyebrow: h.eyebrow || "",
            enabled: h.enabled ?? true,
          }))
        : null;

    const testimonials: Testimonial[] | null =
      testimonialsRes.status === "fulfilled" && testimonialsRes.value.data
        ? (testimonialsRes.value.data as any[]).map((t) => ({
            id: t.id,
            name: t.name,
            quote: t.review || t.quote || "",
            rating: t.rating || 5,
            photo: t.avatar || t.photo || null,
            verified: t.verified ?? true,
            email: t.email || null,
            productId: t.productId || null,
            productName: t.productName || null,
            title: t.title || null,
            reviewImage: t.reviewImage || null,
            createdAt: t.created_at || t.createdAt || new Date().toISOString(),
          }))
        : null;

    const socialReels: SocialReel[] | null =
      reelsRes.status === "fulfilled" && reelsRes.value.data
        ? (reelsRes.value.data as any[]).map((r) => ({
            id: r.id,
            title: r.title,
            videoUrl: r.video_url || r.videoUrl || "",
            platform: r.platform || "instagram",
            thumbnail: r.thumbnail || "",
            creatorName: r.creatorName || "",
            creatorHandle: r.creatorHandle || "",
            duration: r.duration || "00:30",
            productId: r.productId || null,
            enabled: r.enabled ?? true,
          }))
        : null;

    const orders: Order[] | null =
      ordersRes.status === "fulfilled" && ordersRes.value.data
        ? (ordersRes.value.data as any[]).map((o) => ({
            id: o.id,
            reference: o.reference || o.items?.[0]?.reference || (o.id ? `OPT-${String(o.id).slice(0, 6).toUpperCase()}` : "OPT-ORDER"),
            createdAt: o.createdAt || o.created_at || new Date().toISOString(),
            customerName: o.customerName || o.customer_name || "Customer",
            contact: o.contact || o.phone || "",
            productId: o.productId || o.items?.[0]?.productId || null,
            productName: o.productName || o.items?.[0]?.productName || "Glasses",
            variantId: o.variantId || o.items?.[0]?.variantId || null,
            variantLabel: o.variantLabel || o.items?.[0]?.variantLabel || null,
            message: o.message || o.address || "",
            source: o.source || "cart",
            status: (o.status ? (o.status.charAt(0).toUpperCase() + o.status.slice(1).toLowerCase()) : "New") as OrderStatus,
            stockDeducted: o.stockDeducted ?? true,
          }))
        : null;

    return {
      products: productsRes.status === "fulfilled" && productsRes.value.data ? (productsRes.value.data as Product[]) : null,
      categories: categoriesRes.status === "fulfilled" && categoriesRes.value.data ? (categoriesRes.value.data as Category[]) : null,
      collections: collectionsRes.status === "fulfilled" && collectionsRes.value.data ? (collectionsRes.value.data as Collection[]) : null,
      orders,
      heroSlides,
      brands: brandsRes.status === "fulfilled" && brandsRes.value.data ? (brandsRes.value.data as Brand[]) : null,
      socialReels,
      testimonials,
      faqs: faqsRes.status === "fulfilled" && faqsRes.value.data ? (faqsRes.value.data as FAQItem[]) : null,
      subscribers: subscribersRes.status === "fulfilled" && subscribersRes.value.data ? (subscribersRes.value.data as Subscriber[]) : null,
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
 * Automatically seed Supabase tables if they are empty on initial run.
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
    const { count } = await supabase.from("categories").select("*", { count: "exact", head: true });
    if (count === 0 || count === null) {
      console.log("Seeding Supabase database with initial catalog...");
      if (seed.categories.length) await supabase.from("categories").upsert(seed.categories);
      if (seed.collections.length) await supabase.from("collections").upsert(seed.collections);
      if (seed.products.length) await supabase.from("products").upsert(seed.products);
      if (seed.heroSlides.length) await supabase.from("hero_slides").upsert(seed.heroSlides);
      if (seed.brands.length) await supabase.from("brands").upsert(seed.brands);
      if (seed.socialReels.length) await supabase.from("social_reels").upsert(seed.socialReels);
      if (seed.testimonials.length) await supabase.from("testimonials").upsert(seed.testimonials);
      if (seed.faqs.length) await supabase.from("faqs").upsert(seed.faqs);
    }
  } catch (err) {
    console.warn("Auto-seed skipped (tables might not be created yet):", err);
  }
}

// ── CRUD Sync Functions ──

export async function dbUpsertProduct(product: Product) {
  try {
    const payload: any = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      compare_at: product.salePrice || null,
      category_id: product.categoryId || null,
      collection_id: product.collectionId || null,
      image: product.image,
      description: product.description || "",
      stock: product.stock || 0,
      created_at: product.createdAt || new Date().toISOString(),
    };
    await supabase.from("products").upsert(payload);
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
    await supabase.from("collections").upsert({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
    });
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
      items: [
        {
          reference: order.reference,
          productId: order.productId,
          productName: order.productName,
          variantId: order.variantId,
          variantLabel: order.variantLabel,
        },
      ],
      total: 0,
      status: order.status || "New",
      created_at: order.createdAt || new Date().toISOString(),
    };
    await supabase.from("orders").insert(payload);
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
    await supabase.from("hero_slides").upsert({
      id: slide.id,
      title: slide.headline || "",
      subtitle: slide.subtext || "",
      image: slide.image,
      button_text: slide.ctaText || "",
      link: slide.ctaLink || "",
    });
  } catch (e) {
    console.error("Failed to sync hero slide to Supabase:", e);
  }
}

export async function dbUpsertHeroSlides(slides: HeroSlide[]) {
  try {
    const payload = slides.map((s) => ({
      id: s.id,
      title: s.headline || "",
      subtitle: s.subtext || "",
      image: s.image,
      button_text: s.ctaText || "",
      link: s.ctaLink || "",
    }));
    await supabase.from("hero_slides").upsert(payload);
  } catch (e) {
    console.error("Failed to sync hero slides to Supabase:", e);
  }
}

export async function dbUpsertBrand(brand: Brand) {
  try {
    await supabase.from("brands").upsert({
      id: brand.id,
      name: brand.name,
      logo: brand.logo || "",
    });
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
    await supabase.from("social_reels").upsert({
      id: reel.id,
      title: reel.title,
      video_url: reel.videoUrl,
      platform: reel.platform || "instagram",
    });
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
    await supabase.from("testimonials").upsert({
      id: t.id,
      name: t.name,
      review: t.quote || "",
      rating: t.rating || 5,
      avatar: t.photo || "",
      verified: t.verified ?? true,
    });
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
    await supabase.from("faqs").upsert({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category || "General",
    });
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
    await supabase.from("subscribers").insert({
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
