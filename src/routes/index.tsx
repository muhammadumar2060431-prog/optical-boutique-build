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
      { title: "OPTIQUE — Premium Eyeglasses & Contact Lenses" },
      {
        name: "description",
        content:
          "Hand-finished acetate and titanium frames plus optician-approved contact lenses, fitted in store and delivered nationwide.",
      },
      { property: "og:title", content: "OPTIQUE — Premium Eyeglasses & Contact Lenses" },
      {
        property: "og:description",
        content: "A short, considered range of frames and lenses, fitted by opticians.",
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
