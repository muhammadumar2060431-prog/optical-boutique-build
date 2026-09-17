import { createFileRoute, useParams } from "@tanstack/react-router";

import { CategoryView } from "@/components/site/CategoryView";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/lib/supabase";
import { mapDbCategoryToStore } from "@/lib/supabaseSync";
import type { Category } from "@/lib/types";
import { useStore } from "@/lib/store";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params }) => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", params.slug)
        .maybeSingle();

      if (data && !error) {
        return { category: mapDbCategoryToStore(data) };
      }
    } catch {}

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("optique_v1_categories");
        if (raw) {
          const cats: Category[] = JSON.parse(raw);
          const found = cats.find((c) => c.slug === params.slug);
          if (found) return { category: found };
        }
      } catch {}
    }

    return { category: null };
  },
  head: ({ loaderData, params }) => {
    const category = loaderData?.category;
    const url = getSiteUrl(`/category/${params.slug}`);
    const title = category ? `${category.name} — Handcrafted Eyewear | OPTIQUE` : "Eyewear Collection | OPTIQUE";
    const description = category
      ? `Explore the OPTIQUE ${category.name.toLowerCase()} collection. Featuring premium materials, expert fitting, and fast delivery.`
      : "Explore our curated collection of premium designer eyewear and lenses.";
    const ogImage = category?.image && category.image !== "/placeholder.svg" ? category.image : "/brand-logo.png";
    const ogImageUrl = ogImage.startsWith("http") ? ogImage : getSiteUrl(ogImage);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImageUrl },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: ogImageUrl },
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
