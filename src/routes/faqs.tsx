import { createFileRoute } from "@tanstack/react-router";

import { FaqSection } from "@/components/site/FaqSection";
import { SiteLayout } from "@/components/site/SiteLayout";
import { breadcrumbSchema, faqPageSchema, jsonLdScript, webPageSchema } from "@/lib/schema";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/faqs")({
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions (FAQs) — Nigah Eyewear" },
      {
        name: "description",
        content:
          "Find answers to common questions about prescription lenses, frame fittings, doorstep delivery, warranty, and optical guarantees at Nigah Eyewear.",
      },
      { property: "og:title", content: "Frequently Asked Questions — Nigah Eyewear" },
      {
        property: "og:description",
        content:
          "Everything you need to know about our prescription lenses, frame fitting, and optical services.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: getSiteUrl("/faqs") },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/faqs") }],
    scripts: [
      jsonLdScript([
        webPageSchema({
          path: "/faqs",
          name: "Frequently Asked Questions",
          description:
            "Answers about Nigah prescription lenses, frame fittings, delivery, warranty, and optical services.",
          type: "FAQPage",
        }),
        faqPageSchema([
          {
            question: "Do you offer prescription lenses?",
            answer:
              "Yes. Nigah supports prescription lens guidance and frame fitting through our optical team.",
          },
          {
            question: "Can I track my order?",
            answer:
              "Yes. Use your OPT order reference on the order tracking page to view status and courier details.",
          },
          {
            question: "Do you provide warranty support?",
            answer:
              "Warranty and support depend on the selected frame or lens product and are handled by the Nigah team.",
          },
        ]),
        breadcrumbSchema([
          { name: "Home", url: getSiteUrl("/") },
          { name: "FAQs", url: getSiteUrl("/faqs") },
        ]),
      ]),
    ],
  }),
  component: FaqsPage,
});

function FaqsPage() {
  return (
    <SiteLayout>
      <div className="bg-white">
        <FaqSection isHomepage={false} />
      </div>
    </SiteLayout>
  );
}
