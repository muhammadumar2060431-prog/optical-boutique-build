export type ID = string;

export interface Variant {
  id: ID;
  label: string;
  image: string;
  stock: number;
}

export interface Product {
  id: ID;
  slug: string;
  name: string;
  categoryId: ID;
  price: number;
  description: string;
  image: string;
  subImages: string[];
  stock: number;
  variants: Variant[];
  details: {
    material: string;
    lensInfo: string;
    care: string;
  };
  featured: boolean;
  createdAt: string;
}

export interface CategoryBanner {
  image: string;
  heading: string;
  subtext: string;
  ctaText: string;
  ctaLink: string;
}

export interface Category {
  id: ID;
  slug: string;
  name: string;
  banner: CategoryBanner | null;
}

export type OrderSource = "whatsapp" | "form" | "cart";
export type OrderStatus = "New" | "Contacted" | "Completed" | "Cancelled";

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
  quote: string;
  rating: number;
  photo: string | null;
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
