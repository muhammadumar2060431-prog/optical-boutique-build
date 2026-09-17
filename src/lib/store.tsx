import { isSafeUrl, sanitizeHref, sanitizeImageSrc, sanitizeRawInput } from "./security";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import {
  fetchInitialSupabaseData,
  dbUpsertProduct,
  dbDeleteProduct,
  dbUpsertCategory,
  dbDeleteCategory,
  dbUpsertCollection,
  dbDeleteCollection,
  dbInsertOrder,
  dbUpdateOrderStatus,
  dbUpdateOrderCourier,
  dbUpsertHeroSlides,
  dbUpsertHeroSlide,
  dbDeleteHeroSlide,
  dbUpsertBrand,
  dbDeleteBrand,
  dbUpsertSocialReel,
  dbDeleteSocialReel,
  dbUpsertTestimonial,
  dbDeleteTestimonial,
  dbUpsertFaq,
  dbDeleteFaq,
  dbInsertSubscriber,
  dbDeleteSubscriber,
  dbUpsertSettings,
  dbUpsertAnnouncement,
  dbUpsertVideo,
  dbInsertQuery,
  dbUpdateQueryStatus,
  dbDeleteQuery,
  mapDbProductToStore,
  mapDbCategoryToStore,
  mapDbCollectionToStore,
  mapDbHeroSlideToStore,
  mapDbBrandToStore,
  mapDbSocialReelToStore,
  mapDbTestimonialToStore,
  mapDbFaqToStore,
  mapDbQueryToStore,
} from "./supabaseSync";

import {
  seedAnnouncement,
  seedBrands,
  seedCategories,
  seedCollections,
  seedHeroSlides,
  seedOrders,
  seedProducts,
  seedSettings,
  seedSocialReels,
  seedTestimonials,
  seedVideo,
  seedFaqs,
  seedSubscribers,
} from "./seed";
import type {
  AnnouncementSettings,
  Brand,
  Category,
  Collection,
  ContactQuery,
  HeroSlide,
  Order,
  OrderStatus,
  Product,
  SocialReel,
  StockStatus,
  StoreSettings,
  Testimonial,
  Variant,
  VideoSettings,
  FAQItem,
  Subscriber,
} from "./types";

/**
 * In-memory data layer. Every read/write the UI performs goes through the
 * named helpers below, so swapping this for a real backend later means
 * re-implementing this file only.
 */

export interface StoreState {
  categories: Category[];
  collections: Collection[];
  products: Product[];
  orders: Order[];
  queries: ContactQuery[];
  heroSlides: HeroSlide[];
  announcement: AnnouncementSettings;
  testimonials: Testimonial[];
  video: VideoSettings;
  settings: StoreSettings;
  brands: Brand[];
  socialReels: SocialReel[];
  faqs: FAQItem[];
  subscribers: Subscriber[];
  isAdmin: boolean;
}

export interface InventoryRow {
  key: string;
  productId: string;
  variantId: string | null;
  categoryName: string;
  name: string;
  stock: number;
  status: StockStatus;
  updatedAt: string;
}

interface StoreApi extends StoreState {
  /* reads */
  getProducts: (opts?: {
    categoryId?: string;
    collectionId?: string;
    search?: string;
  }) => Product[];
  getProductBySlug: (slug: string) => Product | undefined;
  getProductById: (id: string) => Product | undefined;
  getCategoryBySlug: (slug: string) => Category | undefined;
  getCategoryById: (id: string) => Category | undefined;
  getCollections: (categoryId?: string) => Collection[];
  getCollectionBySlug: (slug: string) => Collection | undefined;
  getCollectionById: (id: string) => Collection | undefined;
  getRelatedProducts: (product: Product, limit?: number) => Product[];
  getInventoryRows: () => InventoryRow[];
  productStock: (product: Product) => number;
  stockStatus: (qty: number) => StockStatus;
  /* writes */
  addOrder: (
    order: Omit<Order, "id" | "createdAt" | "status" | "stockDeducted" | "reference"> & {
      reference?: string;
      stockDeducted?: boolean;
    },
  ) => Order;
  /** Customer-facing lookup: every order sharing one reference code. */
  getOrdersByReference: (reference: string) => Order[];
  setOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderCourier: (
    orderId: string,
    courierName: string | null,
    trackingNumber: string | null,
    status?: OrderStatus,
  ) => void;
  addQuery: (data: Omit<ContactQuery, "id" | "createdAt" | "status">) => ContactQuery;
  setQueryStatus: (id: string, status: "New" | "Responded" | "Archived") => void;
  deleteQuery: (id: string) => void;
  saveProduct: (product: Product) => Promise<void> | void;
  deleteProduct: (id: string) => void;
  moveProduct: (id: string, dir: -1 | 1) => void;
  saveCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  moveCategory: (id: string, dir: -1 | 1) => void;
  saveCollection: (collection: Collection) => void;
  deleteCollection: (id: string) => void;
  saveVariant: (productId: string, variant: Variant) => void;
  deleteVariant: (productId: string, variantId: string) => void;
  updateStock: (productId: string, variantId: string | null, qty: number) => void;
  /** Current stock for a product or one of its variants. */
  getStockFor: (productId: string, variantId: string | null) => number;
  /** Relative stock change (negative to deduct). */
  adjustStock: (productId: string, variantId: string | null, delta: number) => void;
  setHeroSlides: (slides: HeroSlide[]) => void;
  updateHeroSlide: (id: string, patch: Partial<HeroSlide>) => void;
  deleteHeroSlide: (id: string) => void;
  moveHeroSlide: (id: string, dir: -1 | 1) => void;
  updateAnnouncement: (patch: Partial<AnnouncementSettings>) => void;
  saveTestimonial: (t: Testimonial) => void;
  deleteTestimonial: (id: string) => void;
  moveTestimonial: (id: string, dir: -1 | 1) => void;
  lockChannel: (channel: string) => void;
  submitVideoUrl: (url: string) => { ok: boolean; error?: string };
  updateVideoCaption: (caption: string) => void;
  updateSettings: (patch: Partial<StoreSettings>) => void;
  saveBrand: (brand: Brand) => void;
  deleteBrand: (id: string) => void;
  moveBrand: (id: string, dir: -1 | 1) => void;
  saveSocialReel: (reel: SocialReel) => void;
  deleteSocialReel: (id: string) => void;
  moveSocialReel: (id: string, dir: -1 | 1) => void;
  setSocialReels: (reels: SocialReel[]) => void;
  saveFaq: (faq: FAQItem) => void;
  deleteFaq: (id: string) => void;
  moveFaq: (id: string, dir: -1 | 1) => void;
  setFaqs: (faqs: FAQItem[]) => void;
  addSubscriber: (email: string) => { ok: boolean; message: string };
  deleteSubscriber: (id: string) => void;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }> | boolean;
  logout: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const nowIso = () => new Date().toISOString();

/** Customer-facing order reference, e.g. "OPT-482915". */
export function newOrderReference() {
  return `OPT-${Math.floor(100000 + Math.random() * 900000)}`;
}

/** Extracts a YouTube video id from most common URL shapes. */
export function parseYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  return match?.[1] ?? null;
}

/**
 * Mock channel resolver. A real backend would call the YouTube Data API;
 * here the channel handle is read from the URL (?channel=@handle) or from
 * a youtube.com/@handle/... style link.
 */
export function parseYouTubeChannel(url: string): string | null {
  const handle = url.match(/@([A-Za-z0-9_.-]+)/);
  return handle?.[1] ? `@${handle[1]}` : null;
}

