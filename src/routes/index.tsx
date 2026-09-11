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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OPTIQUE — Designer Eyeglasses, Sunglasses & Contact Lenses" },
      {
        name: "description",
        content:
          "Shop handcrafted acetate & titanium frames, designer sunglasses, and prescription contact lenses. Enjoy free shipping and expert optician support.",
      },
      { property: "og:title", content: "OPTIQUE — Designer Eyeglasses, Sunglasses & Contact Lenses" },
      {
        property: "og:description",
        content: "Shop handcrafted acetate & titanium frames, designer sunglasses, and prescription contact lenses.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://optical-boutique-build.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://optical-boutique-build.lovable.app/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <SiteLayout>
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
      <FaqSection />

      <VideoSection />
    </SiteLayout>
  );
}
