import heroOne from "@/assets/hero-1.jpg";
import heroTwo from "@/assets/hero-2.jpg";
import heroThree from "@/assets/hero-3.jpg";
import bannerGlasses from "@/assets/banner-glasses.jpg";
import bannerLenses from "@/assets/banner-lenses.jpg";
import pAviatorBlack from "@/assets/p-aviator-black.jpg";
import pAviatorBlue from "@/assets/p-aviator-blue.jpg";
import pRound from "@/assets/p-round-tortoise.jpg";
import pTitanium from "@/assets/p-titanium.jpg";
import pDaily from "@/assets/p-daily-lens.jpg";
import pColor from "@/assets/p-color-lens.jpg";
import pMonthly from "@/assets/p-monthly-lens.jpg";

import type {
  AnnouncementSettings,
  Category,
  HeroSlide,
  Order,
  Product,
  StoreSettings,
  Testimonial,
  VideoSettings,
} from "./types";

export const seedCategories: Category[] = [
  {
    id: "cat-glasses",
    slug: "glasses",
    name: "Glasses",
    banner: {
      image: bannerGlasses,
      heading: "Intelligent Glasses",
      subtext: "Screen protection • Transition tint • Drive-safe clarity",
      ctaText: "Shop Now",
      ctaLink: "/glasses",
    },
  },
  {
    id: "cat-lenses",
    slug: "lenses",
    name: "Lenses",
    banner: {
      image: bannerLenses,
      heading: "Contact Lenses, Perfected",
      subtext: "Daily comfort, breathable hydration, optician-approved",
      ctaText: "Explore Lenses",
      ctaLink: "/lenses",
    },
  },
];

