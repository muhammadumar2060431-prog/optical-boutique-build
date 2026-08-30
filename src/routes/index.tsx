import { createFileRoute } from "@tanstack/react-router";

import { Hero } from "@/components/site/Hero";
import { ProductCard } from "@/components/site/ProductCard";
import { Reveal } from "@/components/site/Reveal";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Testimonials } from "@/components/site/Testimonials";
import { VideoSection } from "@/components/site/VideoSection";
import { useStore } from "@/lib/store";

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
  const { products } = useStore();
  const featured = products.filter((p) => p.featured).slice(0, 4);

  return (
    <SiteLayout>
      <Hero />

      <section className="lens-halo bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <p className="eyebrow text-gold">Bestsellers</p>
            <h2 className="mt-3 max-w-lg font-display text-3xl sm:text-4xl">
              The frames and lenses our opticians reach for first
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={i * 70}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Testimonials />
      <VideoSection />
    </SiteLayout>
  );
}
