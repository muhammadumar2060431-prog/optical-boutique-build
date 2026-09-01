import { createFileRoute, useParams } from "@tanstack/react-router";

import { CategoryView } from "@/components/site/CategoryView";
import { SiteLayout } from "@/components/site/SiteLayout";
import { seedCategories } from "@/lib/seed";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => {
    const category = seedCategories.find((c) => c.slug === params.slug);
    const url = `https://optical-boutique-build.lovable.app/category/${params.slug}`;
    const title = category ? `${category.name} | OPTIQUE` : "Collection | OPTIQUE";
    const description = category
      ? `Browse the OPTIQUE ${category.name.toLowerCase()} collection — optician-selected, hand-finished and fitted in store.`
      : "Browse an OPTIQUE eyewear collection.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
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