export const seedProducts: Product[] = [
  {
    id: "prd-aviator",
    slug: "classic-aviator",
    name: "Classic Aviator",
    categoryId: "cat-glasses",
    price: 8900,
    description:
      "An enduring double-bridge silhouette rebuilt in hand-polished acetate with adjustable titanium temples. Balanced weight distribution keeps it comfortable through long working days.",
    image: pAviatorBlack,
    subImages: [pAviatorBlue, pRound],
    stock: 0,
    variants: [
      { id: "var-aviator-black", label: "Black", image: pAviatorBlack, stock: 12 },
      { id: "var-aviator-blue", label: "Blue", image: pAviatorBlue, stock: 3 },
    ],
    details: {
      material: "Hand-polished Italian acetate front, beta-titanium temples.",
      lensInfo: "Compatible with single vision, progressive and blue-light filters.",
      care: "Rinse with lukewarm water, dry with the supplied microfibre cloth.",
    },
    featured: true,
    createdAt: "2026-06-02T10:00:00.000Z",
  },
  {
    id: "prd-round",
    slug: "atelier-round",
    name: "Atelier Round",
    categoryId: "cat-glasses",
    price: 7400,
    description:
      "A softly rounded tortoiseshell frame with a slim keyhole bridge — a quiet, intellectual shape that flatters most face widths.",
    image: pRound,
    subImages: [pTitanium],
    stock: 9,
    variants: [],
    details: {
      material: "Layered tortoiseshell acetate with stainless steel core wire.",
      lensInfo: "Best suited to prescriptions up to -4.00 for edge-thin lenses.",
      care: "Store in the hard case; avoid leaving in direct sunlight.",
    },
    featured: true,
    createdAt: "2026-05-18T10:00:00.000Z",
  },
  {
    id: "prd-titanium",
    slug: "meridian-titanium",
    name: "Meridian Titanium",
    categoryId: "cat-glasses",
    price: 12500,
    description:
      "Featherweight rimless engineering at 11 grams. Precision-milled titanium with screwless hinges for a frame you forget you are wearing.",
    image: pTitanium,
    subImages: [],
    stock: 4,
    variants: [],
    details: {
      material: "Grade-5 titanium, hypoallergenic nose pads.",
      lensInfo: "Requires drill-mount lenses — fitted in our workshop.",
      care: "Tighten mounts annually at any OPTIQUE counter, free of charge.",
    },
    featured: true,
    createdAt: "2026-06-20T10:00:00.000Z",
  },
  {
    id: "prd-daily",
    slug: "clarity-daily-lenses",
    name: "Clarity Daily Lenses",
    categoryId: "cat-lenses",
    price: 3200,
    description:
      "A 30-pack of ultra-thin daily disposables with a 58% water content — fresh optics every morning, nothing to clean at night.",
    image: pDaily,
    subImages: [pMonthly],
    stock: 26,
    variants: [],
    details: {
      material: "Hydrogel with UV-A / UV-B blocking.",
      lensInfo: "Powers from -0.50 to -8.00 in 0.25 steps.",
      care: "Single use only — never re-wear a daily lens.",
    },
    featured: true,
    createdAt: "2026-06-11T10:00:00.000Z",
  },
  {
    id: "prd-color",
    slug: "hazel-tone-lenses",
    name: "Hazel Tone Lenses",
    categoryId: "cat-lenses",
    price: 4100,
    description:
      "Naturally graded colour lenses with a soft limbal ring, designed to warm the iris without looking printed.",
    image: pColor,
    subImages: [],
    stock: 2,
    variants: [],
    details: {
      material: "Silicone hydrogel with three-tone pigment sandwich.",
      lensInfo: "Available plano and in powers to -6.00.",
      care: "Disinfect nightly in fresh multi-purpose solution.",
    },
    featured: false,
    createdAt: "2026-04-29T10:00:00.000Z",
  },
  {
    id: "prd-monthly",
    slug: "monthly-toric-lenses",
    name: "Monthly Toric Lenses",
    categoryId: "cat-lenses",
    price: 5600,
    description:
      "Stabilised toric lenses for astigmatism, bundled with a 120ml care solution and travel case.",
    image: pMonthly,
    subImages: [pDaily],
    stock: 0,
    variants: [],
    details: {
      material: "Silicone hydrogel, 6-month blister shelf life.",
      lensInfo: "Cylinder -0.75 to -2.25, axis fitted after an in-store check.",
      care: "Replace the case every three months.",
    },
    featured: false,
    createdAt: "2026-03-14T10:00:00.000Z",
  },
];

export const seedOrders: Order[] = [
  {
    id: "ord-1001",
    reference: "OPT-204118",
    createdAt: "2026-08-22T09:12:00.000Z",
    customerName: "Ayesha Khan",
    contact: "+92 300 1234567",
    productId: "prd-aviator",
    productName: "Classic Aviator",
    variantId: "var-aviator-black",
    variantLabel: "Black",
    message: "Is the black frame available for pickup this week?",
    source: "whatsapp",
    status: "New",
    stockDeducted: false,
  },
  {
    id: "ord-1002",
    reference: "OPT-198744",
    createdAt: "2026-08-20T15:40:00.000Z",
    customerName: "Bilal Ahmed",
    contact: "bilal.ahmed@example.com",
    productId: "prd-daily",
    productName: "Clarity Daily Lenses",
    variantId: null,
    variantLabel: null,
    message: "Need two boxes at -2.25. Do you deliver to Lahore?",
    source: "form",
    status: "Contacted",
    stockDeducted: false,
  },
  {
    id: "ord-1003",
    reference: "OPT-186320",
    createdAt: "2026-08-17T11:05:00.000Z",
    customerName: "Sana Yousuf",
    contact: "+92 321 9876543",
    productId: "prd-titanium",
    productName: "Meridian Titanium",
    variantId: null,
    variantLabel: null,
    message: "Ordered on WhatsApp — collected in store.",
    source: "whatsapp",
    status: "Completed",
    stockDeducted: true,
  },
  {
    id: "ord-1004",
    reference: "OPT-175509",
    createdAt: "2026-08-12T18:22:00.000Z",
    customerName: "Hamza Iqbal",
    contact: "hamza@example.com",
    productId: "prd-color",
    productName: "Hazel Tone Lenses",
    variantId: null,
    variantLabel: null,
    message: "Changed my mind, please cancel.",
    source: "form",
    status: "Cancelled",
    stockDeducted: false,
  },
];

