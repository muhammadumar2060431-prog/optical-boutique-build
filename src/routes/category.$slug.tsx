import { createFileRoute, useParams } from "@tanstack/react-router";

import { CategoryView } from "@/components/site/CategoryView";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/category/$slug")({
  head: () => ({
    meta: [
      { title: "Collection | OPTIQUE" },
      { name: "description", content: "Browse an OPTIQUE eyewear collection." },
      { property: "og:title", content: "Collection | OPTIQUE" },
      { property: "og:description", content: "Browse an OPTIQUE eyewear collection." },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = useParams({ from: "/category/$slug" });
  const { getCategoryBySlug } = useStore();
  const category = getCategoryBySlug(slug);

  return (
    <SiteLayout>
      {category ? (
        <CategoryView category={category} />
      ) : (
        <div className="mx-auto max-w-3xl px-4 py-28 text-center">
          <h1 className="font-display text-3xl">Collection not found</h1>
          <p className="mt-2 text-sm text-ink-muted">
            We couldn't find that collection. Try Glasses or Lenses from the menu above.
          </p>
        </div>
      )}
    </SiteLayout>
  );
}
