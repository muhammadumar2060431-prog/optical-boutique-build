import { createServerFn } from "@tanstack/react-start";
import { hasStorefrontContent, withStorefrontTimeout } from "./storefront-loading";
import type { InitialSupabaseData } from "./supabaseSync";
import type { Product } from "./types";

export type InitialCatalog = {
  categoryId: string;
  result: { items: Product[]; total: number; page: number; pageSize: number; totalPages: number };
};

export const loadStorefront = createServerFn({ method: "GET" })
  .validator((pathname: string) => {
    if (typeof pathname !== "string" || pathname.length > 500) throw new Error("Invalid page path");
    return pathname;
  })
  .handler(async ({ data: pathname }) => {
    if (!import.meta.env.VITE_SUPABASE_URL) return null;
    try {
      const { storefrontCacheHandler } = await import("./api/storefront-cache.server");
      const payload = await withStorefrontTimeout(
        storefrontCacheHandler().then((response) => response.json()),
      );
      const data = (payload as { data: InitialSupabaseData | null }).data;
      if (!hasStorefrontContent(data)) return null;
      let catalog: InitialCatalog | null = null;
      const slug =
        pathname === "/glasses" || pathname === "/lenses"
          ? pathname.slice(1)
          : pathname.startsWith("/category/")
            ? pathname.slice("/category/".length)
            : null;
      const category = data.categories?.find((item) => item.slug === slug);
      if (category) {
        try {
          const { supabase } = await import("./supabase");
          const { mapDbProductToStore } = await import("./supabaseSync");
          const { data: page, error } = await withStorefrontTimeout(
            supabase.rpc("catalog_product_page_v1", {
              p_category: category.id,
              p_collection: null,
              p_min: null,
              p_max: null,
              p_sort: "newest",
              p_limit: 12,
              p_offset: 0,
            }),
            2_000,
          );
          if (!error && page && Array.isArray(page.rows)) {
            const total = Number(page.total) || 0;
            catalog = {
              categoryId: category.id,
              result: {
                items: page.rows.map(mapDbProductToStore),
                total,
                page: 1,
                pageSize: 12,
                totalPages: Math.max(1, Math.ceil(total / 12)),
              },
            };
          }
        } catch {
          /* The existing catalog query retries if server preloading fails. */
        }
      }
      return { storefront: data, catalog };
    } catch {
      // Keep the existing client retry available when the server cannot load the store.
      return null;
    }
  });
