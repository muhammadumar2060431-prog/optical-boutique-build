/* eslint-disable @typescript-eslint/no-explicit-any, no-empty, react-refresh/only-export-components -- Legacy cached and realtime records are normalized at this boundary. */
import { isSafeUrl, sanitizeHref, sanitizeImageSrc, sanitizeRawInput } from "./security";
import { toast } from "sonner";
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
import { invalidatePublicStorefront } from "./storefront-invalidate.ts";
import { publicBrowserCache } from "./public-browser-cache.ts";
import { isAdminActivityExpired } from "./admin-session";
import {
  fetchInitialSupabaseData,
  dbUpsertProduct,
  dbDeleteProduct,
  markProductDeleted,
  dbUpsertCategory,
  dbDeleteCategory,
  dbUpsertCollection,
  dbDeleteCollection,
  dbInsertOrder,
  dbInsertOrders,
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
import type { MetaEventInput } from "./meta-events.types";

/**
 * In-memory data layer. Every read/write the UI performs goes through the
 * named helpers below, so swapping this for a real backend later means
 * re-implementing this file only.
 */

interface StoreState {
  storefrontReady: boolean;
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

interface InventoryRow {
  key: string;
  productId: string;
  variantId: string | null;
  categoryName: string;
  name: string;
  image: string;
  stock: number;
  status: StockStatus;
  updatedAt: string;
}

type NewOrderInput = Omit<Order, "id" | "createdAt" | "status" | "stockDeducted" | "reference"> & {
  reference?: string;
  stockDeducted?: boolean;
};

type ProductSort = "newest" | "price-asc" | "price-desc";

type ProductQueryOptions = {
  categoryId?: string;
  collectionId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
};

type ProductPageResult = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

interface StoreApi extends StoreState {
  /* reads */
  getProducts: (opts?: ProductQueryOptions) => Product[];
  getProductsPage: (
    opts?: ProductQueryOptions & {
      page?: number;
      pageSize?: number;
    },
  ) => ProductPageResult;
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
  addOrder: (order: NewOrderInput, metaEvent?: MetaEventInput) => Promise<Order | null>;
  addOrders: (
    orders: NewOrderInput[],
    idempotencyKey?: string,
    metaEvent?: MetaEventInput,
  ) => Promise<Order[] | null>;
  /** Customer-facing lookup: every order sharing one reference code. */
  getOrdersByReference: (reference: string) => Order[];
  setOrderStatus: (orderId: string, status: OrderStatus) => Promise<boolean>;
  updateOrderCourier: (
    orderId: string,
    courierName: string | null,
    trackingNumber: string | null,
    status?: OrderStatus,
  ) => Promise<boolean>;
  addQuery: (data: Omit<ContactQuery, "id" | "createdAt" | "status">) => ContactQuery;
  setQueryStatus: (id: string, status: "New" | "Responded" | "Archived") => void;
  deleteQuery: (id: string) => Promise<boolean>;
  saveProduct: (product: Product) => Promise<void> | void;
  deleteProduct: (id: string) => Promise<boolean>;
  moveProduct: (id: string, dir: -1 | 1) => void;
  saveCategory: (category: Category) => void;
  deleteCategory: (id: string) => Promise<boolean>;
  moveCategory: (id: string, dir: -1 | 1) => void;
  saveCollection: (collection: Collection) => void;
  deleteCollection: (id: string) => Promise<boolean>;
  saveVariant: (productId: string, variant: Variant) => void;
  deleteVariant: (productId: string, variantId: string) => void;
  updateStock: (productId: string, variantId: string | null, qty: number) => void;
  /** Current stock for a product or one of its variants. */
  getStockFor: (productId: string, variantId: string | null) => number;
  /** Relative stock change (negative to deduct). */
  adjustStock: (productId: string, variantId: string | null, delta: number) => void;
  setHeroSlides: (slides: HeroSlide[]) => void;
  updateHeroSlide: (id: string, patch: Partial<HeroSlide>) => void;
  deleteHeroSlide: (id: string) => Promise<boolean>;
  moveHeroSlide: (id: string, dir: -1 | 1) => void;
  updateAnnouncement: (patch: Partial<AnnouncementSettings>) => void;
  saveTestimonial: (t: Testimonial) => void;
  addCustomerReview: (
    review: Pick<
      Testimonial,
      "name" | "email" | "productId" | "productName" | "title" | "quote" | "rating" | "reviewImage"
    >,
  ) => Promise<{ ok: boolean; message: string; testimonial?: Testimonial }>;
  deleteTestimonial: (id: string) => Promise<boolean>;
  moveTestimonial: (id: string, dir: -1 | 1) => void;
  lockChannel: (channel: string) => void;
  submitVideoUrl: (url: string) => { ok: boolean; error?: string };
  updateVideoCaption: (caption: string) => void;
  updateSettings: (patch: Partial<StoreSettings>) => void;
  saveBrand: (brand: Brand) => void;
  deleteBrand: (id: string) => Promise<boolean>;
  moveBrand: (id: string, dir: -1 | 1) => void;
  saveSocialReel: (reel: SocialReel) => void;
  deleteSocialReel: (id: string) => Promise<boolean>;
  moveSocialReel: (id: string, dir: -1 | 1) => void;
  setSocialReels: (reels: SocialReel[]) => void;
  saveFaq: (faq: FAQItem) => void;
  deleteFaq: (id: string) => Promise<boolean>;
  moveFaq: (id: string, dir: -1 | 1) => void;
  setFaqs: (faqs: FAQItem[]) => void;
  addSubscriber: (email: string) => Promise<{ ok: boolean; message: string }>;
  deleteSubscriber: (id: string) => Promise<boolean>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; retryAfter?: number }>;
  logout: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

const ADMIN_ACTIVITY_KEY = "optique_admin_last_activity";

function readAdminActivity() {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(ADMIN_ACTIVITY_KEY));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function recordAdminActivity(at = Date.now()) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_ACTIVITY_KEY, String(at));
}

