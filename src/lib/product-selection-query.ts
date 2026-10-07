import type { SupabaseClient } from "@supabase/supabase-js";

export function isProductDataQuery(key: readonly unknown[]) {
  const root = key[0];
  return (
    root === "catalog-page" ||
    root === "product-selection" ||
    root === "product-selection-infinite" ||
    root === "featured-product-counts" ||
    root === "admin-product-counts" ||
    root === "admin-product-picker" ||
    root === "admin-product-lookup" ||
    (root === "admin-records" && (key[1] === "products" || key[1] === "inventory"))
  );
}

export interface ProductSelectionOptions {
  categoryId?: string | undefined;
  featured?: boolean;
  ids?: string[];
  excludeId?: string | undefined;
  enabled?: boolean;
  limit: number;
  offset?: number;
}

export function normalizeProductSelection(options: ProductSelectionOptions) {
  return {
    ...options,
    ids: options.ids ? [...new Set(options.ids)].sort().slice(0, 24) : undefined,
    limit: Number.isFinite(options.limit)
      ? Math.max(1, Math.min(24, Math.floor(options.limit)))
      : 8,
  };
}

export function fetchProductSelection(client: SupabaseClient, options: ProductSelectionOptions) {
  const { ids, limit } = normalizeProductSelection(options);
  let request = client
    .from("products")
    .select("*", options.featured ? { count: "exact" } : {})
    .eq("enabled", true);
  if (options.categoryId) request = request.eq("category_id", options.categoryId);
  if (options.featured) request = request.or("featured.eq.true,is_bestseller.eq.true");
  if (ids) request = request.in("id", ids);
  if (options.excludeId) request = request.neq("id", options.excludeId);
  if (options.featured) {
    request = request
      .order("is_bestseller", { ascending: false, nullsFirst: false })
      .order("featured", { ascending: false, nullsFirst: false });
  }
  request = request
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });
  if (options.offset !== undefined) {
    const offset = Number.isFinite(options.offset) ? Math.max(0, Math.floor(options.offset)) : 0;
    return request.range(offset, offset + limit - 1);
  }
  return request.limit(limit);
}

export function fetchInitialProducts(client: SupabaseClient) {
  return client
    .from("products")
    .select("*")
    .eq("enabled", true)
    .eq("is_new_arrival", true)
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(12);
}