export const seedHeroSlides: HeroSlide[] = [
  {
    id: "hero-1",
    image: heroOne,
    eyebrow: "New Season Optics",
    headline: "Frames cut for the way you actually see",
    subtext: "Hand-finished acetate and titanium, fitted by opticians in-store.",
    ctaText: "Shop Frames",
    ctaLink: "/glasses",
    enabled: true,
  },
  {
    id: "hero-2",
    image: heroTwo,
    eyebrow: "Precision Fitting",
    headline: "A lens is only as good as its fit",
    subtext: "Free measurement and adjustment for the life of your frame.",
    ctaText: "Book a Fitting",
    ctaLink: "/contact",
    enabled: true,
  },
  {
    id: "hero-3",
    image: heroThree,
    eyebrow: "Daily Comfort",
    headline: "Contact lenses that breathe all day",
    subtext: "Hydrogel dailies, torics and colour tones — all optician approved.",
    ctaText: "Explore Lenses",
    ctaLink: "/lenses",
    enabled: true,
  },
];

export const seedAnnouncement: AnnouncementSettings = {
  enabled: true,
  messages: [
    "Back in stock: the Classic Aviator",
    "New drop: Blue Light lenses now available",
    "Free delivery on orders above Rs. 5,000",
    "Visit our warehouse showroom",
  ],
  background: "#0E0E10",
  textColor: "#F6F4EF",
};

export const seedTestimonials: Testimonial[] = [
  {
    id: "tst-1",
    name: "Maryam Sheikh",
    quote:
      "The fitting appointment was worth the trip alone. My progressives finally feel natural instead of like a compromise.",
    rating: 5,
    photo: null,
  },
  {
    id: "tst-2",
    name: "Usman Tariq",
    quote:
      "Ordered the Meridian Titanium on WhatsApp at 9pm and had it adjusted on my face the next afternoon.",
    rating: 5,
    photo: null,
  },
  {
    id: "tst-3",
    name: "Zainab Ali",
    quote:
      "I've bought lenses online for years — this is the first time someone actually checked my prescription first.",
    rating: 4,
    photo: null,
  },
  {
    id: "tst-4",
    name: "Faisal Rehman",
    quote: "Quiet showroom, no pressure, genuinely knowledgeable staff. The frames speak for themselves.",
    rating: 5,
    photo: null,
  },
];

export const seedVideo: VideoSettings = {
  lockedChannel: "",
  videoUrl: "",
  videoId: null,
  caption: "A look inside the workshop where every OPTIQUE frame is finished and quality-checked by hand.",
};

export const seedSettings: StoreSettings = {
  storeName: "OPTIQUE",
  logo: null,
  whatsapp: "+923001234567",
  email: "hello@optique.example",
  phone: "+92 300 1234567",
  address: "24 Lens Court, Clifton Block 4, Karachi",
  hours: "Mon–Sat, 11:00 – 20:00",
  lowStockThreshold: 5,
  adminEmail: "admin@optique.com",
  adminPassword: "optique123",
  aboutHeadline: "Optics, made deliberately slow",
  aboutBody:
    "OPTIQUE began in a single workshop with one belief: a pair of glasses is a medical instrument you happen to wear on your face. Every frame we sell is chosen for how it holds a lens, not just how it photographs.\n\nWe cut, polish and fit in-house. Our opticians measure each pupil individually, adjust the bridge to your nose, and keep your file so a repair years later still fits like the first day.\n\nWe stock only what we would wear ourselves — a short, considered range of frames and lenses backed by a full warranty and honest advice.",
};
