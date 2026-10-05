import type { Category, Product } from "./types";
import { getSiteUrl } from "./utils";
import { serializeJsonForHtml } from "./security";

type JsonLd = Record<string, unknown>;

const SITE_NAME = "Nigah";
const DEFAULT_LOGO = getSiteUrl("/brand-logo.png");
const DEFAULT_IMAGE = DEFAULT_LOGO;
const SAME_AS = ["https://www.instagram.com/", "https://www.facebook.com/"];

export function jsonLdScript(schema: JsonLd | JsonLd[]) {
  return {
    type: "application/ld+json",
    children: serializeJsonForHtml(schema),
  };
}

export function organizationSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": getSiteUrl("/#organization"),
    name: SITE_NAME,
    url: getSiteUrl("/"),
    logo: {
      "@type": "ImageObject",
      url: DEFAULT_LOGO,
    },
    image: DEFAULT_IMAGE,
    sameAs: SAME_AS,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        areaServed: "PK",
        availableLanguage: ["en", "ur"],
      },
    ],
  };
}

export function opticianBusinessSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "Optician"],
    "@id": getSiteUrl("/#local-business"),
    name: SITE_NAME,
    url: getSiteUrl("/"),
    image: DEFAULT_IMAGE,
    logo: DEFAULT_LOGO,
    priceRange: "PKR",
    currenciesAccepted: "PKR",
    paymentAccepted: "Cash, Bank Transfer, Card",
    areaServed: {
      "@type": "Country",
      name: "Pakistan",
    },
    parentOrganization: { "@id": getSiteUrl("/#organization") },
  };
}

export function websiteSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": getSiteUrl("/#website"),
    name: SITE_NAME,
    url: getSiteUrl("/"),
    publisher: { "@id": getSiteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: `${getSiteUrl("/glasses")}?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function webPageSchema(input: {
  path: string;
  name: string;
  description: string;
  type?: "WebPage" | "AboutPage" | "ContactPage" | "FAQPage" | "CollectionPage";
}): JsonLd {
  const url = getSiteUrl(input.path);
  return {
    "@context": "https://schema.org",
    "@type": input.type ?? "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: input.name,
    description: input.description,
    isPartOf: { "@id": getSiteUrl("/#website") },
    publisher: { "@id": getSiteUrl("/#organization") },
    inLanguage: "en-PK",
  };
}

export function collectionPageSchema(input: {
  path: string;
  name: string;
  description: string;
  image?: string | null;
  category?: Category | null;
}): JsonLd {
  const image = input.image && input.image !== "/placeholder.svg" ? input.image : DEFAULT_IMAGE;
  return {
    ...webPageSchema({
      path: input.path,
      name: input.name,
      description: input.description,
      type: "CollectionPage",
    }),
    image: image.startsWith("http") ? image : getSiteUrl(image),
    mainEntity: input.category
      ? {
          "@type": "ItemList",
          name: input.category.name,
          itemListOrder: "https://schema.org/ItemListOrderAscending",
        }
      : undefined,
  };
}

export function productSchema(product: Product, path: string): JsonLd {
  const url = getSiteUrl(path);
  const image =
    product.image && product.image !== "/placeholder.svg" ? product.image : DEFAULT_IMAGE;
  const price = product.salePrice ?? product.price;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.description || product.details?.lensInfo || "Premium eyewear from Nigah.",
    sku: product.sku || product.id,
    image: [image.startsWith("http") ? image : getSiteUrl(image)],
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    category: product.categoryId,
    material: product.details?.frameMaterial || product.details?.material,
    offers: {
      "@type": "Offer",
      url,
      price,
      priceCurrency: "PKR",
      itemCondition: "https://schema.org/NewCondition",
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@id": getSiteUrl("/#organization") },
    },
  };
}

export function faqPageSchema(items: Array<{ question: string; answer: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${getSiteUrl("/faqs")}#faqpage`,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
