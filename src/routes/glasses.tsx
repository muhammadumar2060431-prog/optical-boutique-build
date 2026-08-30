import { createFileRoute } from "@tanstack/react-router";

import { CategoryView } from "@/components/site/CategoryView";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/glasses")({
  head: () => ({
    meta: [
      { title: "Glasses — Hand-finished Frames | OPTIQUE" },
      {
        name: "description",
        content:
          "Acetate, titanium and rimless eyeglass frames, cut and polished in-house and fitted by registered opticians.",
      },
      { property: "og:title", content: "Glasses — Hand-finished Frames | OPTIQUE" },
      {
        property: "og:description",
        content: "Browse the OPTIQUE frame collection: acetate, titanium and rimless.",
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
          <h1 className="font-display text-3xl">This collection has moved</h1>
          <p className="mt-2 text-sm text-ink-muted">
            The Glasses category isn't available right now — please check back soon.
          </p>
        </div>
      )}
    </SiteLayout>
  );
}
