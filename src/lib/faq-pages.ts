import type { FAQItem, FAQPage } from "./types.ts";

export const FAQ_PAGES: { id: FAQPage; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "cart", label: "Cart" },
  { id: "checkout", label: "Checkout" },
  { id: "tracking", label: "Tracking" },
];

export function faqPages(faq: Pick<FAQItem, "showOnPages" | "showOnHome">): FAQPage[] {
  if (!Array.isArray(faq.showOnPages)) return faq.showOnHome ? ["home"] : [];
  return FAQ_PAGES.filter((page) => faq.showOnPages?.includes(page.id)).map((page) => page.id);
}

export function faqsForPage(faqs: FAQItem[], page: FAQPage): FAQItem[] {
  return faqs.filter((faq) => faq.enabled !== false && faqPages(faq).includes(page));
}

export function setFaqPage(faq: FAQItem, page: FAQPage, enabled: boolean): FAQItem {
  const pages = new Set(faqPages(faq));
  if (enabled) pages.add(page);
  else pages.delete(page);
  return { ...faq, showOnPages: [...pages], showOnHome: pages.has("home") };
}
