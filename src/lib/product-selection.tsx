import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "./supabase";
import { mapDbProductToStore } from "./supabaseSync";
import type { Product } from "./types";
import { fetchProductSelection, normalizeProductSelection } from "./product-selection-query.ts";
import type { ProductSelectionOptions } from "./product-selection-query.ts";
import { useStore } from "./store";

export function useAdminProductLookup(id: string | null | undefined) {
  const { isAdmin } = useStore();
  return useQuery({
    queryKey: ["admin-product-lookup", id],
    enabled: isSupabaseConfigured && isAdmin && Boolean(id),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data ? (mapDbProductToStore(data) as Product) : null;
    },
  });
}

export function useProductSelection(options: ProductSelectionOptions, fallback: Product[]) {
  const { ids, limit } = normalizeProductSelection(options);
  const query = useQuery({
    queryKey: ["product-selection", { ...options, ids, limit }],
    enabled:
      isSupabaseConfigured && options.enabled !== false && (ids === undefined || ids.length > 0),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, count, error } = await fetchProductSelection(supabase, options);
      if (error) throw error;
      return { items: (data ?? []).map(mapDbProductToStore) as Product[], total: count ?? 0 };
    },
  });
  const localItems = fallback
    .filter(
      (product) =>
        product.status === "Published" &&
        (!options.categoryId || product.categoryId === options.categoryId) &&
        (!options.featured || product.featured || product.isBestseller) &&
        (!ids || ids.includes(product.id)) &&
        product.id !== options.excludeId,
    )
    .sort((a, b) => {
      if (options.featured) {
        const score =
          Number(Boolean(b.isBestseller)) * 2 +
          Number(b.featured) -
          Number(Boolean(a.isBestseller)) * 2 -
          Number(a.featured);
        if (score) return score;
      }
      return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
    });
  return {
    ...query,
    items: isSupabaseConfigured ? (query.data?.items ?? []) : localItems.slice(0, limit),
    total: isSupabaseConfigured ? (query.data?.total ?? 0) : localItems.length,
  };
}

export function useInfiniteFeaturedProducts(
  categoryId: string | undefined,
  enabled: boolean,
  fallback: Product[],
) {
  const pageSize = 12;
  const query = useInfiniteQuery({
    queryKey: ["product-selection-infinite", categoryId],
    enabled: isSupabaseConfigured && enabled && Boolean(categoryId),
    initialPageParam: 0,
    staleTime: 30_000,
    queryFn: async ({ pageParam }) => {
      const { data, count, error } = await fetchProductSelection(supabase, {
        categoryId,
        featured: true,
        limit: pageSize,
        offset: pageParam,
      });
      if (error) throw error;
      return {
        items: (data ?? []).map(mapDbProductToStore) as Product[],
        total: count ?? 0,
        offset: pageParam,
      };
    },
    getNextPageParam: (page) => {
      const nextOffset = page.offset + page.items.length;
      return page.items.length > 0 && nextOffset < page.total ? nextOffset : undefined;
    },
  });
  const localItems = fallback
    .filter(
      (product) =>
        product.status === "Published" &&
        product.categoryId === categoryId &&
        (product.featured || product.isBestseller),
    )
    .sort(
      (a, b) =>
        Number(Boolean(b.isBestseller)) * 2 +
          Number(b.featured) -
          (Number(Boolean(a.isBestseller)) * 2 + Number(a.featured)) ||
        b.createdAt.localeCompare(a.createdAt) ||
        b.id.localeCompare(a.id),
    );
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return {
    ...query,
    items: isSupabaseConfigured
      ? [...new Map(items.map((product) => [product.id, product])).values()]
      : localItems,
    total: isSupabaseConfigured ? (query.data?.pages[0]?.total ?? 0) : localItems.length,
  };
}

export function useFeaturedProductCounts(categoryIds: string[]) {
  return useQuery({
    queryKey: ["featured-product-counts", categoryIds],
    enabled: isSupabaseConfigured && categoryIds.length > 0,
    staleTime: 30_000,
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(
          categoryIds.map(async (id) => {
            const { count, error } = await supabase
              .from("products")
              .select("id", { count: "exact", head: true })
              .eq("enabled", true)
              .eq("category_id", id)
              .or("featured.eq.true,is_bestseller.eq.true");
            if (error) throw error;
            return [id, count ?? 0];
          }),
        ),
      ),
  });
}

export function useAdminProductCounts(
  categoryIds: string[],
  collectionIds: string[],
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["admin-product-counts", categoryIds, collectionIds],
    enabled: isSupabaseConfigured && enabled,
    refetchInterval: 30_000,
    queryFn: async () => {
      const count = async (id: string, collection: boolean) => {
        let request = supabase.from("products").select("id", { count: "exact", head: true });
        request = collection
          ? request.contains("collection_ids", [id])
          : request.eq("category_id", id);
        const { count, error } = await request;
        if (error) throw error;
        return [id, count ?? 0] as const;
      };
      const [categories, collections] = await Promise.all([
        Promise.all(categoryIds.map((id) => count(id, false))),
        Promise.all(collectionIds.map((id) => count(id, true))),
      ]);
      return {
        categories: Object.fromEntries(categories),
        collections: Object.fromEntries(collections),
      };
    },
  });
}
