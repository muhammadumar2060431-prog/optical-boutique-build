import { createFileRoute } from "@tanstack/react-router";

import { BrandsScrollBar } from "@/components/site/BrandsScrollBar";
import { CategoryBestsellersShowcase } from "@/components/site/CategoryBestsellersShowcase";
import { FaqSection } from "@/components/site/FaqSection";
import { Hero } from "@/components/site/Hero";
import { NewArrivalsShowcase } from "@/components/site/NewArrivalsShowcase";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SocialProofReels } from "@/components/site/SocialProofReels";
import { Testimonials } from "@/components/site/Testimonials";
import { VideoSection } from "@/components/site/VideoSection";
import { useStore } from "@/lib/store";
import { breadcrumbSchema, jsonLdScript, webPageSchema } from "@/lib/schema";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nigah — Designer Eyeglasses, Sunglasses & Contact Lenses" },
      {
        name: "description",
        content:
          "Shop handcrafted acetate & titanium frames, designer sunglasses, and prescription contact lenses. Enjoy free shipping and expert optician support.",
      },
      {
        property: "og:title",
        content: "Nigah — Designer Eyeglasses, Sunglasses & Contact Lenses",
      },
      {
        property: "og:description",
        content:
          "Shop handcrafted acetate & titanium frames, designer sunglasses, and prescription contact lenses.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: getSiteUrl("/") },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/") }],
    scripts: [
      jsonLdScript([
        webPageSchema({
          path: "/",
          name: "Nigah Designer Eyewear Store",
          description:
            "Shop handcrafted eyeglasses, sunglasses, and contact lenses with expert optician support.",
        }),
        breadcrumbSchema([{ name: "Home", url: getSiteUrl("/") }]),
      ]),
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { storefrontReady } = useStore();

  return (
    <SiteLayout>
      {!storefrontReady ? (
        <div aria-busy="true" aria-label="Loading storefront">
          <div className="h-[250px] w-full animate-pulse bg-jet sm:h-[340px] md:h-[400px] lg:h-[450px]" />
          <div className="h-16 w-full bg-background sm:h-24" />
        </div>
      ) : (
        <>
          <Hero />
          <BrandsScrollBar />

          {/* ── 3D Floating & Bouncing New Arrivals Showcase ── */}
          <NewArrivalsShowcase />

          {/* ── Shop by Category with Dynamic Best Sellers ── */}
          <CategoryBestsellersShowcase />

          {/* ── Social Proof & Collaboration Reels (Matching Images 1, 2, 3) ── */}
          <SocialProofReels />

          {/* ── Customer Reviews & Proofs (Infinite Scrollable Marquee) ── */}
          <Testimonials />

          {/* ── Frequently Asked Questions (Interactive Aesthetic Accordion) ── */}
          <FaqSection isHomepage={true} />

          <VideoSection />
        </>
      )}
    </SiteLayout>
  );
}
