import { createFileRoute } from "@tanstack/react-router";

import { CategoryView } from "@/components/site/CategoryView";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/lenses")({
  head: () => ({
    meta: [
      { title: "Precision Contact Lenses — Daily, Monthly & Toric | OPTIQUE" },
      {
        name: "description",
        content:
          "Shop premium daily disposables, monthly lenses, toric options for astigmatism, and cosmetic color contacts. Optician-approved for superior comfort.",
      },
      { property: "og:title", content: "Precision Contact Lenses | OPTIQUE" },
      {
        property: "og:description",
        content: "Shop premium daily disposables, toric lenses, and cosmetic color contacts.",
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
          <h1 className="font-display text-3xl">Collection Unavailable</h1>
          <p className="mt-2 text-sm text-ink-muted">
            The Contact Lenses collection is currently updating. Please explore our other collections or check back shortly.
          </p>
        </div>
      )}
    </SiteLayout>
  );
}