function getSaved<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`optique_v1_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveItem<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`optique_v1_${key}`, JSON.stringify(val));
  } catch (err: any) {
    // QuotaExceededError: images are too large for localStorage
    // For products, strip base64 image data and retry with URL-only version
    if (key === "products" && err?.name === "QuotaExceededError") {
      try {
        const stripped = (val as any[]).map((p: any) => ({
          ...p,
          // Keep URL-like images (start with / or http), strip base64 blobs
          image: p.image && !p.image.startsWith("data:") ? p.image : "",
          hoverImage: p.hoverImage && !p.hoverImage.startsWith("data:") ? p.hoverImage : null,
          newArrivalImage: p.newArrivalImage && !p.newArrivalImage.startsWith("data:") ? p.newArrivalImage : null,
          subImages: Array.isArray(p.subImages)
            ? p.subImages.filter((s: string) => s && !s.startsWith("data:"))
            : [],
          details: {
            ...(p.details || {}),
            subImages: Array.isArray(p.details?.subImages)
              ? p.details.subImages.filter((s: string) => s && !s.startsWith("data:"))
              : [],
          },
        }));
        localStorage.setItem(`optique_v1_${key}`, JSON.stringify(stripped));
      } catch {
        // If still failing, clear products from localStorage entirely
        // Supabase will be the source of truth on next load
        console.warn(`[saveItem] localStorage full for '${key}', clearing cache. Supabase is source of truth.`);
        try { localStorage.removeItem(`optique_v1_${key}`); } catch {}
      }
    } else {
      console.warn(`Failed to save ${key} to localStorage`, err);
    }
  }
}

function parseOrderRecord(raw: any, existing?: Order): Order {
  return {
    id: raw?.id || existing?.id || "ord-" + Math.random().toString(36).slice(2, 9),
    reference:
      raw?.reference ||
      existing?.reference ||
      raw?.items?.[0]?.reference ||
      (raw?.id ? `OPT-${String(raw.id).slice(0, 6).toUpperCase()}` : "OPT-ORDER"),
    createdAt: raw?.createdAt || raw?.created_at || existing?.createdAt || new Date().toISOString(),
    customerName: raw?.customerName || raw?.customer_name || existing?.customerName || "Customer",
    contact: raw?.contact || raw?.phone || existing?.contact || "",
    productId: raw?.productId || raw?.items?.[0]?.productId || existing?.productId || null,
    productName:
      raw?.productName || raw?.items?.[0]?.productName || existing?.productName || "Glasses",
    variantId: raw?.variantId || raw?.items?.[0]?.variantId || existing?.variantId || null,
    variantLabel:
      raw?.variantLabel || raw?.items?.[0]?.variantLabel || existing?.variantLabel || null,
    message: raw?.message || raw?.address || existing?.message || "",
    source:
      raw?.source ||
      raw?.items?.[0]?.source ||
      existing?.source ||
      ((raw?.productName || raw?.items?.[0]?.productName || "").toLowerCase().includes("whatsapp")
        ? "whatsapp"
        : "cart"),
    status: (raw?.status
      ? raw.status.charAt(0).toUpperCase() + raw.status.slice(1).toLowerCase()
      : existing?.status || "New") as OrderStatus,
    stockDeducted: raw?.stockDeducted ?? existing?.stockDeducted ?? true,
    courierName: raw?.courierName || raw?.courier_name || existing?.courierName || null,
    trackingNumber: raw?.trackingNumber || raw?.tracking_number || existing?.trackingNumber || null,
    dispatchedAt: raw?.dispatchedAt || raw?.dispatched_at || existing?.dispatchedAt || null,
  };
}

function getInitialCached<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`optique_v1_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed !== null && parsed !== undefined) {
        if (Array.isArray(fallback)) {
          if (Array.isArray(parsed) && parsed.length > 0) return parsed as unknown as T;
        } else if (typeof fallback === "object") {
          return { ...fallback, ...parsed } as T;
        }
      }
    }
  } catch {}
  return fallback;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(() => getInitialCached("categories", seedCategories));
  const [collections, setCollections] = useState<Collection[]>(() => getInitialCached("collections", seedCollections));
  const [products, setProducts] = useState<Product[]>(() => getInitialCached("products", seedProducts));
  const [orders, setOrders] = useState<Order[]>(() => getInitialCached("orders", seedOrders));
  const [queries, setQueries] = useState<ContactQuery[]>(() => getInitialCached("queries", []));
  const [heroSlides, setHeroSlidesState] = useState<HeroSlide[]>(() => getInitialCached("heroSlides", seedHeroSlides));
  const [announcement, setAnnouncement] = useState<AnnouncementSettings>(() => getInitialCached("announcement", seedAnnouncement));
  const [testimonials, setTestimonials] = useState<Testimonial[]>(() => getInitialCached("testimonials", seedTestimonials));
  const [video, setVideo] = useState<VideoSettings>(() => getInitialCached("video", seedVideo));
  const [settings, setSettings] = useState<StoreSettings>(() => getInitialCached("settings", seedSettings));
  const [brands, setBrands] = useState<Brand[]>(() => getInitialCached("brands", seedBrands));
  const [socialReels, setSocialReelsState] = useState<SocialReel[]>(() => getInitialCached("socialReels", seedSocialReels));
  const [faqs, setFaqsState] = useState<FAQItem[]>(() => getInitialCached("faqs", seedFaqs));
  const [subscribers, setSubscribersState] = useState<Subscriber[]>(() => getInitialCached("subscribers", seedSubscribers));
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("optique_admin_session") === "true";
    }
    return false;
  });
  const [hydrated, setHydrated] = useState(false);
  const localSavedContent = useRef({ announcement: false, brands: false, socialReels: false });

  // Client-only localStorage hydration to eliminate SSR hydration mismatch
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("optique_admin_session") === "true") {
        setIsAdmin(true);
      }
    }
    try {
      // Normal hydration: load whatever the user has saved
      const load = <T,>(key: string, setter: (val: T) => void) => {
        const raw = localStorage.getItem(`optique_v1_${key}`);
        if (raw) {
          try {
            setter(JSON.parse(raw));
            if (key === "announcement" || key === "brands" || key === "socialReels") {
              localSavedContent.current[key] = true;
            }
          } catch {}
        }
      };
      load<Category[]>("categories", setCategories);
      load<Collection[]>("collections", setCollections);
      load<Product[]>("products", setProducts);
      load<Order[]>("orders", setOrders);
      load<ContactQuery[]>("queries", setQueries);
      load<HeroSlide[]>("heroSlides", setHeroSlidesState);
      load<AnnouncementSettings>("announcement", setAnnouncement);
      load<Testimonial[]>("testimonials", setTestimonials);
      load<VideoSettings>("video", setVideo);
      load<StoreSettings>("settings", (s) => {
        // Purge any legacy adminPassword from hydrated settings
        if ("adminPassword" in (s as any)) {
          delete (s as any).adminPassword;
        }
        setSettings(s);
      });
      // Purge legacy adminPassword from localStorage key
      const rawSettings = localStorage.getItem("optique_v1_settings");
      if (rawSettings) {
        try {
          const parsed = JSON.parse(rawSettings);
          if ("adminPassword" in parsed) {
            delete parsed.adminPassword;
          }
          localStorage.setItem("optique_v1_settings", JSON.stringify(parsed));
        } catch {}
      }
      load<Brand[]>("brands", setBrands);
      load<SocialReel[]>("socialReels", setSocialReelsState);
      load<FAQItem[]>("faqs", setFaqsState);
      load<Subscriber[]>("subscribers", setSubscribersState);
    } catch {}
    setHydrated(true);
  }, []);

  // ── Listen to Supabase Auth State for Admin Session ──
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Check initial Supabase Auth session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setIsAdmin(true);
        if (typeof window !== "undefined") {
          localStorage.setItem("optique_admin_session", "true");
        }
      }
    });

    // Listen to live Auth state changes (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || session?.user) {
        setIsAdmin(true);
        if (typeof window !== "undefined") {
          localStorage.setItem("optique_admin_session", "true");
        }
      } else if (event === "SIGNED_OUT") {
        setIsAdmin(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem("optique_admin_session");
          localStorage.removeItem("optique_admin_session_token");
        }
      }
    });

    return () => {
      authListener.subscription?.unsubscribe();
    };
  }, []);
  const [stockTouched, setStockTouched] = useState<Record<string, string>>({});

  // ── Auto-persist to localStorage on every change (after initial mount) ──
  useEffect(() => {
    if (hydrated) saveItem("categories", categories);
  }, [categories, hydrated]);
  useEffect(() => {
    if (hydrated) saveItem("collections", collections);
  }, [collections, hydrated]);
  useEffect(() => {
    if (hydrated) saveItem("products", products);
  }, [products, hydrated]);
  useEffect(() => {
    if (hydrated) saveItem("orders", orders);
  }, [orders, hydrated]);
  useEffect(() => {
    if (hydrated) saveItem("queries", queries);
  }, [queries, hydrated]);
  useEffect(() => {
    if (hydrated) saveItem("heroSlides", heroSlides);
  }, [heroSlides, hydrated]);
  useEffect(() => {
    if (hydrated) saveItem("announcement", announcement);
  }, [announcement, hydrated]);
  useEffect(() => {
    if (hydrated) saveItem("testimonials", testimonials);
  }, [testimonials, hydrated]);
  useEffect(() => {
    if (hydrated) saveItem("video", video);
  }, [video, hydrated]);
  useEffect(() => {
    if (hydrated) saveItem("settings", settings);
  }, [settings, hydrated]);
  useEffect(() => {
    if (hydrated) saveItem("brands", brands);
  }, [brands, hydrated]);
  useEffect(() => {
    if (hydrated) saveItem("socialReels", socialReels);
  }, [socialReels, hydrated]);
  useEffect(() => {
    if (hydrated) saveItem("faqs", faqs);
  }, [faqs, hydrated]);
  useEffect(() => {
    if (hydrated) saveItem("subscribers", subscribers);
  }, [subscribers, hydrated]);

  // Track IDs that were JUST saved by this client so the real-time echo
  // doesn't overwrite the freshly-saved local state with stale DB payload.
  const recentlySavedRef = useRef<Set<string>>(new Set());

  // ── Supabase Real-Time Sync & Initial Hydration ──
  useEffect(() => {
    // No database configured yet — stay on local demo data
    if (!isSupabaseConfigured) return;
    if (!hydrated) return;

    let isSubscribed = true;

    async function initSupabaseData() {
      // 1. Fetch fresh synchronized data
      const data = await fetchInitialSupabaseData();
      if (!isSubscribed || !data) return;

      if (data.categories !== null) {
        setCategories([...data.categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      }
      if (data.collections !== null) setCollections(data.collections);
      if (data.products !== null) {
        setProducts((prevLocalProducts) => {
          const localMap = new Map(prevLocalProducts.map((p) => [p.id, p]));

          const mergedProducts = data.products!.map((dbProd) => {
            const localProd = localMap.get(dbProd.id);

            // Ensure subImages come from DB or local fallback
            const dbSubImages = (
              Array.isArray(dbProd.subImages) && dbProd.subImages.length > 0
                ? dbProd.subImages
                : Array.isArray((dbProd.details as any)?.subImages) && (dbProd.details as any).subImages.length > 0
                  ? (dbProd.details as any).subImages
                  : Array.isArray((dbProd as any).images) && (dbProd as any).images.length > 0
                    ? (dbProd as any).images
                    : []
            ).filter((s: any) => typeof s === "string" && s.trim().length > 0);

            const localSubImages = localProd?.subImages || [];
            const resolvedSubImages = dbSubImages.length > 0 ? dbSubImages : localSubImages;

            // Resolve primary image from dbProd, localProd, or subImages
            const dbImageValid = dbProd.image && dbProd.image !== "/placeholder.svg" && dbProd.image.trim().length > 0;
            const localImageValid = localProd?.image && localProd.image !== "/placeholder.svg" && localProd.image.trim().length > 0;
            const subImageValid = resolvedSubImages.find((s: string) => s && s !== "/placeholder.svg" && s.trim().length > 0);

            const resolvedImage = dbImageValid
              ? dbProd.image
              : localImageValid
                ? localProd.image
                : subImageValid || dbProd.image || "/placeholder.svg";

            const finalProd = {
              ...dbProd,
              image: resolvedImage,
              subImages: resolvedSubImages,
              details: {
                ...(dbProd.details || {}),
                subImages: resolvedSubImages,
              },
            };

            // If we restored a local image that DB was missing, push it back to Supabase!
            if (!dbImageValid && localImageValid) {
              dbUpsertProduct(finalProd);
            }

            return finalProd;
          });

          saveItem("products", mergedProducts);
          return mergedProducts;
        });
      }
      if (data.orders !== null) {
        const fetchedOrders = data.orders;
        setOrders((prev) => {
          const map = new Map(prev.map((o) => [o.id, o]));
          return fetchedOrders.map((o) => parseOrderRecord(o, map.get(o.id)));
        });
      }
      if (data.queries !== null && data.queries !== undefined) setQueries(data.queries);
      if (data.heroSlides !== null) {
        setHeroSlidesState((prev) => {
          if (data.heroSlides!.length > 0) return data.heroSlides!;
          if (prev.length > 0) {
            dbUpsertHeroSlides(prev);
            return prev;
          }
          return [];
        });
      }
      if (data.brands !== null) {
        setBrands((prev) => {
          if (localSavedContent.current.brands) {
            prev.forEach(dbUpsertBrand);
            return prev;
          }
          return data.brands!.length > 0 ? data.brands! : prev;
        });
      }
      if (data.socialReels !== null) {
        setSocialReelsState((prev) => {
          if (localSavedContent.current.socialReels) {
            prev.forEach(dbUpsertSocialReel);
            return prev;
          }
          return data.socialReels!.length > 0 ? data.socialReels! : prev;
        });
      }
      if (data.testimonials !== null) setTestimonials(data.testimonials);
      if (data.faqs !== null) setFaqsState(data.faqs);
      if (data.subscribers !== null) setSubscribersState(data.subscribers);
      if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
      if (data.announcement) {
        setAnnouncement((prev) => {
          if (localSavedContent.current.announcement) {
            dbUpsertAnnouncement(prev);
            return prev;
          }
          return { ...prev, ...data.announcement };
        });
      }
      if (data.video) setVideo((prev) => ({ ...prev, ...data.video }));
    }

    initSupabaseData();

    // 3. Real-time WebSocket replication channel
    const channel = supabase
      .channel("public-db-changes")
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        const table = payload.table;
        const eventType = payload.eventType;
        const newRecord = payload.new as any;
        const oldRecord = payload.old as any;

        if (table === "products") {
          if (eventType === "DELETE") {
            setProducts((prev) => {
              const next = prev.filter((p) => p.id !== oldRecord.id);
              saveItem("products", next);
              return next;
            });
          } else if (eventType === "INSERT") {
            const mapped = mapDbProductToStore(newRecord);
            // Ensure subImages are included from details JSONB
            const subImages = (
              Array.isArray(mapped.subImages) && mapped.subImages.length > 0
                ? mapped.subImages
                : Array.isArray((mapped.details as any)?.subImages)
                  ? (mapped.details as any).subImages
                  : []
            ).filter((s: any) => typeof s === "string" && s.trim().length > 0);
            const fullMapped = { ...mapped, subImages, details: { ...(mapped.details || {}), subImages } };
            setProducts((prev) => {
              const next = [fullMapped, ...prev.filter((p) => p.id !== fullMapped.id)];
              saveItem("products", next);
              return next;
            });
          } else if (eventType === "UPDATE") {
            // Skip real-time echo for products we JUST saved ourselves
            // (prevents the DB echo from overwriting our clean local state)
            if (recentlySavedRef.current.has(newRecord.id)) {
              recentlySavedRef.current.delete(newRecord.id);
              return;
            }
            const mapped = mapDbProductToStore(newRecord);
            const subImages = (
              Array.isArray(mapped.subImages) && mapped.subImages.length > 0
                ? mapped.subImages
                : Array.isArray((mapped.details as any)?.subImages)
                  ? (mapped.details as any).subImages
                  : []
            ).filter((s: any) => typeof s === "string" && s.trim().length > 0);
            const fullMapped = { ...mapped, subImages, details: { ...(mapped.details || {}), subImages } };
            setProducts((prev) => {
              const next = prev.map((p) => (p.id === fullMapped.id ? fullMapped : p));
              saveItem("products", next);
              return next;
            });
          }
        } else if (table === "categories") {
          if (eventType === "DELETE")
            setCategories((prev) => prev.filter((c) => c.id !== oldRecord.id));
          else if (eventType === "INSERT") {
            const mapped = mapDbCategoryToStore(newRecord);
            setCategories((prev) =>
              [...prev.filter((c) => c.id !== mapped.id), mapped].sort(
                (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
              ),
            );
          } else if (eventType === "UPDATE") {
            const mapped = mapDbCategoryToStore(newRecord);
            setCategories((prev) =>
              prev
                .map((c) => (c.id === mapped.id ? mapped : c))
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
            );
          }
        } else if (table === "collections") {
          if (eventType === "DELETE")
            setCollections((prev) => prev.filter((c) => c.id !== oldRecord.id));
          else if (eventType === "INSERT") {
            const mapped = mapDbCollectionToStore(newRecord);
            setCollections((prev) => [...prev.filter((c) => c.id !== mapped.id), mapped]);
          } else if (eventType === "UPDATE") {
            const mapped = mapDbCollectionToStore(newRecord);
            setCollections((prev) => prev.map((c) => (c.id === mapped.id ? mapped : c)));
          }
        } else if (table === "orders") {
          if (eventType === "INSERT") {
            setOrders((prev) => {
              const existing = prev.find((o) => o.id === newRecord.id);
              const mapped = parseOrderRecord(newRecord, existing);
              return [mapped, ...prev.filter((o) => o.id !== newRecord.id)];
            });
          } else if (eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) => (o.id === newRecord.id ? parseOrderRecord(newRecord, o) : o)),
            );
          }
        } else if (table === "hero_slides") {
          if (eventType === "UPDATE" || eventType === "INSERT") {
            const mapped = mapDbHeroSlideToStore(newRecord);
            setHeroSlidesState((prev) => {
              const exists = prev.some((s) => s.id === mapped.id);
              return exists
                ? prev.map((s) => (s.id === mapped.id ? mapped : s))
                : [...prev, mapped];
            });
          } else if (eventType === "DELETE") {
            setHeroSlidesState((prev) => prev.filter((s) => s.id !== oldRecord.id));
          }
        } else if (table === "brands") {
          if (localSavedContent.current.brands) return;
          if (eventType === "DELETE")
            setBrands((prev) => prev.filter((b) => b.id !== oldRecord.id));
          else if (eventType === "INSERT") {
            const mapped = mapDbBrandToStore(newRecord);
            setBrands((prev) => [...prev.filter((b) => b.id !== mapped.id), mapped]);
          } else if (eventType === "UPDATE") {
            const mapped = mapDbBrandToStore(newRecord);
            setBrands((prev) => prev.map((b) => (b.id === mapped.id ? mapped : b)));
          }
        } else if (table === "social_reels") {
          if (localSavedContent.current.socialReels) return;
          if (eventType === "DELETE")
            setSocialReelsState((prev) => prev.filter((r) => r.id !== oldRecord.id));
          else if (eventType === "INSERT") {
            const mapped = mapDbSocialReelToStore(newRecord);
            setSocialReelsState((prev) => [...prev.filter((r) => r.id !== mapped.id), mapped]);
          } else if (eventType === "UPDATE") {
            const mapped = mapDbSocialReelToStore(newRecord);
            setSocialReelsState((prev) => prev.map((r) => (r.id === mapped.id ? mapped : r)));
          }
        } else if (table === "store_settings") {
          if (newRecord) setSettings((prev) => ({ ...prev, ...newRecord }));
        } else if (table === "announcements") {
          if (localSavedContent.current.announcement) return;
          if (newRecord) {
            setAnnouncement((prev) => ({
              ...prev,
              enabled: newRecord.enabled ?? newRecord.active ?? prev.enabled,
              messages: Array.isArray(newRecord.messages)
                ? newRecord.messages
                : newRecord.text
                  ? String(newRecord.text)
                      .split("\n")
                      .filter((message) => message.trim().length > 0)
                  : newRecord.message
                    ? String(newRecord.message)
                        .split("\n")
                        .filter((message) => message.trim().length > 0)
                    : prev.messages,
              background: newRecord.background || newRecord.bg_color || prev.background,
              textColor: newRecord.text_color || prev.textColor,
            }));
          }
        } else if (table === "testimonials") {
          if (eventType === "DELETE")
            setTestimonials((prev) => prev.filter((t) => t.id !== oldRecord.id));
          else if (eventType === "INSERT" || eventType === "UPDATE") {
            const mapped = mapDbTestimonialToStore(newRecord);
            setTestimonials((prev) =>
              prev.some((t) => t.id === mapped.id)
                ? prev.map((t) => (t.id === mapped.id ? mapped : t))
                : [...prev, mapped],
            );
          }
        } else if (table === "faqs") {
          if (eventType === "DELETE")
            setFaqsState((prev) => prev.filter((f) => f.id !== oldRecord.id));
          else if (eventType === "INSERT" || eventType === "UPDATE") {
            const mapped = mapDbFaqToStore(newRecord);
            setFaqsState((prev) =>
              prev.some((f) => f.id === mapped.id)
                ? prev.map((f) => (f.id === mapped.id ? mapped : f))
                : [...prev, mapped],
            );
          }
        } else if (table === "subscribers") {
          if (eventType === "DELETE")
            setSubscribersState((prev) => prev.filter((s) => s.id !== oldRecord.id));
          else if (eventType === "INSERT")
            setSubscribersState((prev) => [
              newRecord,
              ...prev.filter((s) => s.id !== newRecord.id),
            ]);
        } else if (table === "queries") {
          if (eventType === "DELETE")
            setQueries((prev) => prev.filter((q) => q.id !== oldRecord.id));
          else if (eventType === "INSERT" || eventType === "UPDATE") {
            const mapped = mapDbQueryToStore(newRecord);
            setQueries((prev) =>
              prev.some((q) => q.id === mapped.id)
                ? prev.map((q) => (q.id === mapped.id ? mapped : q))
                : [mapped, ...prev],
            );
          }
        }
      })
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [hydrated]);

  const productStock = useCallback(
    (product: Product) =>
      product.variants.length
        ? product.variants.reduce((sum, v) => sum + v.stock, 0)
        : product.stock,
    [],
  );

  const stockStatus = useCallback(
    (qty: number): StockStatus => {
      if (qty <= 0) return "Out of stock";
      if (qty <= settings.lowStockThreshold) return "Low stock";
      return "In stock";
    },
    [settings.lowStockThreshold],
  );

  const getProducts = useCallback<StoreApi["getProducts"]>(
    (opts) =>
      products.filter((p) => {
        if (opts?.categoryId && p.categoryId !== opts.categoryId) return false;
        if (opts?.collectionId && p.collectionId !== opts.collectionId) return false;
        if (opts?.search && !p.name.toLowerCase().includes(opts.search.toLowerCase())) return false;
        return true;
      }),
    [products],
  );

  const getProductBySlug = useCallback(
    (slug: string) => products.find((p) => p.slug === slug),
    [products],
  );
  const getProductById = useCallback((id: string) => products.find((p) => p.id === id), [products]);
  const getCategoryBySlug = useCallback(
    (slug: string) => categories.find((c) => c.slug === slug),
    [categories],
  );
  const getCategoryById = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories],
  );
  const getCollections = useCallback<StoreApi["getCollections"]>(
    (categoryId) =>
      categoryId ? collections.filter((col) => col.categoryId === categoryId) : collections,
    [collections],
  );
  const getCollectionBySlug = useCallback(
    (slug: string) => collections.find((c) => c.slug === slug),
    [collections],
  );
  const getCollectionById = useCallback(
    (id: string) => collections.find((c) => c.id === id),
    [collections],
  );

  const getRelatedProducts = useCallback(
    (product: Product, limit = 4) =>
      products
        .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
        .slice(0, limit),
    [products],
  );

  const getInventoryRows = useCallback<StoreApi["getInventoryRows"]>(() => {
    const rows: InventoryRow[] = [];
    for (const p of products) {
      const catName = categories.find((c) => c.id === p.categoryId)?.name ?? "—";
      if (p.variants.length) {
        for (const v of p.variants) {
          const key = `${p.id}:${v.id}`;
          rows.push({
            key,
            productId: p.id,
            variantId: v.id,
            categoryName: catName,
            name: `${p.name} — ${v.label}`,
            stock: v.stock,
            status: stockStatus(v.stock),
            updatedAt: stockTouched[key] ?? p.createdAt,
          });
        }
      } else {
        const key = `${p.id}:base`;
        rows.push({
          key,
          productId: p.id,
          variantId: null,
          categoryName: catName,
          name: p.name,
          stock: p.stock,
          status: stockStatus(p.stock),
          updatedAt: stockTouched[key] ?? p.createdAt,
        });
      }
    }
    return rows;
  }, [products, categories, stockStatus, stockTouched]);

  const applyStockDelta = useCallback(
    (productId: string, variantId: string | null, delta: number) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          let updated: Product;
          if (variantId) {
            updated = {
              ...p,
              variants: p.variants.map((v) =>
                v.id === variantId ? { ...v, stock: Math.max(0, v.stock + delta) } : v,
              ),
            };
          } else {
            updated = { ...p, stock: Math.max(0, p.stock + delta) };
          }
          dbUpsertProduct(updated);
          return updated;
        }),
      );
      setStockTouched((prev) => ({ ...prev, [`${productId}:${variantId ?? "base"}`]: nowIso() }));
    },
    [],
  );

  const updateStock = useCallback<StoreApi["updateStock"]>((productId, variantId, qty) => {
    const safe = Math.max(0, Math.round(qty) || 0);
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        let updated: Product;
        if (variantId) {
          updated = {
            ...p,
            variants: p.variants.map((v) => (v.id === variantId ? { ...v, stock: safe } : v)),
          };
        } else {
          updated = { ...p, stock: safe };
        }
        dbUpsertProduct(updated);
        return updated;
      }),
    );
    setStockTouched((prev) => ({ ...prev, [`${productId}:${variantId ?? "base"}`]: nowIso() }));
  }, []);

  const getStockFor = useCallback<StoreApi["getStockFor"]>(
    (productId, variantId) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return 0;
      if (variantId) return product.variants.find((v) => v.id === variantId)?.stock ?? 0;
      return product.variants.length
        ? product.variants.reduce((n, v) => n + v.stock, 0)
        : product.stock;
    },
    [products],
  );

  const addOrder = useCallback<StoreApi["addOrder"]>((data) => {
    const { stockDeducted = false, ...rest } = data;
    const order: Order = {
      ...rest,
      reference: rest.reference?.trim() || newOrderReference(),
      id: uid("ord"),
      createdAt: nowIso(),
      status: "New",
      stockDeducted,
    };
    setOrders((prev) => [order, ...prev]);
    dbInsertOrder(order);
    return order;
  }, []);

  const getOrdersByReference = useCallback<StoreApi["getOrdersByReference"]>(
    (reference) => {
      if (!reference) return [];
      const needle = reference.trim().toLowerCase();
      if (!needle) return [];
      return orders.filter((o) => (o.reference || "").trim().toLowerCase() === needle);
    },
    [orders],
  );

  const setOrderStatus = useCallback<StoreApi["setOrderStatus"]>(
    (orderId, status) => {
      let nextDeducted = false;
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          let stockDeducted = o.stockDeducted;
          if (status === "Completed" && !o.stockDeducted && o.productId) {
            applyStockDelta(o.productId, o.variantId, -1);
            stockDeducted = true;
          }
          if (status === "Cancelled" && o.stockDeducted && o.productId) {
            applyStockDelta(o.productId, o.variantId, 1);
            stockDeducted = false;
          }
          nextDeducted = stockDeducted;
          return { ...o, status, stockDeducted };
        }),
      );
      dbUpdateOrderStatus(orderId, status, nextDeducted);
    },
    [applyStockDelta],
  );

  const updateOrderCourier = useCallback<StoreApi["updateOrderCourier"]>(
    (orderId, courierName, trackingNumber, status = "Dispatched") => {
      const dispatchedAt = nowIso();
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            status,
            courierName,
            trackingNumber,
            dispatchedAt: o.dispatchedAt || dispatchedAt,
          };
        }),
      );
      dbUpdateOrderCourier(orderId, courierName, trackingNumber, status, dispatchedAt);
    },
    [],
  );

  const addQuery = useCallback<StoreApi["addQuery"]>((data) => {
    const query: ContactQuery = {
      ...data,
      id: uid("qry"),
      createdAt: nowIso(),
      status: "New",
    };
    setQueries((prev) => [query, ...prev]);
    dbInsertQuery(query);
    return query;
  }, []);

  const setQueryStatus = useCallback<StoreApi["setQueryStatus"]>((id, status) => {
    setQueries((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
    dbUpdateQueryStatus(id, status);
  }, []);

  const deleteQuery = useCallback<StoreApi["deleteQuery"]>((id) => {
    setQueries((prev) => prev.filter((q) => q.id !== id));
    dbDeleteQuery(id);
  }, []);

  const saveProduct = useCallback<StoreApi["saveProduct"]>(async (product) => {
    // Preserve existing ID or generate new one
    const finalId = product.id?.trim() ? product.id : uid("prd");

    // CRITICAL: Preserve existing slug for edits. Only generate new slug for new products.
    const finalSlug = product.slug?.trim()
      ? product.slug.trim()
      : product.name?.trim()
        ? product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || finalId
        : finalId;

    const cleanSubImages = (
      Array.isArray(product.subImages) && product.subImages.length > 0
        ? product.subImages
        : Array.isArray((product.details as any)?.subImages)
          ? (product.details as any).subImages
          : []
    )
      .filter((s: any) => typeof s === "string" && s.trim().length > 0)
      .slice(0, 3);

    const fullProduct: Product = {
      ...product,
      id: finalId,
      slug: finalSlug,
      price: Math.max(0, Number(product.price) || 0),
      salePrice: product.salePrice != null && !isNaN(Number(product.salePrice)) && Number(product.salePrice) > 0
        ? Number(product.salePrice)
        : null,
      stock: Math.max(0, Math.round(Number(product.stock) || 0)),
      subImages: cleanSubImages,
      details: {
        ...(product.details || {}),
        subImages: cleanSubImages,
      },
    };

    // Mark this product ID so real-time echo won't overwrite our clean state
    recentlySavedRef.current.add(finalId);
    // Auto-clear after 5 seconds (in case the real-time event is delayed)
    setTimeout(() => recentlySavedRef.current.delete(finalId), 5000);

    // 1. Update local state immediately
    setProducts((prev) => {
      const next = prev.some((p) => p.id === fullProduct.id)
        ? prev.map((p) => (p.id === fullProduct.id ? fullProduct : p))
        : [fullProduct, ...prev];
      saveItem("products", next);
      return next;
    });

    // 2. Persist to Supabase
    const result = await dbUpsertProduct(fullProduct);
    if (!result.success) {
      console.error("[saveProduct] Supabase sync failed:", result.error);
    }
  }, []);

  const deleteProduct = useCallback<StoreApi["deleteProduct"]>((id) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveItem("products", next);
      return next;
    });
    setSocialReelsState((prev) => {
      const next = prev.map((r) => (r.productId === id ? { ...r, productId: null } : r));
      saveItem("socialReels", next);
      next.filter((r, i) => r !== prev[i]).forEach(dbUpsertSocialReel);
      return next;
    });
    setTestimonials((prev) => {
      const next = prev.map((t) =>
        t.productId === id ? { ...t, productId: null, productName: null } : t,
      );
      saveItem("testimonials", next);
      next.filter((t, i) => t !== prev[i]).forEach(dbUpsertTestimonial);
      return next;
    });
    dbDeleteProduct(id);
  }, []);

  const moveProduct = useCallback<StoreApi["moveProduct"]>((id, dir) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const nextIndex = idx + dir;
      if (idx < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const a = copy[idx]!;
      const b = copy[nextIndex]!;
      copy[idx] = b;
      copy[nextIndex] = a;
      saveItem("products", copy);
      return copy;
    });
  }, []);

  const saveCategory = useCallback<StoreApi["saveCategory"]>((category) => {
    const fullCat = { ...category, id: category.id || uid("cat") };
    setCategories((prev) => {
      const next = prev.some((c) => c.id === fullCat.id)
        ? prev.map((c) => (c.id === fullCat.id ? fullCat : c))
        : [...prev, fullCat];
      saveItem("categories", next);
      return next;
    });
    dbUpsertCategory(fullCat);
  }, []);

  const deleteCategory = useCallback<StoreApi["deleteCategory"]>(
    (id) => {
      const removedProductIds = products.filter((p) => p.categoryId === id).map((p) => p.id);
      const removedCollectionIds = collections
        .filter((col) => col.categoryId === id)
        .map((col) => col.id);

      setCategories((prev) => {
        const next = prev.filter((c) => c.id !== id);
        saveItem("categories", next);
        return next;
      });
      setCollections((prev) => {
        const next = prev.filter((col) => col.categoryId !== id);
        saveItem("collections", next);
        return next;
      });
      setProducts((prev) => {
        const next = prev.filter((p) => p.categoryId !== id);
        saveItem("products", next);
        return next;
      });
      setSocialReelsState((prev) => {
        const next = prev.map((r) =>
          r.productId && removedProductIds.includes(r.productId) ? { ...r, productId: null } : r,
        );
        saveItem("socialReels", next);
        next.filter((r, i) => r !== prev[i]).forEach(dbUpsertSocialReel);
        return next;
      });
      setTestimonials((prev) => {
        const next = prev.map((t) =>
          t.productId && removedProductIds.includes(t.productId)
            ? { ...t, productId: null, productName: null }
            : t,
        );
        saveItem("testimonials", next);
        next.filter((t, i) => t !== prev[i]).forEach(dbUpsertTestimonial);
        return next;
      });

      removedProductIds.forEach(dbDeleteProduct);
      removedCollectionIds.forEach(dbDeleteCollection);
      dbDeleteCategory(id);
    },
    [collections, products],
  );

  const moveCategory = useCallback<StoreApi["moveCategory"]>((id, dir) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      const nextIndex = idx + dir;
      if (idx < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const a = copy[idx]!;
      const b = copy[nextIndex]!;
      copy[idx] = b;
      copy[nextIndex] = a;
      const ordered = copy.map((cat, i) => ({ ...cat, sortOrder: i }));
      saveItem("categories", ordered);
      ordered.forEach(dbUpsertCategory);
      return ordered;
    });
  }, []);

  const saveCollection = useCallback<StoreApi["saveCollection"]>((collection) => {
    const fullCol = { ...collection, id: collection.id || uid("col") };
    setCollections((prev) => {
      const next = prev.some((c) => c.id === fullCol.id)
        ? prev.map((c) => (c.id === fullCol.id ? fullCol : c))
        : [...prev, fullCol];
      saveItem("collections", next);
      return next;
    });
    dbUpsertCollection(fullCol);
  }, []);

  const deleteCollection = useCallback<StoreApi["deleteCollection"]>((id) => {
    setCollections((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveItem("collections", next);
      return next;
    });
    setProducts((prev) => {
      const next = prev.map((p) => (p.collectionId === id ? { ...p, collectionId: null } : p));
      saveItem("products", next);
      next.filter((p, i) => p !== prev[i]).forEach(dbUpsertProduct);
      return next;
    });
    dbDeleteCollection(id);
  }, []);

  const saveVariant = useCallback<StoreApi["saveVariant"]>((productId, variant) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const exists = p.variants.some((v) => v.id === variant.id);
        const updated = {
          ...p,
          variants: exists
            ? p.variants.map((v) => (v.id === variant.id ? variant : v))
            : [...p.variants, { ...variant, id: variant.id || uid("var") }],
        };
        dbUpsertProduct(updated);
        return updated;
      }),
    );
  }, []);

  const deleteVariant = useCallback<StoreApi["deleteVariant"]>((productId, variantId) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const updated = { ...p, variants: p.variants.filter((v) => v.id !== variantId) };
        dbUpsertProduct(updated);
        return updated;
      }),
    );
  }, []);

  const updateHeroSlide = useCallback<StoreApi["updateHeroSlide"]>((id, patch) => {
    setHeroSlidesState((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
      saveItem("heroSlides", next);
      const target = next.find((s) => s.id === id);
      if (target) dbUpsertHeroSlide(target);
      return next;
    });
  }, []);

  const deleteHeroSlide = useCallback<StoreApi["deleteHeroSlide"]>((id) => {
    setHeroSlidesState((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveItem("heroSlides", next);
      return next;
    });
    dbDeleteHeroSlide(id);
  }, []);

  const moveHeroSlide = useCallback<StoreApi["moveHeroSlide"]>((id, dir) => {
    setHeroSlidesState((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const a = copy[idx]!;
      const b = copy[next]!;
      copy[idx] = b;
      copy[next] = a;
      const ordered = copy.map((s, i) => ({ ...s, sortOrder: i }));
      saveItem("heroSlides", ordered);
      dbUpsertHeroSlides(ordered);
      return ordered;
    });
  }, []);

  const updateAnnouncement = useCallback<StoreApi["updateAnnouncement"]>((patch) => {
    localSavedContent.current.announcement = true;
    setAnnouncement((prev) => {
      const next = { ...prev, ...patch };
      dbUpsertAnnouncement(next);
      return next;
    });
  }, []);

  const saveTestimonial = useCallback<StoreApi["saveTestimonial"]>((t) => {
    const img = t.reviewImage || t.photo || null;
    const fullT = { ...t, id: t.id || uid("tst"), photo: img, reviewImage: img };
    setTestimonials((prev) => {
      const next = prev.some((x) => x.id === fullT.id)
        ? prev.map((x) => (x.id === fullT.id ? fullT : x))
        : [...prev, fullT];
      saveItem("testimonials", next);
      return next;
    });
    dbUpsertTestimonial(fullT);
  }, []);

  const deleteTestimonial = useCallback<StoreApi["deleteTestimonial"]>((id) => {
    setTestimonials((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveItem("testimonials", next);
      return next;
    });
    dbDeleteTestimonial(id);
  }, []);

  const moveTestimonial = useCallback<StoreApi["moveTestimonial"]>((id, dir) => {
    setTestimonials((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const a = copy[idx]!;
      const b = copy[next]!;
      copy[idx] = b;
      copy[next] = a;
      const ordered = copy.map((t, i) => ({ ...t, sortOrder: i }));
      saveItem("testimonials", ordered);
      ordered.forEach(dbUpsertTestimonial);
      return ordered;
    });
  }, []);

  const lockChannel = useCallback<StoreApi["lockChannel"]>((channel) => {
    setVideo((prev) => {
      const next = { ...prev, lockedChannel: channel.trim() };
      dbUpsertVideo(next);
      return next;
    });
  }, []);

  const submitVideoUrl = useCallback<StoreApi["submitVideoUrl"]>(
    (url) => {
      const clean = sanitizeRawInput(url);
      if (!isSafeUrl(clean)) {
        return { ok: false, error: "🔒 Security Alert: Unsafe URL scheme detected." };
      }
      const id = parseYouTubeId(clean);
      if (!id) return { ok: false, error: "That doesn't look like a valid YouTube link." };
      if (!video.lockedChannel)
        return {
          ok: false,
          error: "No channel is locked yet. Lock an approved channel before publishing a video.",
        };
      const channel = parseYouTubeChannel(clean);
      if (!channel || channel.toLowerCase() !== video.lockedChannel.toLowerCase())
        return {
          ok: false,
          error: "This video isn't from the approved channel and wasn't published.",
        };
      setVideo((prev) => {
        const next = { ...prev, videoUrl: clean, videoId: id };
        dbUpsertVideo(next);
        return next;
      });
      return { ok: true };
    },
    [video.lockedChannel],
  );

  const updateVideoCaption = useCallback<StoreApi["updateVideoCaption"]>((caption) => {
    setVideo((prev) => {
      const next = { ...prev, caption };
      dbUpsertVideo(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback<StoreApi["updateSettings"]>((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      dbUpsertSettings(next);
      return next;
    });
  }, []);

  const saveBrand = useCallback<StoreApi["saveBrand"]>((brand) => {
    localSavedContent.current.brands = true;
    const fullBrand: Brand = {
      ...brand,
      id: brand.id || uid("brd"),
      name: brand.name.trim(),
      logo: sanitizeImageSrc(brand.logo, "") || null,
      enabled: brand.enabled ?? true,
    };
    setBrands((prev) => {
      const next = prev.some((b) => b.id === fullBrand.id)
        ? prev.map((b) => (b.id === fullBrand.id ? fullBrand : b))
        : [...prev, fullBrand];
      saveItem("brands", next);
      return next;
    });
    dbUpsertBrand(fullBrand);
  }, []);

  const deleteBrand = useCallback<StoreApi["deleteBrand"]>((id) => {
    localSavedContent.current.brands = true;
    setBrands((prev) => {
      const next = prev.filter((b) => b.id !== id);
      saveItem("brands", next);
      return next;
    });
    dbDeleteBrand(id);
  }, []);

  const moveBrand = useCallback<StoreApi["moveBrand"]>((id, dir) => {
    localSavedContent.current.brands = true;
    setBrands((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const a = copy[idx]!;
      const b = copy[next]!;
      copy[idx] = b;
      copy[next] = a;
      const ordered = copy.map((brand, i) => ({ ...brand, sortOrder: i }));
      saveItem("brands", ordered);
      ordered.forEach(dbUpsertBrand);
      return ordered;
    });
  }, []);

  const saveSocialReel = useCallback<StoreApi["saveSocialReel"]>((reel) => {
    localSavedContent.current.socialReels = true;
    const fullReel = {
      ...reel,
      id: reel.id || uid("reel"),
      title: reel.title.trim(),
      videoUrl: sanitizeHref(reel.videoUrl, ""),
      thumbnail: sanitizeImageSrc(reel.thumbnail, ""),
      enabled: reel.enabled ?? true,
    };
    setSocialReelsState((prev) => {
      const next = prev.some((r) => r.id === fullReel.id)
        ? prev.map((r) => (r.id === fullReel.id ? fullReel : r))
        : [...prev, fullReel];
      saveItem("socialReels", next);
      return next;
    });
    dbUpsertSocialReel(fullReel);
  }, []);

  const deleteSocialReel = useCallback<StoreApi["deleteSocialReel"]>((id) => {
    localSavedContent.current.socialReels = true;
    setSocialReelsState((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveItem("socialReels", next);
      return next;
    });
    dbDeleteSocialReel(id);
  }, []);

  const moveSocialReel = useCallback<StoreApi["moveSocialReel"]>((id, dir) => {
    localSavedContent.current.socialReels = true;
    setSocialReelsState((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      const nextIndex = idx + dir;
      if (idx < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const a = next[idx]!;
      const b = next[nextIndex]!;
      next[idx] = b;
      next[nextIndex] = a;
      const ordered = next.map((reel, i) => ({ ...reel, sortOrder: i }));
      saveItem("socialReels", ordered);
      ordered.forEach(dbUpsertSocialReel);
      return ordered;
    });
  }, []);

  const saveFaq = useCallback<StoreApi["saveFaq"]>((faq) => {
    const fullFaq = { ...faq, id: faq.id || uid("faq") };
    setFaqsState((prev) => {
      const idx = prev.findIndex((f) => f.id === fullFaq.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = fullFaq;
        saveItem("faqs", copy);
        return copy;
      }
      const next = [...prev, fullFaq];
      saveItem("faqs", next);
      return next;
    });
    dbUpsertFaq(fullFaq);
  }, []);

  const deleteFaq = useCallback<StoreApi["deleteFaq"]>((id) => {
    setFaqsState((prev) => {
      const next = prev.filter((f) => f.id !== id);
      saveItem("faqs", next);
      return next;
    });
    dbDeleteFaq(id);
  }, []);

  const moveFaq = useCallback<StoreApi["moveFaq"]>((id, dir) => {
    setFaqsState((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const a = copy[idx]!;
      const b = copy[next]!;
      copy[idx] = b;
      copy[next] = a;
      const ordered = copy.map((faq, i) => ({ ...faq, sortOrder: i }));
      saveItem("faqs", ordered);
      ordered.forEach(dbUpsertFaq);
      return ordered;
    });
  }, []);

  const addSubscriber = useCallback<StoreApi["addSubscriber"]>((email) => {
    const clean = email.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return { ok: false, message: "Please enter a valid email address." };
    }
    let alreadyExists = false;
    const newSub: Subscriber = {
      id: newId("sub"),
      email: clean,
      createdAt: new Date().toISOString(),
      status: "active",
    };
    setSubscribersState((cur) => {
      if (cur.some((s) => s.email.toLowerCase() === clean)) {
        alreadyExists = true;
        return cur;
      }
      return [newSub, ...cur];
    });
    if (alreadyExists) {
      return { ok: true, message: "You are already subscribed to our exclusive offers!" };
    }
    dbInsertSubscriber(newSub);
    return {
      ok: true,
      message: "Thank you for subscribing! You'll receive our exclusive drops & offers.",
    };
  }, []);

  const deleteSubscriber = useCallback<StoreApi["deleteSubscriber"]>((id) => {
    setSubscribersState((cur) => cur.filter((s) => s.id !== id));
    dbDeleteSubscriber(id);
  }, []);

  // Helper: generate a secure session token from credentials
  const makeSessionToken = useCallback(async (email: string, password: string): Promise<string> => {
    const secret = `optique::${email.toLowerCase()}::${password}::${Date.now().toString().slice(0, 8)}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(secret);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }, []);

  const login = useCallback<StoreApi["login"]>(
    async (email, password) => {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      const isDefaultPrimaryAdmin =
        trimmedEmail.toLowerCase() === "admin@optique.com" ||
        trimmedEmail.toLowerCase() === (settings.adminEmail || "").toLowerCase();

      const isFallbackValid =
        isDefaultPrimaryAdmin &&
        (trimmedPassword === "optique123" || password === "optique123");

      const persistAdminSession = async () => {
        setIsAdmin(true);
        if (typeof window !== "undefined") {
          localStorage.setItem("optique_admin_session", "true");
          const token = await makeSessionToken(trimmedEmail, trimmedPassword);
          localStorage.setItem("optique_admin_session_token", token);
          localStorage.setItem("optique_admin_attempts", "0");
          localStorage.setItem("optique_admin_locked_until", "0");
        }
      };

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: trimmedPassword,
          });

          if (!error && data?.session) {
            await persistAdminSession();
            return { success: true };
          }

          if (error) {
            console.warn("[AdminLogin] Supabase signIn error:", error.message);

            // Fallback for primary admin email
            if (isFallbackValid) {
              await persistAdminSession();
              return { success: true };
            }

            // Auto-provision if user doesn't exist
            try {
              const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: trimmedEmail,
                password: trimmedPassword,
              });

              if (!signUpError && (signUpData?.session || (signUpData?.user && isDefaultPrimaryAdmin))) {
                await persistAdminSession();
                return { success: true };
              }
            } catch {}

            return { success: false, error: "Galt email ya password. Please check your credentials." };
          }
        } catch (err: any) {
          console.warn("[AdminLogin] Supabase auth exception:", err);
          if (isFallbackValid) {
            await persistAdminSession();
            return { success: true };
          }
          return { success: false, error: err?.message || "Authentication error." };
        }
      }

      // Offline / local mode
      if (isFallbackValid) {
        await persistAdminSession();
        return { success: true };
      }

      return { success: false, error: "Galt email ya password." };
    },
    [isSupabaseConfigured, settings.adminEmail, makeSessionToken],
  );

  const logout = useCallback(async () => {
    setIsAdmin(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("optique_admin_session");
      localStorage.removeItem("optique_admin_session_token");
      localStorage.removeItem("optique_admin_fp");
      localStorage.setItem("optique_admin_attempts", "0");
      localStorage.setItem("optique_admin_locked_until", "0");
    }
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
  }, [isSupabaseConfigured]);

  const setHeroSlides = useCallback<StoreApi["setHeroSlides"]>((slides) => {
    const ordered = slides.map((slide, i) => ({ ...slide, sortOrder: i }));
    setHeroSlidesState(ordered);
    saveItem("heroSlides", ordered);
    dbUpsertHeroSlides(ordered);
  }, []);

  const setSocialReels = useCallback<StoreApi["setSocialReels"]>((reels) => {
    localSavedContent.current.socialReels = true;
    const ordered = reels.map((reel, i) => ({ ...reel, sortOrder: i }));
    setSocialReelsState(ordered);
    saveItem("socialReels", ordered);
    ordered.forEach(dbUpsertSocialReel);
  }, []);

  const setFaqs = useCallback<StoreApi["setFaqs"]>((faqs) => {
    const ordered = faqs.map((faq, i) => ({ ...faq, sortOrder: i }));
    setFaqsState(ordered);
    saveItem("faqs", ordered);
    ordered.forEach(dbUpsertFaq);
  }, []);

  const value = useMemo<StoreApi>(
    () => ({
      categories,
      collections,
      products,
      orders,
      queries,
      heroSlides,
      announcement,
      testimonials,
      video,
      settings,
      brands,
      socialReels,
      faqs,
      subscribers,
      isAdmin,
      getProducts,
      getProductBySlug,
      getProductById,
      getCategoryBySlug,
      getCategoryById,
      getCollections,
      getCollectionBySlug,
      getCollectionById,
      getRelatedProducts,
      getInventoryRows,
      productStock,
      stockStatus,
      addOrder,
      getOrdersByReference,
      setOrderStatus,
      updateOrderCourier,
      addQuery,
      setQueryStatus,
      deleteQuery,
      saveProduct,
      deleteProduct,
      moveProduct,
      saveCategory,
      deleteCategory,
      moveCategory,
      saveCollection,
      deleteCollection,
      saveVariant,
      deleteVariant,
      updateStock,
      getStockFor,
      adjustStock: applyStockDelta,
      setHeroSlides,
      updateHeroSlide,
      deleteHeroSlide,
      moveHeroSlide,
      updateAnnouncement,
      saveTestimonial,
      deleteTestimonial,
      moveTestimonial,
      lockChannel,
      submitVideoUrl,
      updateVideoCaption,
      updateSettings,
      saveBrand,
      deleteBrand,
      moveBrand,
      saveSocialReel,
      deleteSocialReel,
      moveSocialReel,
      setSocialReels,
      saveFaq,
      deleteFaq,
      moveFaq,
      setFaqs,
      addSubscriber,
      deleteSubscriber,
      login,
      logout,
    }),
    [
      categories,
      collections,
      products,
      orders,
      queries,
      heroSlides,
      announcement,
      testimonials,
      video,
      settings,
      brands,
      socialReels,
      isAdmin,
      getProducts,
      getProductBySlug,
      getProductById,
      getCategoryBySlug,
      getCategoryById,
      getCollections,
      getCollectionBySlug,
      getCollectionById,
      getRelatedProducts,
      getInventoryRows,
      productStock,
      stockStatus,
      addOrder,
      getOrdersByReference,
      setOrderStatus,
      updateOrderCourier,
      addQuery,
      setQueryStatus,
      deleteQuery,
      saveProduct,
      deleteProduct,
      moveProduct,
      saveCategory,
      deleteCategory,
      moveCategory,
      saveCollection,
      deleteCollection,
      saveVariant,
      deleteVariant,
      updateStock,
      getStockFor,
      applyStockDelta,
      setHeroSlides,
      updateHeroSlide,
      deleteHeroSlide,
      moveHeroSlide,
      updateAnnouncement,
      saveTestimonial,
      deleteTestimonial,
      moveTestimonial,
      lockChannel,
      submitVideoUrl,
      updateVideoCaption,
      updateSettings,
      saveBrand,
      deleteBrand,
      moveBrand,
      saveSocialReel,
      deleteSocialReel,
      moveSocialReel,
      setSocialReels,
      faqs,
      saveFaq,
      deleteFaq,
      moveFaq,
      setFaqs,
      subscribers,
      addSubscriber,
      deleteSubscriber,
      login,
      logout,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export function formatPrice(value: number) {
  return `Rs. ${value.toLocaleString("en-PK")}`;
}

export function newId(prefix: string) {
  return uid(prefix);
}