function clearAdminActivity() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_ACTIVITY_KEY);
}

function isAdminSessionInactive(at = Date.now()) {
  return isAdminActivityExpired(readAdminActivity(), at);
}

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const nowIso = () => new Date().toISOString();

/** Customer-facing order reference, e.g. "OPT-482915". */
export function newOrderReference() {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.slice(0, 12);
  return `OPT-${randomPart.toUpperCase()}`;
}

/** Extracts a YouTube video id from most common URL shapes. */
function parseYouTubeId(url: string): string | null {
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
function parseYouTubeChannel(url: string): string | null {
  const handle = url.match(/@([A-Za-z0-9_.-]+)/);
  return handle?.[1] ? `@${handle[1]}` : null;
}

// ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ TTL Cache Config ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬
// Keys that come from Supabase: expire after 24h to force a fresh fetch.
// Orders, settings, subscribers: never expire (always synced live from Supabase).
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const NO_EXPIRY_KEYS = new Set([
  "orders",
  "queries",
  "settings",
  "subscribers",
  "isAdmin",
  "brands",
  "socialReels",
]);
const STORAGE_PREFIX = "optique_v1_";
const LEGACY_STORAGE_PREFIX = "nigah_v1_";
const ADMIN_STORAGE_PREFIX = "optique_admin_";
const LEGACY_ADMIN_STORAGE_PREFIX = "nigah_admin_";
// ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬

function saveItem<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  const publicValue = publicBrowserCache(key, val);
  if (publicValue === undefined) {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}${key}`);
    return;
  }
  // Wrap value with timestamp so TTL can be checked on next load
  const wrapped = { __ts: Date.now(), __data: publicValue };
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(wrapped));
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
          newArrivalImage:
            p.newArrivalImage && !p.newArrivalImage.startsWith("data:") ? p.newArrivalImage : null,
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
        localStorage.setItem(
          `${STORAGE_PREFIX}${key}`,
          JSON.stringify({ __ts: Date.now(), __data: stripped }),
        );
      } catch {
        // If still failing, clear products from localStorage entirely
        // Supabase will be the source of truth on next load
        console.warn(
          `[saveItem] localStorage full for '${key}', clearing cache. Supabase is source of truth.`,
        );
        try {
          localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
        } catch {}
      }
    } else {
      console.warn(`Failed to save ${key} to localStorage`, err);
    }
  }
}

async function deleteWithFeedback(
  operation: Promise<boolean>,
  commit: () => void,
): Promise<boolean> {
  try {
    if (!(await operation)) throw new Error("Database did not confirm deletion.");
    commit();
    if (!(await invalidatePublicStorefront(supabase))) {
      toast.warning(
        "Deletion is saved. Public cache refresh failed; it may take up to 2 minutes to update.",
      );
    }
    return true;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Deletion failed. Check your connection and admin permissions.";
    toast.error(message);
    return false;
  }
}

function persistWithFeedback(operation: Promise<boolean>, toastId: string, label: string) {
  void operation
    .then((ok) => {
      if (!ok) {
        toast.error(
          `${label} database mein save nahi hua. Real admin account se dobara sign in karein.`,
          {
            id: toastId,
          },
        );
      }
    })
    .catch(() => {
      toast.error(
        `${label} database mein save nahi hua. Connection check karke dobara try karein.`,
        {
          id: toastId,
        },
      );
    });
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

export function StoreProvider({ children }: { children: ReactNode }) {
  // Keep the first browser render identical to SSR; cache is applied after mount.
  const [categories, setCategories] = useState<Category[]>(seedCategories);
  const [collections, setCollections] = useState<Collection[]>(seedCollections);
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [queries, setQueries] = useState<ContactQuery[]>([]);
  const [heroSlides, setHeroSlidesState] = useState<HeroSlide[]>(seedHeroSlides);
  const [announcement, setAnnouncement] = useState<AnnouncementSettings>(seedAnnouncement);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(seedTestimonials);
  const [video, setVideo] = useState<VideoSettings>(seedVideo);
  const [settings, setSettings] = useState<StoreSettings>(seedSettings);
  const [brands, setBrands] = useState<Brand[]>(seedBrands);
  const [socialReels, setSocialReelsState] = useState<SocialReel[]>(seedSocialReels);
  const [faqs, setFaqsState] = useState<FAQItem[]>(seedFaqs);
  const [subscribers, setSubscribersState] = useState<Subscriber[]>(seedSubscribers);
  const [isAdmin, setIsAdmin] = useState(false);
  const isAdminRef = useRef(isAdmin);
  const authSessionVersionRef = useRef(0);
  isAdminRef.current = isAdmin;
  const [hydrated, setHydrated] = useState(false);
  const [storefrontReady, setStorefrontReady] = useState(false);

  // Client-only hydration to eliminate SSR hydration mismatch
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`${ADMIN_STORAGE_PREFIX}session`);
      sessionStorage.removeItem(`${ADMIN_STORAGE_PREFIX}session_token`);
      sessionStorage.removeItem(`${LEGACY_ADMIN_STORAGE_PREFIX}session`);
      sessionStorage.removeItem(`${LEGACY_ADMIN_STORAGE_PREFIX}session_token`);
    }
    try {
      // Normal hydration: load whatever the user has saved
      const load = <T,>(key: string, setter: (val: T) => void): T | undefined => {
        const storageKey = `${STORAGE_PREFIX}${key}`;
        const legacyKey = `${LEGACY_STORAGE_PREFIX}${key}`;
        if (publicBrowserCache(key, null) === undefined) {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(legacyKey);
          return undefined;
        }
        let raw = localStorage.getItem(storageKey);
        if (!raw) {
          raw = localStorage.getItem(legacyKey);
          if (raw) localStorage.setItem(storageKey, raw);
        }
        if (!raw) return undefined;
        try {
          const parsed = JSON.parse(raw);
          // Unwrap TTL envelope
          let value = parsed;
          if (parsed && typeof parsed === "object" && "__ts" in parsed && "__data" in parsed) {
            const age = Date.now() - parsed.__ts;
            if (!NO_EXPIRY_KEYS.has(key) && age > CACHE_TTL_MS) {
              localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
              return; // Expired ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â skip, Supabase will hydrate
            }
            value = parsed.__data;
          }
          value = publicBrowserCache(key, value);
          if (key === "settings" || key === "testimonials") {
            localStorage.setItem(storageKey, JSON.stringify({ __ts: Date.now(), __data: value }));
            localStorage.removeItem(legacyKey);
          }
          setter(value);
          return value as T;
        } catch {
          return undefined;
        }
      };
      load<Category[]>("categories", setCategories);
      load<Collection[]>("collections", setCollections);
      load<Product[]>("products", setProducts);
      load<Order[]>("orders", setOrders);
      load<ContactQuery[]>("queries", setQueries);
      const hasCachedHero = load<HeroSlide[]>("heroSlides", setHeroSlidesState);
      if (hasCachedHero?.some((slide) => slide.enabled)) setStorefrontReady(true);
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
      let rawSettings = localStorage.getItem(`${STORAGE_PREFIX}settings`);
      if (!rawSettings) {
        rawSettings = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}settings`);
        if (rawSettings) localStorage.setItem(`${STORAGE_PREFIX}settings`, rawSettings);
      }
      if (rawSettings) {
        try {
          const parsed = JSON.parse(rawSettings);
          if ("adminPassword" in parsed) {
            delete parsed.adminPassword;
          }
          localStorage.setItem(`${STORAGE_PREFIX}settings`, JSON.stringify(parsed));
        } catch {}
      }
      load<Brand[]>("brands", setBrands);
      load<SocialReel[]>("socialReels", setSocialReelsState);
      load<FAQItem[]>("faqs", setFaqsState);
      load<Subscriber[]>("subscribers", setSubscribersState);
    } catch {}
    setHydrated(true);
  }, []);

  // ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ Listen to Supabase Auth State for Admin Session ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    const withTimeout = <T,>(promise: PromiseLike<T>, timeoutMs: number) =>
      new Promise<T>((resolve, reject) => {
        const timer = window.setTimeout(
          () => reject(new Error("Admin session verification timed out")),
          timeoutMs,
        );
        Promise.resolve(promise).then(
          (value) => {
            window.clearTimeout(timer);
            resolve(value);
          },
          (error) => {
            window.clearTimeout(timer);
            reject(error);
          },
        );
      });

    const applySession = async (session: { access_token: string } | null) => {
      const version = ++authSessionVersionRef.current;
      try {
        if (session && isAdminSessionInactive()) {
          clearAdminActivity();
          setIsAdmin(false);
          window.setTimeout(() => void supabase.auth.signOut(), 0);
          return;
        }
        const { data, error } = session
          ? await withTimeout(supabase.rpc("is_admin"), 5_000)
          : { data: false, error: null };
        if (cancelled || version !== authSessionVersionRef.current) return;
        if (session && !error && data === true) {
          setIsAdmin(true);
          return;
        }
        setIsAdmin(false);
      } catch {
        if (cancelled || version !== authSessionVersionRef.current) return;
        setIsAdmin(false);
      }
    };

    const initialVersion = authSessionVersionRef.current;
    withTimeout(supabase.auth.getSession(), 5_000)
      .then(({ data }) => {
        if (cancelled || authSessionVersionRef.current !== initialVersion) return;
        void applySession(data.session);
      })
      .catch(() => {
        if (cancelled || authSessionVersionRef.current !== initialVersion) return;
        setIsAdmin(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      cancelled = true;
      authListener.subscription?.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (isAdmin) return;
    setOrders([]);
    setQueries([]);
    setSubscribersState([]);
    setProducts((current) => publicBrowserCache("products", current) as Product[]);
    setHeroSlidesState((current) => publicBrowserCache("heroSlides", current) as HeroSlide[]);
    setSettings((current) => publicBrowserCache("settings", current) as StoreSettings);
    setTestimonials((current) => publicBrowserCache("testimonials", current) as Testimonial[]);
  }, [isAdmin]);
  useEffect(() => {
    if (!isSupabaseConfigured || !isAdmin) return;

    let cancelled = false;

    void fetchInitialSupabaseData({ includePrivate: true }).then((data) => {
      if (cancelled || !data) return;
      if (data.orders) setOrders(data.orders);
      if (data.queries) setQueries(data.queries);
      if (data.subscribers) setSubscribersState(data.subscribers);
      if (data.settings) setSettings(data.settings);
      if (data.testimonials) setTestimonials(data.testimonials);
      if (data.products) setProducts(data.products);
      if (data.categories) setCategories(data.categories);
      if (data.collections) setCollections(data.collections);
      if (data.heroSlides) setHeroSlidesState(data.heroSlides);
      if (data.brands) setBrands(data.brands);
      if (data.socialReels) setSocialReelsState(data.socialReels);
      if (data.faqs) setFaqsState(data.faqs);
    });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const [stockTouched, setStockTouched] = useState<Record<string, string>>({});

  // ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ Auto-persist to localStorage on every change (after initial mount) ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬
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
  // Track whether the browser is online
  const isOnlineRef = useRef(typeof navigator !== "undefined" ? navigator.onLine : true);
  // Track whether a re-sync is needed after coming back online
  const needsResyncRef = useRef(false);
  // Queue of products saved while offline that need to be synced to DB when back online
  const pendingSyncRef = useRef<Map<string, Product>>(new Map());
  const deletingProductIdsRef = useRef(new Set<string>());

  // ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ Supabase Real-Time Sync & Initial Hydration ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬
  useEffect(() => {
    // No database configured yet ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â stay on local demo data
    if (!hydrated) return;
    if (!isSupabaseConfigured) {
      setStorefrontReady(true);
      return;
    }

    let isSubscribed = true;

    async function initSupabaseData() {
      // 1. Fetch fresh synchronized data
      const data = await fetchInitialSupabaseData();
      if (!isSubscribed || !data || isAdminRef.current) return;

      if (data.categories !== null) {
        setCategories([...data.categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      }
      if (data.collections !== null) setCollections(data.collections);
      if (data.products !== null) {
        setProducts(() => {
          const mergedProducts = data.products!.map((dbProd) => {
            // Resolve subImages: prefer DB data, with local fallback so cached images are not lost.
            const dbSubImages = (
              Array.isArray(dbProd.subImages) && dbProd.subImages.length > 0
                ? dbProd.subImages
                : Array.isArray((dbProd.details as any)?.subImages) &&
                    (dbProd.details as any).subImages.length > 0
                  ? (dbProd.details as any).subImages
                  : Array.isArray((dbProd as any).images) && (dbProd as any).images.length > 0
                    ? (dbProd as any).images
                    : []
            ).filter((s: any) => typeof s === "string" && s.trim().length > 0);

            // Database values are authoritative, including deliberately empty galleries.
            const resolvedSubImages = dbSubImages;

            // Resolve primary image ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â NEVER lose a valid local image
            const subImageFallback = resolvedSubImages.find(
              (s: string) => s && s !== "/placeholder.svg" && s.trim().length > 0,
            );

            const resolvedImage = dbProd.image || subImageFallback || "/placeholder.svg";

            const finalProd = {
              ...dbProd,
              image: resolvedImage,
              subImages: resolvedSubImages,
              details: {
                ...(dbProd.details || {}),
                subImages: resolvedSubImages,
              },
            };

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
        setHeroSlidesState(data.heroSlides);
      }
      if (data.brands !== null) setBrands(data.brands);
      if (data.socialReels !== null) setSocialReelsState(data.socialReels);
      if (data.testimonials !== null) setTestimonials(data.testimonials);
      if (data.faqs !== null) setFaqsState(data.faqs);
      if (data.subscribers !== null) setSubscribersState(data.subscribers);
      if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
      if (data.announcement) {
        setAnnouncement((prev) => ({ ...prev, ...data.announcement }));
      }
      if (data.video) setVideo((prev) => ({ ...prev, ...data.video }));
    }

    void initSupabaseData()
      .catch(() => undefined)
      .finally(() => {
        if (isSubscribed) setStorefrontReady(true);
      });

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
            pendingSyncRef.current.delete(oldRecord.id);
            recentlySavedRef.current.delete(oldRecord.id);
            markProductDeleted(oldRecord.id);
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
            const fullMapped = {
              ...mapped,
              subImages,
              details: { ...(mapped.details || {}), subImages },
            };
            setProducts((prev) => {
              const next = [fullMapped, ...prev.filter((p) => p.id !== fullMapped.id)];
              saveItem("products", next);
              return next;
            });
          } else if (eventType === "UPDATE") {
            // Skip real-time echo for products we JUST saved ourselves
            if (recentlySavedRef.current.has(newRecord.id)) {
              recentlySavedRef.current.delete(newRecord.id);
              return;
            }
            const mapped = mapDbProductToStore(newRecord);
            const dbSubImages = (
              Array.isArray(mapped.subImages) && mapped.subImages.length > 0
                ? mapped.subImages
                : Array.isArray((mapped.details as any)?.subImages)
                  ? (mapped.details as any).subImages
                  : []
            ).filter((s: any) => typeof s === "string" && s.trim().length > 0);

            setProducts((prev) => {
              const resolvedSubImages = dbSubImages;
              const resolvedImage = mapped.image || "/placeholder.svg";

              const fullMapped = {
                ...mapped,
                image: resolvedImage,
                subImages: resolvedSubImages,
                details: { ...(mapped.details || {}), subImages: resolvedSubImages },
              };
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
          if (newRecord.deleted_at || eventType === "DELETE") {
            const removedId = newRecord.id || oldRecord.id;
            setOrders((prev) => prev.filter((o) => o.id !== removedId));
            setQueries((prev) => prev.filter((q) => q.id !== removedId));
            return;
          }
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
          if (eventType === "DELETE" || newRecord.deleted_at)
            setQueries((prev) => prev.filter((q) => q.id !== (newRecord.id || oldRecord.id)));
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

  // ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ Network Online/Offline Reconnection Handler ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬
  // When internet comes back after being offline, do a smart re-sync
  // that preserves locally-cached images and doesn't wipe the local state.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const handleOffline = () => {
      isOnlineRef.current = false;
      needsResyncRef.current = true;
    };

    const handleOnline = async () => {
      isOnlineRef.current = true;
      if (!needsResyncRef.current) return;
      needsResyncRef.current = false;

      // Small delay to let Supabase WebSocket reconnect first
      await new Promise((resolve) => setTimeout(resolve, 1500));

      try {
        // STEP 1: Push any products saved while offline to Supabase FIRST
        if (pendingSyncRef.current.size > 0) {
          const pendingEntries = Array.from(pendingSyncRef.current.entries());
          for (const [id, product] of pendingEntries) {
            if (deletingProductIdsRef.current.has(id) || !pendingSyncRef.current.has(id)) continue;
            const result = await dbUpsertProduct(product);
            if (result.success) {
              pendingSyncRef.current.delete(id);
            } else {
              console.warn("[store] Failed to sync pending product:", id, result.error);
            }
          }
        }

        // STEP 2: Fetch fresh data from DB and merge ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â NEVER lose local images or local-only products
        const data = await fetchInitialSupabaseData({ bypassStorefrontApi: true });
        if (!data || !data.products) return;

        setProducts(() => {
          const mergedProducts = data.products!.map((dbProd) => {
            const dbSubImages = (
              Array.isArray(dbProd.subImages) && dbProd.subImages.length > 0
                ? dbProd.subImages
                : Array.isArray((dbProd.details as any)?.subImages) &&
                    (dbProd.details as any).subImages.length > 0
                  ? (dbProd.details as any).subImages
                  : []
            ).filter((s: any) => typeof s === "string" && s.trim().length > 0);

            const resolvedSubImages = dbSubImages;

            return {
              ...dbProd,
              image: dbProd.image || "/placeholder.svg",
              subImages: resolvedSubImages,
              details: { ...(dbProd.details || {}), subImages: resolvedSubImages },
            };
          });

          saveItem("products", mergedProducts);
          return mergedProducts;
        });
      } catch (e) {
        console.warn("[store] Online re-sync failed:", e);
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const publishedProductBySlug = useMemo(
    () =>
      new Map(
        products
          .filter((product) => product.status !== "Draft")
          .map((product) => [product.slug, product]),
      ),
    [products],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const categoryBySlug = useMemo(
    () => new Map(categories.map((category) => [category.slug, category])),
    [categories],
  );
  const collectionById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection])),
    [collections],
  );
  const collectionBySlug = useMemo(
    () => new Map(collections.map((collection) => [collection.slug, collection])),
    [collections],
  );
  const collectionsByCategory = useMemo(() => {
    const index = new Map<string, Collection[]>();
    for (const collection of collections) {
      const group = index.get(collection.categoryId);
      if (group) group.push(collection);
      else index.set(collection.categoryId, [collection]);
    }
    return index;
  }, [collections]);

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
    (opts) => {
      const filtered = products.filter((p) => {
        // CRITICAL: Never show Draft products on the storefront
        if (p.status === "Draft") return false;
        if (opts?.categoryId && p.categoryId !== opts.categoryId) return false;
        if (opts?.collectionId && p.collectionId !== opts.collectionId) return false;
        if (opts?.search && !p.name.toLowerCase().includes(opts.search.toLowerCase())) return false;
        const price = p.salePrice ?? p.price;
        if (opts?.minPrice !== undefined && price < opts.minPrice) return false;
        if (opts?.maxPrice !== undefined && price > opts.maxPrice) return false;
        return true;
      });

      if (!opts?.sort) return filtered;

      return [...filtered].sort((a, b) => {
        const priceA = a.salePrice ?? a.price;
        const priceB = b.salePrice ?? b.price;
        if (opts.sort === "price-asc") return priceA - priceB;
        if (opts.sort === "price-desc") return priceB - priceA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    },
    [products],
  );

  const getProductsPage = useCallback<StoreApi["getProductsPage"]>(
    (opts) => {
      const pageSize = Math.max(1, Math.floor(opts?.pageSize ?? 12));
      const totalItems = getProducts(opts);
      const total = totalItems.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const page = Math.min(Math.max(1, Math.floor(opts?.page ?? 1)), totalPages);
      const start = (page - 1) * pageSize;

      return {
        items: totalItems.slice(start, start + pageSize),
        total,
        page,
        pageSize,
        totalPages,
      };
    },
    [getProducts],
  );

  const getProductBySlug = useCallback(
    (slug: string) => publishedProductBySlug.get(slug),
    [publishedProductBySlug],
  );
  const getProductById = useCallback((id: string) => productById.get(id), [productById]);
  const getCategoryBySlug = useCallback(
    (slug: string) => categoryBySlug.get(slug),
    [categoryBySlug],
  );
  const getCategoryById = useCallback((id: string) => categoryById.get(id), [categoryById]);
  const getCollections = useCallback<StoreApi["getCollections"]>(
    (categoryId) => (categoryId ? (collectionsByCategory.get(categoryId) ?? []) : collections),
    [collections, collectionsByCategory],
  );
  const getCollectionBySlug = useCallback(
    (slug: string) => collectionBySlug.get(slug),
    [collectionBySlug],
  );
  const getCollectionById = useCallback((id: string) => collectionById.get(id), [collectionById]);

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
      const catName = categoryById.get(p.categoryId)?.name ?? "-";
      if (p.variants.length) {
        for (const v of p.variants) {
          const key = `${p.id}:${v.id}`;
          rows.push({
            key,
            productId: p.id,
            variantId: v.id,
            categoryName: catName,
            name: `${p.name} - ${v.label}`,
            image: p.image,
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
          image: p.image,
          stock: p.stock,
          status: stockStatus(p.stock),
          updatedAt: stockTouched[key] ?? p.createdAt,
        });
      }
    }
    return rows;
  }, [products, categoryById, stockStatus, stockTouched]);

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

  const addOrder = useCallback<StoreApi["addOrder"]>(async (data, metaEvent) => {
    const { stockDeducted = false, ...rest } = data;
    const order: Order = {
      ...rest,
      reference: rest.reference?.trim() || newOrderReference(),
      id: uid("ord"),
      createdAt: nowIso(),
      status: "New",
      stockDeducted,
    };
    const saved = await dbInsertOrder(order, metaEvent);
    if (!saved) return null;
    setOrders((prev) => [order, ...prev]);
    return order;
  }, []);

  const addOrders = useCallback<StoreApi["addOrders"]>(async (data, idempotencyKey, metaEvent) => {
    const orders = data.map((entry) => {
      const { stockDeducted = false, ...rest } = entry;
      return {
        ...rest,
        reference: rest.reference?.trim() || newOrderReference(),
        id: uid("ord"),
        createdAt: nowIso(),
        status: "New" as const,
        stockDeducted,
      };
    });

    const saved = await dbInsertOrders(orders, idempotencyKey, metaEvent);
    if (!saved) return null;
    setOrders((prev) => [...orders, ...prev]);
    return orders;
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
    async (orderId, status) => {
      const order = orders.find((item) => item.id === orderId);
      if (!order) return false;

      const shouldDeduct = status === "Completed" && !order.stockDeducted && !!order.productId;
      const shouldReturn = status === "Cancelled" && order.stockDeducted && !!order.productId;
      const nextDeducted = shouldDeduct ? true : shouldReturn ? false : order.stockDeducted;

      const saved = await dbUpdateOrderStatus(orderId, status, nextDeducted);
      if (!saved) return false;

      setOrders((prev) =>
        prev.map((item) =>
          item.id === orderId ? { ...item, status, stockDeducted: nextDeducted } : item,
        ),
      );

      if (shouldDeduct && order.productId) {
        applyStockDelta(order.productId, order.variantId, -1);
      } else if (shouldReturn && order.productId) {
        applyStockDelta(order.productId, order.variantId, 1);
      }
      return true;
    },
    [applyStockDelta, orders],
  );

  const updateOrderCourier = useCallback<StoreApi["updateOrderCourier"]>(
    async (orderId, courierName, trackingNumber, status = "Dispatched") => {
      const dispatchedAt = nowIso();
      const saved = await dbUpdateOrderCourier(
        orderId,
        courierName,
        trackingNumber,
        status,
        dispatchedAt,
      );
      if (!saved) return false;
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
      return true;
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
    return deleteWithFeedback(dbDeleteQuery(id), () => {
      setQueries((prev) => prev.filter((q) => q.id !== id));
    });
  }, []);

  const saveProduct = useCallback<StoreApi["saveProduct"]>(async (product) => {
    // Preserve existing ID or generate new one
    const finalId = product.id?.trim() ? product.id : uid("prd");
    if (deletingProductIdsRef.current.has(finalId)) {
      toast.error("Product deletion is in progress. Refresh before editing it.");
      return;
    }

    // CRITICAL: Preserve existing slug for edits. Only generate new slug for new products.
    const finalSlug = product.slug?.trim()
      ? product.slug.trim()
      : product.name?.trim()
        ? product.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || finalId
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
      salePrice:
        product.salePrice != null &&
        !isNaN(Number(product.salePrice)) &&
        Number(product.salePrice) > 0
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
    if (!isOnlineRef.current) {
      // Offline: queue this product for sync when internet returns
      pendingSyncRef.current.set(fullProduct.id, fullProduct);
    } else {
      const result = await dbUpsertProduct(fullProduct);
      if (!result.success) {
        // DB save failed even though we appear online ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â also queue for retry
        pendingSyncRef.current.set(fullProduct.id, fullProduct);
        console.error("[saveProduct] Supabase sync failed, queued for retry:", result.error);
      } else {
        // Successful save ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â remove from pending queue if it was there
        pendingSyncRef.current.delete(fullProduct.id);
      }
    }
  }, []);

  const deleteProduct = useCallback<StoreApi["deleteProduct"]>(async (id) => {
    if (deletingProductIdsRef.current.has(id)) return false;
    deletingProductIdsRef.current.add(id);
    try {
      return await deleteWithFeedback(dbDeleteProduct(id), () => {
        pendingSyncRef.current.delete(id);
        recentlySavedRef.current.delete(id);
        setProducts((prev) => {
          const next = prev.filter((p) => p.id !== id);
          saveItem("products", next);
          return next;
        });
        setSocialReelsState((prev) => {
          const next = prev.map((r) => (r.productId === id ? { ...r, productId: null } : r));
          saveItem("socialReels", next);
          return next;
        });
        setTestimonials((prev) => {
          const next = prev.map((t) => (t.productId === id ? { ...t, productId: null } : t));
          saveItem("testimonials", next);
          return next;
        });
      });
    } finally {
      deletingProductIdsRef.current.delete(id);
    }
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

  const deleteCategory = useCallback<StoreApi["deleteCategory"]>((id) => {
    return deleteWithFeedback(dbDeleteCategory(id), () => {
      setCategories((prev) => {
        const next = prev.filter((c) => c.id !== id);
        saveItem("categories", next);
        return next;
      });
    });
  }, []);

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
    return deleteWithFeedback(dbDeleteCollection(id), () => {
      setCollections((prev) => {
        const next = prev.filter((c) => c.id !== id);
        saveItem("collections", next);
        return next;
      });
    });
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
      if (target) {
        persistWithFeedback(dbUpsertHeroSlide(target), "hero-save-error", "Hero slide");
      }
      return next;
    });
  }, []);

  const deleteHeroSlide = useCallback<StoreApi["deleteHeroSlide"]>((id) => {
    return deleteWithFeedback(dbDeleteHeroSlide(id), () => {
      setHeroSlidesState((prev) => {
        const next = prev.filter((s) => s.id !== id);
        saveItem("heroSlides", next);
        return next;
      });
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
      const ordered = copy.map((s, i) => ({ ...s, sortOrder: i }));
      saveItem("heroSlides", ordered);
      persistWithFeedback(dbUpsertHeroSlides(ordered), "hero-save-error", "Hero slides");
      return ordered;
    });
  }, []);

  const updateAnnouncement = useCallback<StoreApi["updateAnnouncement"]>((patch) => {
    setAnnouncement((prev) => {
      const next = { ...prev, ...patch };
      persistWithFeedback(dbUpsertAnnouncement(next), "announcement-save-error", "Announcement");
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

  const addCustomerReview = useCallback<StoreApi["addCustomerReview"]>(async (review) => {
    try {
      const response = await fetch("/api/v1/reviews", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review),
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: Testimonial;
        error?: { message?: string };
      } | null;
      if (!response.ok || !payload?.data) {
        return {
          ok: false,
          message: payload?.error?.message ?? "Your review could not be submitted.",
        };
      }

      const testimonial = payload.data;
      setTestimonials((prev) => {
        const next = prev.some((item) => item.id === testimonial.id)
          ? prev.map((item) => (item.id === testimonial.id ? testimonial : item))
          : [testimonial, ...prev];
        saveItem("testimonials", next);
        return next;
      });
      return { ok: true, message: "Thank you! Your review has been submitted.", testimonial };
    } catch {
      return { ok: false, message: "Your review could not be submitted. Please try again." };
    }
  }, []);

  const deleteTestimonial = useCallback<StoreApi["deleteTestimonial"]>((id) => {
    return deleteWithFeedback(dbDeleteTestimonial(id), () => {
      setTestimonials((prev) => {
        const next = prev.filter((t) => t.id !== id);
        saveItem("testimonials", next);
        return next;
      });
    });
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
        return {
          ok: false,
          error:
            "ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ Security Alert: Unsafe URL scheme detected.",
        };
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
    return deleteWithFeedback(dbDeleteBrand(id), () => {
      setBrands((prev) => {
        const next = prev.filter((b) => b.id !== id);
        saveItem("brands", next);
        return next;
      });
    });
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
      const ordered = copy.map((brand, i) => ({ ...brand, sortOrder: i }));
      saveItem("brands", ordered);
      ordered.forEach(dbUpsertBrand);
      return ordered;
    });
  }, []);

  const saveSocialReel = useCallback<StoreApi["saveSocialReel"]>((reel) => {
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
    return deleteWithFeedback(dbDeleteSocialReel(id), () => {
      setSocialReelsState((prev) => {
        const next = prev.filter((r) => r.id !== id);
        saveItem("socialReels", next);
        return next;
      });
    });
  }, []);

  const moveSocialReel = useCallback<StoreApi["moveSocialReel"]>((id, dir) => {
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
    return deleteWithFeedback(dbDeleteFaq(id), () => {
      setFaqsState((prev) => {
        const next = prev.filter((f) => f.id !== id);
        saveItem("faqs", next);
        return next;
      });
    });
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

  const addSubscriber = useCallback<StoreApi["addSubscriber"]>(
    async (email) => {
      const clean = email.trim().toLowerCase();
      if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        return { ok: false, message: "Please enter a valid email address." };
      }
      if (subscribers.some((subscriber) => subscriber.email.toLowerCase() === clean)) {
        return { ok: true, message: "You are already subscribed to our exclusive offers!" };
      }

      try {
        const response = await fetch("/api/v1/subscribers", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: clean }),
        });
        const payload = (await response.json().catch(() => null)) as {
          data?: Subscriber;
          error?: { message?: string };
        } | null;
        if (!response.ok || !payload?.data) {
          return {
            ok: false,
            message: payload?.error?.message ?? "We could not subscribe this email right now.",
          };
        }

        setSubscribersState((cur) => {
          if (cur.some((subscriber) => subscriber.email.toLowerCase() === clean)) return cur;
          return [payload.data!, ...cur];
        });
        return {
          ok: true,
          message: "Thank you for subscribing! You'll receive our exclusive drops & offers.",
        };
      } catch {
        return { ok: false, message: "We could not subscribe this email right now." };
      }
    },
    [subscribers],
  );

  const deleteSubscriber = useCallback<StoreApi["deleteSubscriber"]>((id) => {
    return deleteWithFeedback(dbDeleteSubscriber(id), () => {
      setSubscribersState((cur) => cur.filter((s) => s.id !== id));
    });
  }, []);

  const login = useCallback<StoreApi["login"]>(async (email, password) => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (isSupabaseConfigured) {
      try {
        const response = await fetch("/api/v1/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
        });
        const payload = (await response.json()) as {
          accessToken?: string;
          refreshToken?: string;
          error?: { message?: string; retryAfter?: number };
        };
        if (!response.ok || !payload.accessToken || !payload.refreshToken) {
          return {
            success: false,
            error: payload.error?.message ?? "Incorrect email or password.",
            ...(payload.error?.retryAfter ? { retryAfter: payload.error.retryAfter } : {}),
          };
        }

        recordAdminActivity();
        const { error } = await supabase.auth.setSession({
          access_token: payload.accessToken,
          refresh_token: payload.refreshToken,
        });
        if (error) {
          clearAdminActivity();
          return { success: false, error: "Authentication is temporarily unavailable." };
        }
        setIsAdmin(true);
        return { success: true };
      } catch {
        return { success: false, error: "Authentication is temporarily unavailable." };
      }
    }

    const developmentEmail = import.meta.env["VITE_DEV_ADMIN_EMAIL"];
    const developmentPassword = import.meta.env["VITE_DEV_ADMIN_PASSWORD"];
    const developmentLoginEnabled =
      import.meta.env.DEV && Boolean(developmentEmail && developmentPassword);

    if (
      developmentLoginEnabled &&
      trimmedEmail.toLowerCase() === developmentEmail.toLowerCase() &&
      trimmedPassword === developmentPassword
    ) {
      setIsAdmin(true);
      return { success: true };
    }

    return {
      success: false,
      error: import.meta.env.DEV
        ? "Configure Supabase Auth or the development-only admin credentials."
        : "Admin authentication is not configured.",
    };
  }, []);

  const logout = useCallback(async () => {
    authSessionVersionRef.current++;
    setIsAdmin(false);
    clearAdminActivity();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`${ADMIN_STORAGE_PREFIX}session`);
      sessionStorage.removeItem(`${ADMIN_STORAGE_PREFIX}session_token`);
      sessionStorage.removeItem(`${LEGACY_ADMIN_STORAGE_PREFIX}session`);
      sessionStorage.removeItem(`${LEGACY_ADMIN_STORAGE_PREFIX}session_token`);
      localStorage.removeItem(`${ADMIN_STORAGE_PREFIX}fp`);
      localStorage.removeItem(`${LEGACY_ADMIN_STORAGE_PREFIX}fp`);
      localStorage.setItem(`${ADMIN_STORAGE_PREFIX}attempts`, "0");
      localStorage.setItem(`${ADMIN_STORAGE_PREFIX}locked_until`, "0");
      localStorage.setItem(`${LEGACY_ADMIN_STORAGE_PREFIX}attempts`, "0");
      localStorage.setItem(`${LEGACY_ADMIN_STORAGE_PREFIX}locked_until`, "0");
    }
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    let lastRecordedAt = readAdminActivity();
    const recordActivity = () => {
      if (!window.location.pathname.startsWith("/admin")) return;
      const now = Date.now();
      if (now - lastRecordedAt < 15_000) return;
      lastRecordedAt = now;
      recordAdminActivity(now);
    };
    const enforceTimeout = () => {
      if (isAdminSessionInactive()) void logout();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") enforceTimeout();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === ADMIN_ACTIVITY_KEY) enforceTimeout();
    };
    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, { passive: true }),
    );
    window.addEventListener("focus", enforceTimeout);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const timer = window.setInterval(enforceTimeout, 15_000);

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, recordActivity));
      window.removeEventListener("focus", enforceTimeout);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(timer);
    };
  }, [isAdmin, logout]);

  const setHeroSlides = useCallback<StoreApi["setHeroSlides"]>((slides) => {
    const ordered = slides.map((slide, i) => ({ ...slide, sortOrder: i }));
    setHeroSlidesState(ordered);
    saveItem("heroSlides", ordered);
    persistWithFeedback(dbUpsertHeroSlides(ordered), "hero-save-error", "Hero slides");
  }, []);

  const setSocialReels = useCallback<StoreApi["setSocialReels"]>((reels) => {
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
      storefrontReady,
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
      getProductsPage,
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
      addOrders,
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
      addCustomerReview,
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
      storefrontReady,
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
      getProductsPage,
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
      addOrders,
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
      addCustomerReview,
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
