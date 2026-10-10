import type { Category } from "./types.ts";

export function categoryLink(category: Pick<Category, "slug" | "name">) {
  const to =
    category.slug === "glasses"
      ? "/glasses"
      : category.slug === "lenses"
        ? "/lenses"
        : "/category/$slug";
  return { to, params: { slug: category.slug }, label: category.name };
}

export function categoryNavigation(categories: Category[]) {
  const sorted = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return {
    categories: sorted,
    links: sorted.map(categoryLink),
    showSelector: sorted.length > 1,
  };
}
