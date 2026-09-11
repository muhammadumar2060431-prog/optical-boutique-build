export type ID = string;

export interface Variant {
  id: ID;
  label: string;
  image: string;
  stock: number;
  swatchColourHex?: string;
  price?: number;
}

export type ProductStatus = "Draft" | "Published" | "Archived";

export interface ProductSpecs {
  frameMaterial?: string;
  lensMaterial?: string;
  lensType?: string[];
  uvProtection?: string;
  warranty?: string;
  material: string;
  lensInfo: string;
  care: string;
}

export interface Product {
  id: ID;
  slug: string;
  name: string;
  categoryId: ID;
  collectionId?: ID | null;
  price: number;
  salePrice?: number | null;
  sku?: string;
  description: string;
  image: string;
  hoverImage?: string | null;
  subImages: string[];
  stock: number;
  variants: Variant[];
  details: ProductSpecs;
  featured: boolean;
  isNewArrival?: boolean;
  newArrivalImage?: string | null;
  isBestseller?: boolean;
  scheduleLaunchDate?: string | null;
  status?: ProductStatus;
  taxInclusive?: boolean;
  createdAt: string;
}

export interface CategoryBanner {
  image: string;
  heading: string;
  subtext: string;
  ctaText: string;
  ctaLink: string;
}

export interface Collection {
  id: ID;
  categoryId: ID;
  slug: string;
  name: string;
  banner?: CategoryBanner | null;
  description?: string;
  showInNav?: boolean;
  sortOrder?: number;
}

export interface Category {
  id: ID;
  slug: string;
  name: string;
  image?: string | null;
  banner: CategoryBanner | null;
}

export type OrderSource = "whatsapp" | "form" | "cart";
export type OrderStatus = "New" | "Contacted" | "Dispatched" | "Completed" | "Cancelled";

export interface Order {
  id: ID;
  /** Customer-facing lookup code, e.g. "OPT-204118". */
  reference: string;
  createdAt: string;
  customerName: string;
  contact: string;
  productId: ID | null;
  productName: string;
  variantId: ID | null;
  variantLabel: string | null;
  message: string;
  source: OrderSource;
  status: OrderStatus;
  stockDeducted: boolean;
  courierName?: string | null;
  trackingNumber?: string | null;
  dispatchedAt?: string | null;
}

export interface HeroSlide {
  id: ID;
  image: string;
  eyebrow: string;
  headline: string;
  subtext: string;
  ctaText: string;
  ctaLink: string;
  enabled: boolean;
}

export interface AnnouncementSettings {
  enabled: boolean;
  messages: string[];
  background: string;
  textColor: string;
}

export interface Testimonial {
  id: ID;
  name: string;
  email?: string | null;
  productId?: ID | null;
  productName?: string | null;
  title?: string | null;
  quote: string;
  rating: number;
  photo?: string | null;
  reviewImage?: string | null;
  createdAt?: string;
  verified?: boolean;
}

export interface VideoSettings {
  lockedChannel: string;
  videoUrl: string;
  videoId: string | null;
  caption: string;
}

export interface StoreSettings {
  storeName: string;
  logo: string | null;
  whatsapp: string;
  email: string;
  phone: string;
  address: string;
  hours: string;
  lowStockThreshold: number;
  adminEmail: string;
  adminPassword: string;
  aboutHeadline: string;
  aboutBody: string;
}

export type StockStatus = "In stock" | "Low stock" | "Out of stock";

export interface Brand {
  id: ID;
  name: string;
  logo: string | null;
  enabled: boolean;
}

export type SocialPlatform = "instagram" | "tiktok" | "youtube" | "facebook" | "custom";

export interface SocialReel {
  id: ID;
  title: string;
  creatorName?: string;
  creatorHandle?: string;
  platform: SocialPlatform;
  videoUrl: string;
  thumbnail: string;
  duration?: string;
  productId?: ID | null;
  enabled: boolean;
}

export interface FAQItem {
  id: ID;
  question: string;
  answer: string;
  category?: string;
  enabled: boolean;
}

export interface Subscriber {
  id: ID;
  email: string;
  createdAt: string;
  status: "active" | "unsubscribed";
}

export interface ContactQuery {
  id: ID;
  name: string;
  contact: string;
  productName: string;
  productId?: ID | null;
  message: string;
  createdAt: string;
  status: "New" | "Responded" | "Archived";
}

