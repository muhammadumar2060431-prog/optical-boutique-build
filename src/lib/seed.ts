import type {
  AnnouncementSettings,
  Brand,
  Category,
  Collection,
  HeroSlide,
  Order,
  Product,
  SocialReel,
  StoreSettings,
  Testimonial,
  VideoSettings,
  FAQItem,
  Subscriber,
} from "./types";

// ─── All seed arrays are empty — add real data via the Admin panel ───────────

export const seedCategories: Category[] = [];

export const seedCollections: Collection[] = [];

export const seedProducts: Product[] = [];

export const seedOrders: Order[] = [];

export const seedHeroSlides: HeroSlide[] = [];

export const seedAnnouncement: AnnouncementSettings = {
  enabled: false,
  messages: [],
  background: "#0E0E10",
  textColor: "#F6F4EF",
};

export const seedTestimonials: Testimonial[] = [];

export const seedVideo: VideoSettings = {
  lockedChannel: "",
  videoUrl: "",
  videoId: null,
  caption: "",
};

export const seedSettings: StoreSettings = {
  storeName: "",
  logo: null,
  whatsapp: "",
  email: "",
  phone: "",
  address: "",
  hours: "",
  lowStockThreshold: 5,
  adminEmail: import.meta.env.VITE_ADMIN_EMAIL || "admin@optique.com",
  aboutHeadline: "",
  aboutBody: "",
};

export const seedBrands: Brand[] = [];

export const seedSocialReels: SocialReel[] = [];

export const seedBrandsRemaining: Brand[] = [];

export const seedFaqs: FAQItem[] = [];

export const seedSubscribers: Subscriber[] = [];
