import { isSafeUrl, sanitizeHref, sanitizeRawInput } from "./security";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import {
  fetchInitialSupabaseData,
  autoSeedSupabaseIfEmpty,
  dbUpsertProduct,
  dbDeleteProduct,
  dbUpsertCategory,
  dbDeleteCategory,
  dbUpsertCollection,
  dbDeleteCollection,
  dbInsertOrder,
  dbUpdateOrderStatus,
  dbUpsertHeroSlides,
  dbUpsertHeroSlide,
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
  addQuery: (data: Omit<ContactQuery, "id" | "createdAt" | "status">) => ContactQuery;
  setQueryStatus: (id: string, status: "New" | "Responded" | "Archived") => void;
  deleteQuery: (id: string) => void;
  saveProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  saveCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
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
  login: (email: string, password: string) => boolean;
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
  } catch (err) {
    console.warn(`Failed to save ${key} to localStorage`, err);
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
    productName: raw?.productName || raw?.items?.[0]?.productName || existing?.productName || "Glasses",
    variantId: raw?.variantId || raw?.items?.[0]?.variantId || existing?.variantId || null,
    variantLabel: raw?.variantLabel || raw?.items?.[0]?.variantLabel || existing?.variantLabel || null,
    message: raw?.message || raw?.address || existing?.message || "",
    source:
      raw?.source ||
      raw?.items?.[0]?.source ||
      existing?.source ||
      ((raw?.productName || raw?.items?.[0]?.productName || "")
        .toLowerCase()
        .includes("whatsapp")
        ? "whatsapp"
        : "cart"),
    status: (raw?.status
      ? raw.status.charAt(0).toUpperCase() + raw.status.slice(1).toLowerCase()
      : existing?.status || "New") as OrderStatus,
    stockDeducted: raw?.stockDeducted ?? existing?.stockDeducted ?? true,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(() => getSaved("categories", seedCategories));
  const [collections, setCollections] = useState<Collection[]>(() => getSaved("collections", seedCollections));
  const [products, setProducts] = useState<Product[]>(() => getSaved("products", seedProducts));
  const [orders, setOrders] = useState<Order[]>(() => getSaved("orders", seedOrders));
  const [queries, setQueries] = useState<ContactQuery[]>(() => getSaved("queries", []));
  const [heroSlides, setHeroSlidesState] = useState<HeroSlide[]>(() => getSaved("heroSlides", seedHeroSlides));
  const [announcement, setAnnouncement] = useState<AnnouncementSettings>(() => getSaved("announcement", seedAnnouncement));
  const [testimonials, setTestimonials] = useState<Testimonial[]>(() => getSaved("testimonials", seedTestimonials));
  const [video, setVideo] = useState<VideoSettings>(() => getSaved("video", seedVideo));
  const [settings, setSettings] = useState<StoreSettings>(() => getSaved("settings", seedSettings));
  const [brands, setBrands] = useState<Brand[]>(() => getSaved("brands", seedBrands));
  const [socialReels, setSocialReelsState] = useState<SocialReel[]>(() => getSaved("socialReels", seedSocialReels));
  const [faqs, setFaqsState] = useState<FAQItem[]>(() => getSaved("faqs", seedFaqs));
  const [subscribers, setSubscribersState] = useState<Subscriber[]>(() => getSaved("subscribers", seedSubscribers));
  const [isAdmin, setIsAdmin] = useState(false);

  // Ensure admin session is NEVER automatically persisted across page loads/links.
  // Requires fresh login every time a user visits /admin or loads/refreshes the page.
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("optique_admin_session_token");
      localStorage.removeItem("optique_admin_fp");
      localStorage.removeItem("optique_admin_session");
    }
  }, []);
  const [stockTouched, setStockTouched] = useState<Record<string, string>>({});

  // ── Auto-persist to localStorage on every change ──
  useEffect(() => { saveItem("categories", categories); }, [categories]);
  useEffect(() => { saveItem("collections", collections); }, [collections]);
  useEffect(() => { saveItem("products", products); }, [products]);
  useEffect(() => { saveItem("orders", orders); }, [orders]);
  useEffect(() => { saveItem("queries", queries); }, [queries]);
  useEffect(() => { saveItem("heroSlides", heroSlides); }, [heroSlides]);
  useEffect(() => { saveItem("announcement", announcement); }, [announcement]);
  useEffect(() => { saveItem("testimonials", testimonials); }, [testimonials]);
  useEffect(() => { saveItem("video", video); }, [video]);
  useEffect(() => { saveItem("settings", settings); }, [settings]);
  useEffect(() => { saveItem("brands", brands); }, [brands]);
  useEffect(() => { saveItem("socialReels", socialReels); }, [socialReels]);
  useEffect(() => { saveItem("faqs", faqs); }, [faqs]);
  useEffect(() => { saveItem("subscribers", subscribers); }, [subscribers]);

  // ── Supabase Real-Time Sync & Initial Hydration ──
  useEffect(() => {
    // No database configured yet — stay on local demo data
    if (!isSupabaseConfigured) return;

    let isSubscribed = true;

    async function initSupabaseData() {
      // 1. Auto-seed any empty tables in Supabase first
      await autoSeedSupabaseIfEmpty({
        categories: seedCategories,
        collections: seedCollections,
        products: seedProducts,
        heroSlides: seedHeroSlides,
        brands: seedBrands,
        socialReels: seedSocialReels,
        testimonials: seedTestimonials,
        faqs: seedFaqs,
      });

      // 2. Fetch fresh synchronized data
      const data = await fetchInitialSupabaseData();
      if (!isSubscribed || !data) return;

      if (data.categories !== null) setCategories(data.categories);
      if (data.collections !== null) setCollections(data.collections);
      if (data.products !== null) setProducts(data.products);
      if (data.orders !== null) {
        const fetchedOrders = data.orders;
        setOrders((prev) => {
          const map = new Map(prev.map((o) => [o.id, o]));
          return fetchedOrders.map((o) => parseOrderRecord(o, map.get(o.id)));
        });
      }
      if (data.queries !== null && data.queries !== undefined) setQueries(data.queries);
      if (data.heroSlides !== null) setHeroSlidesState(data.heroSlides);
      if (data.brands !== null) setBrands(data.brands);
      if (data.socialReels !== null) setSocialReelsState(data.socialReels);
      if (data.testimonials !== null) setTestimonials(data.testimonials);
      if (data.faqs !== null) setFaqsState(data.faqs);
      if (data.subscribers !== null) setSubscribersState(data.subscribers);
      if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
      if (data.announcement) setAnnouncement((prev) => ({ ...prev, ...data.announcement }));
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
          if (eventType === "DELETE") setProducts((prev) => prev.filter((p) => p.id !== oldRecord.id));
          else if (eventType === "INSERT") {
            const mapped = mapDbProductToStore(newRecord);
            setProducts((prev) => [mapped, ...prev.filter((p) => p.id !== mapped.id)]);
          } else if (eventType === "UPDATE") {
            const mapped = mapDbProductToStore(newRecord);
            setProducts((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)));
          }
        } else if (table === "categories") {
          if (eventType === "DELETE") setCategories((prev) => prev.filter((c) => c.id !== oldRecord.id));
          else if (eventType === "INSERT") setCategories((prev) => [...prev.filter((c) => c.id !== newRecord.id), newRecord]);
          else if (eventType === "UPDATE") setCategories((prev) => prev.map((c) => (c.id === newRecord.id ? newRecord : c)));
        } else if (table === "collections") {
          if (eventType === "DELETE") setCollections((prev) => prev.filter((c) => c.id !== oldRecord.id));
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
              return exists ? prev.map((s) => (s.id === mapped.id ? mapped : s)) : [...prev, mapped];
            });
          } else if (eventType === "DELETE") {
            setHeroSlidesState((prev) => prev.filter((s) => s.id !== oldRecord.id));
          }
        } else if (table === "brands") {
          if (eventType === "DELETE") setBrands((prev) => prev.filter((b) => b.id !== oldRecord.id));
          else if (eventType === "INSERT") {
            const mapped = mapDbBrandToStore(newRecord);
            setBrands((prev) => [...prev.filter((b) => b.id !== mapped.id), mapped]);
          } else if (eventType === "UPDATE") {
            const mapped = mapDbBrandToStore(newRecord);
            setBrands((prev) => prev.map((b) => (b.id === mapped.id ? mapped : b)));
          }
        } else if (table === "social_reels") {
          if (eventType === "DELETE") setSocialReelsState((prev) => prev.filter((r) => r.id !== oldRecord.id));
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
          if (newRecord) setAnnouncement((prev) => ({ ...prev, ...newRecord }));
        } else if (table === "testimonials") {
          if (eventType === "DELETE") setTestimonials((prev) => prev.filter((t) => t.id !== oldRecord.id));
          else if (eventType === "INSERT" || eventType === "UPDATE") {
            const mapped = mapDbTestimonialToStore(newRecord);
            setTestimonials((prev) => (prev.some((t) => t.id === mapped.id) ? prev.map((t) => (t.id === mapped.id ? mapped : t)) : [...prev, mapped]));
          }
        } else if (table === "faqs") {
          if (eventType === "DELETE") setFaqsState((prev) => prev.filter((f) => f.id !== oldRecord.id));
          else if (eventType === "INSERT" || eventType === "UPDATE") {
            const mapped = mapDbFaqToStore(newRecord);
            setFaqsState((prev) => (prev.some((f) => f.id === mapped.id) ? prev.map((f) => (f.id === mapped.id ? mapped : f)) : [...prev, mapped]));
          }
        } else if (table === "subscribers") {
          if (eventType === "DELETE") setSubscribersState((prev) => prev.filter((s) => s.id !== oldRecord.id));
          else if (eventType === "INSERT") setSubscribersState((prev) => [newRecord, ...prev.filter((s) => s.id !== newRecord.id)]);
        } else if (table === "queries") {
          if (eventType === "DELETE") setQueries((prev) => prev.filter((q) => q.id !== oldRecord.id));
          else if (eventType === "INSERT" || eventType === "UPDATE") {
            const mapped = mapDbQueryToStore(newRecord);
            setQueries((prev) => (prev.some((q) => q.id === mapped.id) ? prev.map((q) => (q.id === mapped.id ? mapped : q)) : [mapped, ...prev]));
          }
        }
      })
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, []);

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

  const saveProduct = useCallback<StoreApi["saveProduct"]>((product) => {
    const fullProduct = { ...product, id: product.id || uid("prd") };
    setProducts((prev) =>
      prev.some((p) => p.id === fullProduct.id)
        ? prev.map((p) => (p.id === fullProduct.id ? fullProduct : p))
        : [fullProduct, ...prev],
    );
    dbUpsertProduct(fullProduct);
  }, []);

  const deleteProduct = useCallback<StoreApi["deleteProduct"]>((id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    dbDeleteProduct(id);
  }, []);

  const saveCategory = useCallback<StoreApi["saveCategory"]>((category) => {
    const fullCat = { ...category, id: category.id || uid("cat") };
    setCategories((prev) =>
      prev.some((c) => c.id === fullCat.id)
        ? prev.map((c) => (c.id === fullCat.id ? fullCat : c))
        : [...prev, fullCat],
    );
    dbUpsertCategory(fullCat);
  }, []);

  const deleteCategory = useCallback<StoreApi["deleteCategory"]>((id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setCollections((prev) => prev.filter((col) => col.categoryId !== id));
    setProducts((prev) => prev.filter((p) => p.categoryId !== id));
    dbDeleteCategory(id);
  }, []);

  const saveCollection = useCallback<StoreApi["saveCollection"]>((collection) => {
    const fullCol = { ...collection, id: collection.id || uid("col") };
    setCollections((prev) =>
      prev.some((c) => c.id === fullCol.id)
        ? prev.map((c) => (c.id === fullCol.id ? fullCol : c))
        : [...prev, fullCol],
    );
    dbUpsertCollection(fullCol);
  }, []);

  const deleteCollection = useCallback<StoreApi["deleteCollection"]>((id) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
    setProducts((prev) =>
      prev.map((p) => (p.collectionId === id ? { ...p, collectionId: null } : p)),
    );
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
      const target = next.find((s) => s.id === id);
      if (target) dbUpsertHeroSlide(target);
      return next;
    });
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
      const ordered = copy.map((s, i) => ({ ...s, sort_order: i }));
      dbUpsertHeroSlides(ordered);
      return ordered;
    });
  }, []);

  const updateAnnouncement = useCallback<StoreApi["updateAnnouncement"]>((patch) => {
    setAnnouncement((prev) => {
      const next = { ...prev, ...patch };
      dbUpsertAnnouncement(next);
      return next;
    });
  }, []);

  const saveTestimonial = useCallback<StoreApi["saveTestimonial"]>((t) => {
    const img = t.reviewImage || t.photo || null;
    const fullT = { ...t, id: t.id || uid("tst"), photo: img, reviewImage: img };
    setTestimonials((prev) =>
      prev.some((x) => x.id === fullT.id)
        ? prev.map((x) => (x.id === fullT.id ? fullT : x))
        : [...prev, fullT],
    );
    dbUpsertTestimonial(fullT);
  }, []);

  const deleteTestimonial = useCallback<StoreApi["deleteTestimonial"]>((id) => {
    setTestimonials((prev) => prev.filter((t) => t.id !== id));
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
      return copy;
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
    const fullBrand: Brand = {
      ...brand,
      id: brand.id || uid("brd"),
      logo: sanitizeHref(brand.logo, ""),
    };
    setBrands((prev) =>
      prev.some((b) => b.id === fullBrand.id)
        ? prev.map((b) => (b.id === fullBrand.id ? fullBrand : b))
        : [...prev, fullBrand],
    );
    dbUpsertBrand(fullBrand);
  }, []);

  const deleteBrand = useCallback<StoreApi["deleteBrand"]>((id) => {
    setBrands((prev) => prev.filter((b) => b.id !== id));
    dbDeleteBrand(id);
  }, []);

  const moveBrand = useCallback<StoreApi["moveBrand"]>((id, dir) => {
    setBrands((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const a = copy[idx]!;
      const b = copy[next]!;
      copy[idx] = b;
      copy[next] = a;
      return copy;
    });
  }, []);

  const saveSocialReel = useCallback<StoreApi["saveSocialReel"]>((reel) => {
    const fullReel = {
      ...reel,
      id: reel.id || uid("reel"),
      videoUrl: sanitizeHref(reel.videoUrl, ""),
      thumbnail: sanitizeHref(reel.thumbnail, ""),
    };
    setSocialReelsState((prev) =>
      prev.some((r) => r.id === fullReel.id)
        ? prev.map((r) => (r.id === fullReel.id ? fullReel : r))
        : [...prev, fullReel],
    );
    dbUpsertSocialReel(fullReel);
  }, []);

  const deleteSocialReel = useCallback<StoreApi["deleteSocialReel"]>((id) => {
    setSocialReelsState((prev) => prev.filter((r) => r.id !== id));
    dbDeleteSocialReel(id);
  }, []);

  const moveSocialReel = useCallback<StoreApi["moveSocialReel"]>((id, dir) => {
    setSocialReelsState((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const a = copy[idx]!;
      const b = copy[next]!;
      copy[idx] = b;
      copy[next] = a;
      return copy;
    });
  }, []);

  const saveFaq = useCallback<StoreApi["saveFaq"]>((faq) => {
    const fullFaq = { ...faq, id: faq.id || uid("faq") };
    setFaqsState((prev) => {
      const idx = prev.findIndex((f) => f.id === fullFaq.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = fullFaq;
        return copy;
      }
      return [...prev, fullFaq];
    });
    dbUpsertFaq(fullFaq);
  }, []);

  const deleteFaq = useCallback<StoreApi["deleteFaq"]>((id) => {
    setFaqsState((prev) => prev.filter((f) => f.id !== id));
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
      return copy;
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
    (email, password) => {
      const ok =
        email.trim().toLowerCase() === settings.adminEmail.toLowerCase() &&
        password === settings.adminPassword;
      if (ok) {
        setIsAdmin(true);
        if (typeof window !== "undefined") {
          localStorage.removeItem("optique_admin_session_token");
          localStorage.removeItem("optique_admin_fp");
          localStorage.removeItem("optique_admin_session");
        }
      }
      return ok;
    },
    [settings.adminEmail, settings.adminPassword],
  );

  const logout = useCallback(() => {
    setIsAdmin(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("optique_admin_session_token");
      localStorage.removeItem("optique_admin_fp");
      localStorage.removeItem("optique_admin_session"); // cleanup legacy
    }
  }, []);

  const setHeroSlides = useCallback<StoreApi["setHeroSlides"]>((slides) => {
    setHeroSlidesState(slides);
    dbUpsertHeroSlides(slides);
  }, []);

  const setSocialReels = useCallback<StoreApi["setSocialReels"]>((reels) => {
    setSocialReelsState(reels);
    reels.forEach(dbUpsertSocialReel);
  }, []);

  const setFaqs = useCallback<StoreApi["setFaqs"]>((faqs) => {
    setFaqsState(faqs);
    faqs.forEach(dbUpsertFaq);
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
      addQuery,
      setQueryStatus,
      deleteQuery,
      saveProduct,
      deleteProduct,
      saveCategory,
      deleteCategory,
      saveCollection,
      deleteCollection,
      saveVariant,
      deleteVariant,
      updateStock,
      getStockFor,
      adjustStock: applyStockDelta,
      setHeroSlides,
      updateHeroSlide,
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
      addQuery,
      setQueryStatus,
      deleteQuery,
      saveProduct,
      deleteProduct,
      saveCategory,
      deleteCategory,
      saveCollection,
      deleteCollection,
      saveVariant,
      deleteVariant,
      updateStock,
      getStockFor,
      applyStockDelta,
      updateHeroSlide,
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
      faqs,
      saveFaq,
      deleteFaq,
      moveFaq,
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
