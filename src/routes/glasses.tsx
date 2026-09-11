import { createFileRoute } from "@tanstack/react-router";

import { CategoryView } from "@/components/site/CategoryView";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/glasses")({
  head: () => ({
    meta: [
      { title: "Designer Eyeglasses & Frames — Handcrafted Optics | OPTIQUE" },
      {
        name: "description",
        content:
          "Explore handcrafted acetate, titanium, and minimalist eyeglass frames. Precision-cut and fitted with premium prescription lenses.",
      },
      { property: "og:title", content: "Designer Eyeglasses & Frames | OPTIQUE" },
      {
        property: "og:description",
        content: "Explore handcrafted acetate, titanium, and minimalist eyeglass frames.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://optical-boutique-build.lovable.app/glasses" },
    ],
    links: [{ rel: "canonical", href: "https://optical-boutique-build.lovable.app/glasses" }],
  }),
  component: GlassesPage,
});

function GlassesPage() {
  const { getCategoryBySlug } = useStore();
  const category = getCategoryBySlug("glasses");

  return (
    <SiteLayout>
      {category ? (
        <CategoryView category={category} />
      ) : (
        <div className="mx-auto max-w-3xl px-4 py-28 text-center">
          <h1 className="font-display text-3xl">Collection Unavailable</h1>
          <p className="mt-2 text-sm text-ink-muted">
            The Eyeglasses collection is currently updating. Please explore our other collections or check back shortly.
          </p>
        </div>
      )}
    </SiteLayout>
  );
}
