import { createFileRoute } from "@tanstack/react-router";

import { FaqSection } from "@/components/site/FaqSection";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/faqs")({
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions (FAQs) — OPTIQUE Eyewear" },
      {
        name: "description",
        content:
          "Find answers to common questions about prescription lenses, frame fittings, doorstep delivery, warranty, and optical guarantees at OPTIQUE Eyewear.",
      },
      { property: "og:title", content: "Frequently Asked Questions — OPTIQUE Eyewear" },
      {
        property: "og:description",
        content:
          "Everything you need to know about our prescription lenses, frame fitting, and optical services.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: getSiteUrl("/faqs") },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/faqs") }],
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
