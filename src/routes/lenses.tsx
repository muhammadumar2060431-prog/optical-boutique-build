import { createFileRoute } from "@tanstack/react-router";

import { CategoryView } from "@/components/site/CategoryView";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/lenses")({
  head: () => ({
    meta: [
      { title: "Contact Lenses — Daily, Toric & Colour | OPTIQUE" },
      {
        name: "description",
        content:
          "Breathable daily disposables, toric lenses for astigmatism and natural colour tones — all checked by our opticians.",
      },
      { property: "og:title", content: "Contact Lenses — Daily, Toric & Colour | OPTIQUE" },
      {
        property: "og:description",
        content: "Optician-approved contact lenses with honest fitting advice.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://optical-boutique-build.lovable.app/lenses" },
    ],
    links: [{ rel: "canonical", href: "https://optical-boutique-build.lovable.app/lenses" }],
  }),
  component: LensesPage,
});

function LensesPage() {
  const { getCategoryBySlug } = useStore();
  const category = getCategoryBySlug("lenses");

  return (
    <SiteLayout>
      {category ? (
        <CategoryView category={category} />
      ) : (
        <div className="mx-auto max-w-3xl px-4 py-28 text-center">
          <h1 className="font-display text-3xl">This collection has moved</h1>
          <p className="mt-2 text-sm text-ink-muted">
            The Lenses category isn't available right now — please check back soon.
          </p>
        </div>
      )}
    </SiteLayout>
  );
}
