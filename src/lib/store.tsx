import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  seedAnnouncement,
  seedCategories,
  seedHeroSlides,
  seedOrders,
  seedProducts,
  seedSettings,
  seedTestimonials,
  seedVideo,
} from "./seed";
import type {
  AnnouncementSettings,
  Category,
  HeroSlide,
  Order,
  OrderStatus,
  Product,
  StockStatus,
  StoreSettings,
  Testimonial,
  Variant,
  VideoSettings,
} from "./types";

/**
 * In-memory data layer. Every read/write the UI performs goes through the
 * named helpers below, so swapping this for a real backend later means
 * re-implementing this file only.
 */

interface StoreState {
  categories: Category[];
  products: Product[];
  orders: Order[];
  heroSlides: HeroSlide[];
  announcement: AnnouncementSettings;
  testimonials: Testimonial[];
  video: VideoSettings;
  settings: StoreSettings;
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
  getProducts: (opts?: { categoryId?: string; search?: string }) => Product[];
  getProductBySlug: (slug: string) => Product | undefined;
  getProductById: (id: string) => Product | undefined;
  getCategoryBySlug: (slug: string) => Category | undefined;
  getCategoryById: (id: string) => Category | undefined;
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
  saveProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  saveCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  saveVariant: (productId: string, variant: Variant) => void;
  deleteVariant: (productId: string, variantId: string) => void;
  updateStock: (productId: string, variantId: string | null, qty: number) => void;
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(seedCategories);
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [heroSlides, setHeroSlidesState] = useState<HeroSlide[]>(seedHeroSlides);
  const [announcement, setAnnouncement] = useState<AnnouncementSettings>(seedAnnouncement);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(seedTestimonials);
  const [video, setVideo] = useState<VideoSettings>(seedVideo);
  const [settings, setSettings] = useState<StoreSettings>(seedSettings);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stockTouched, setStockTouched] = useState<Record<string, string>>({});

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
        if (opts?.search && !p.name.toLowerCase().includes(opts.search.toLowerCase()))
          return false;
        return true;
      }),
    [products],
  );

  const getProductBySlug = useCallback(
    (slug: string) => products.find((p) => p.slug === slug),
    [products],
  );
  const getProductById = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products],
  );
  const getCategoryBySlug = useCallback(
    (slug: string) => categories.find((c) => c.slug === slug),
    [categories],
  );
  const getCategoryById = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories],
  );

  const getRelatedProducts = useCallback(
    (product: Product, limit = 4) =>
      products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, limit),
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
          if (variantId) {
            return {
              ...p,
              variants: p.variants.map((v) =>
                v.id === variantId ? { ...v, stock: Math.max(0, v.stock + delta) } : v,
              ),
            };
          }
          return { ...p, stock: Math.max(0, p.stock + delta) };
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
        if (variantId) {
          return {
            ...p,
            variants: p.variants.map((v) => (v.id === variantId ? { ...v, stock: safe } : v)),
          };
        }
        return { ...p, stock: safe };
      }),
    );
    setStockTouched((prev) => ({ ...prev, [`${productId}:${variantId ?? "base"}`]: nowIso() }));
  }, []);

  const addOrder = useCallback<StoreApi["addOrder"]>((data) => {
    const order: Order = {
      ...data,
      reference: data.reference?.trim() || newOrderReference(),
      id: uid("ord"),
      createdAt: nowIso(),
      status: "New",
      stockDeducted: false,
    };
    setOrders((prev) => [order, ...prev]);
    return order;
  }, []);

  const getOrdersByReference = useCallback<StoreApi["getOrdersByReference"]>(
    (reference) => {
      const needle = reference.trim().toLowerCase();
      if (!needle) return [];
      return orders.filter((o) => o.reference.toLowerCase() === needle);
    },
    [orders],
  );

  const setOrderStatus = useCallback<StoreApi["setOrderStatus"]>(
    (orderId, status) => {
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
          return { ...o, status, stockDeducted };
        }),
      );
    },
    [applyStockDelta],
  );

  const saveProduct = useCallback<StoreApi["saveProduct"]>((product) => {
    setProducts((prev) =>
      prev.some((p) => p.id === product.id)
        ? prev.map((p) => (p.id === product.id ? product : p))
        : [{ ...product, id: product.id || uid("prd") }, ...prev],
    );
  }, []);

  const deleteProduct = useCallback<StoreApi["deleteProduct"]>((id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const saveCategory = useCallback<StoreApi["saveCategory"]>((category) => {
    setCategories((prev) =>
      prev.some((c) => c.id === category.id)
        ? prev.map((c) => (c.id === category.id ? category : c))
        : [...prev, { ...category, id: category.id || uid("cat") }],
    );
  }, []);

  const deleteCategory = useCallback<StoreApi["deleteCategory"]>((id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setProducts((prev) => prev.filter((p) => p.categoryId !== id));
  }, []);

  const saveVariant = useCallback<StoreApi["saveVariant"]>((productId, variant) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const exists = p.variants.some((v) => v.id === variant.id);
        return {
          ...p,
          variants: exists
            ? p.variants.map((v) => (v.id === variant.id ? variant : v))
            : [...p.variants, { ...variant, id: variant.id || uid("var") }],
        };
      }),
    );
  }, []);

  const deleteVariant = useCallback<StoreApi["deleteVariant"]>((productId, variantId) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, variants: p.variants.filter((v) => v.id !== variantId) } : p,
      ),
    );
  }, []);

  const updateHeroSlide = useCallback<StoreApi["updateHeroSlide"]>((id, patch) => {
    setHeroSlidesState((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
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
      return copy;
    });
  }, []);

  const updateAnnouncement = useCallback<StoreApi["updateAnnouncement"]>((patch) => {
    setAnnouncement((prev) => ({ ...prev, ...patch }));
  }, []);

  const saveTestimonial = useCallback<StoreApi["saveTestimonial"]>((t) => {
    setTestimonials((prev) =>
      prev.some((x) => x.id === t.id)
        ? prev.map((x) => (x.id === t.id ? t : x))
        : [...prev, { ...t, id: t.id || uid("tst") }],
    );
  }, []);

  const deleteTestimonial = useCallback<StoreApi["deleteTestimonial"]>((id) => {
    setTestimonials((prev) => prev.filter((t) => t.id !== id));
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
    setVideo((prev) => ({ ...prev, lockedChannel: channel.trim() }));
  }, []);

  const submitVideoUrl = useCallback<StoreApi["submitVideoUrl"]>(
    (url) => {
      const id = parseYouTubeId(url);
      if (!id) return { ok: false, error: "That doesn't look like a valid YouTube link." };
      if (!video.lockedChannel)
        return {
          ok: false,
          error: "No channel is locked yet. Lock an approved channel before publishing a video.",
        };
      const channel = parseYouTubeChannel(url);
      if (!channel || channel.toLowerCase() !== video.lockedChannel.toLowerCase())
        return {
          ok: false,
          error: "This video isn't from the approved channel and wasn't published.",
        };
      setVideo((prev) => ({ ...prev, videoUrl: url, videoId: id }));
      return { ok: true };
    },
    [video.lockedChannel],
  );

  const updateVideoCaption = useCallback<StoreApi["updateVideoCaption"]>((caption) => {
    setVideo((prev) => ({ ...prev, caption }));
  }, []);

  const updateSettings = useCallback<StoreApi["updateSettings"]>((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const login = useCallback<StoreApi["login"]>(
    (email, password) => {
      const ok =
        email.trim().toLowerCase() === settings.adminEmail.toLowerCase() &&
        password === settings.adminPassword;
      if (ok) setIsAdmin(true);
      return ok;
    },
    [settings.adminEmail, settings.adminPassword],
  );

  const logout = useCallback(() => setIsAdmin(false), []);

  const value = useMemo<StoreApi>(
    () => ({
      categories,
      products,
      orders,
      heroSlides,
      announcement,
      testimonials,
      video,
      settings,
      isAdmin,
      getProducts,
      getProductBySlug,
      getProductById,
      getCategoryBySlug,
      getCategoryById,
      getRelatedProducts,
      getInventoryRows,
      productStock,
      stockStatus,
      addOrder,
      getOrdersByReference,
      setOrderStatus,
      saveProduct,
      deleteProduct,
      saveCategory,
      deleteCategory,
      saveVariant,
      deleteVariant,
      updateStock,
      setHeroSlides: setHeroSlidesState,
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
      login,
      logout,
    }),
    [
      categories,
      products,
      orders,
      heroSlides,
      announcement,
      testimonials,
      video,
      settings,
      isAdmin,
      getProducts,
      getProductBySlug,
      getProductById,
      getCategoryBySlug,
      getCategoryById,
      getRelatedProducts,
      getInventoryRows,
      productStock,
      stockStatus,
      addOrder,
      getOrdersByReference,
      setOrderStatus,
      saveProduct,
      deleteProduct,
      saveCategory,
      deleteCategory,
      saveVariant,
      deleteVariant,
      updateStock,
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
