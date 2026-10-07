import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle, RefreshCw } from "lucide-react";

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
  const { storefrontReady, storefrontError, retryStorefront } = useStore();

  return (
    <SiteLayout>
      {!storefrontReady ? (
        <div
          aria-busy={!storefrontError}
          className="flex min-h-[250px] items-center justify-center px-4 py-12 sm:min-h-[340px] md:min-h-[400px] lg:min-h-[450px]"
        >
          {storefrontError ? (
            <div role="alert" className="max-w-sm text-center">
              <h1 className="text-xl font-semibold">Unable to load the store</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={retryStorefront}
                className="mx-auto mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          ) : (
            <div role="status" className="flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
              Loading store...
            </div>
          )}
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
