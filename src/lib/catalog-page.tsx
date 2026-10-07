import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLoaderData } from "@tanstack/react-router";
import { supabase, isSupabaseConfigured } from "./supabase";
import { mapDbProductToStore } from "./supabaseSync";
import { useStore } from "./store";
import type { Product } from "./types";

export function useCatalogPage(options: {
  categoryId?: string;
  collectionId?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: "newest" | "price-asc" | "price-desc";
  page: number;
  pageSize: number;
}) {
  const { getProductsPage, rememberAdminRecords } = useStore();
  const bootstrap = useLoaderData({ from: "__root__" });
  const initialCatalog = bootstrap?.catalog;
  const query = useQuery({
    queryKey: ["catalog-page", options],
    enabled: isSupabaseConfigured,
    staleTime: 30000,
    initialData: () =>
      initialCatalog &&
      initialCatalog.categoryId === options.categoryId &&
      !options.collectionId &&
      options.minPrice === undefined &&
      options.maxPrice === undefined &&
      options.sort === "newest" &&
      options.page === 1 &&
      options.pageSize === 12
        ? initialCatalog.result
        : undefined,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("catalog_product_page_v1", {
        p_category: options.categoryId ?? null,
        p_collection: options.collectionId ?? null,
        p_min: options.minPrice ?? null,
        p_max: options.maxPrice ?? null,
        p_sort: options.sort,
        p_limit: options.pageSize,
        p_offset: (options.page - 1) * options.pageSize,
      });
      if (error || !data || !Array.isArray(data.rows))
        throw new Error("Products could not be loaded. Please retry.");
      return {
        items: (data.rows as Record<string, unknown>[]).map(mapDbProductToStore) as Product[],
        total: Number(data.total) || 0,
        page: options.page,
        pageSize: options.pageSize,
        totalPages: Math.max(1, Math.ceil(Number(data.total) / options.pageSize)),
      };
    },
  });
  useEffect(() => {
    if (query.data) rememberAdminRecords("products", query.data.items);
  }, [query.data, rememberAdminRecords]);
  return {
    ...query,
    result: isSupabaseConfigured
      ? (query.data ?? {
          items: [],
          total: 0,
          page: options.page,
          pageSize: options.pageSize,
          totalPages: 1,
        })
      : getProductsPage(options),
  };
}
