import { createFileRoute, useParams } from "@tanstack/react-router";

import { CategoryView } from "@/components/site/CategoryView";
import { SiteLayout } from "@/components/site/SiteLayout";
import { seedCategories } from "@/lib/seed";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => {
    const category = seedCategories.find((c) => c.slug === params.slug);
    const url = `https://optical-boutique-build.lovable.app/category/${params.slug}`;
    const title = category ? `${category.name} — Handcrafted Eyewear | OPTIQUE` : "Eyewear Collection | OPTIQUE";
    const description = category
      ? `Explore the OPTIQUE ${category.name.toLowerCase()} collection. Featuring premium materials, expert fitting, and fast delivery.`
      : "Explore our curated collection of premium designer eyewear and lenses.";
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
          <h1 className="font-display text-3xl">Collection Not Found</h1>
          <p className="mt-2 text-sm text-ink-muted">
            The requested collection could not be found. Please browse our Eyeglasses or Sunglasses collections from the navigation above.
          </p>
        </div>
      )}
    </SiteLayout>
  );
}
