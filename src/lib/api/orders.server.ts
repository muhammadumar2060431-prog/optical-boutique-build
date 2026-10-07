import { createClient } from "@supabase/supabase-js";

import { sendMetaEvent } from "../meta-capi.server.ts";

import type { UpdateOrderInput } from "./contracts.ts";
import { ApiError } from "./http.server.ts";
import { createOrderHandlers, type OrdersRepository } from "./order-handlers.ts";

function publicConfig() {
  const url =
    process.env["SUPABASE_URL"] ??
    process.env["VITE_SUPABASE_URL"] ??
    import.meta.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    process.env["VITE_SUPABASE_ANON_KEY"] ??
    import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Order service is temporarily unavailable.");
  }
  return { url, anonKey };
}

function anonymousClient() {
  const { url, anonKey } = publicConfig();
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function serviceClient() {
  const { url } = publicConfig();
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!serviceKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Order service is temporarily unavailable.");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authenticatedClient(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");

  const { url, anonKey } = publicConfig();
  const verifier = anonymousClient();
  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: isAdmin, error: adminError } = await client.rpc("is_admin");
  if (adminError || isAdmin !== true) {
    throw new ApiError(403, "FORBIDDEN", "Administrator access is required.");
  }
  return client;
}

type TrackOrderRow = Record<string, unknown> & {
  id?: string;
  product_id?: string | null;
  productId?: string | null;
  variant_id?: string | null;
  variantId?: string | null;
  product_name?: string | null;
  productName?: string | null;
  items?: Array<Record<string, unknown>>;
};

type ProductLookupRow = {
  id: string;
  name?: string | null;
  slug?: string | null;
  sku?: string | null;
  price?: number | string | null;
  images?: string[] | null;
  image?: string | null;
  description?: string | null;
  details?: Record<string, unknown> | string | null;
  variants?: Array<Record<string, unknown>> | null;
};

function firstItem(row: TrackOrderRow) {
  return Array.isArray(row.items) ? row.items[0] : null;
}

function rowProductId(row: TrackOrderRow) {
  const item = firstItem(row);
  const value = row.product_id ?? row.productId ?? item?.["productId"] ?? item?.["product_id"];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function rowVariantId(row: TrackOrderRow) {
  const item = firstItem(row);
  const value = row.variant_id ?? row.variantId ?? item?.["variantId"] ?? item?.["variant_id"];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseDetails(details: ProductLookupRow["details"]) {
  if (typeof details === "string") {
    try {
      return JSON.parse(details) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return details && typeof details === "object" ? details : {};
}

function enrichTrackRow(row: TrackOrderRow, product: ProductLookupRow | undefined) {
  if (!product) return row;

  const variantId = rowVariantId(row);
  const variant = Array.isArray(product.variants)
    ? product.variants.find((item) => item["id"] === variantId)
    : undefined;
  const variantImage = typeof variant?.["image"] === "string" ? variant["image"] : null;
  const images = Array.isArray(product.images) ? product.images : [];
  const details = parseDetails(product.details);
  const productImage = variantImage || images[0] || null;
  const productDescription =
    product.description ||
    (typeof details["lensInfo"] === "string" ? details["lensInfo"] : null) ||
    (typeof details["material"] === "string" ? details["material"] : null);

  return {
    ...row,
    product_id: rowProductId(row),
    product_name: product.name || row.product_name || row.productName,
    productImage,
    productSlug: product.slug || null,
    productPrice: Number(product.price) || null,
    productSku: product.sku || null,
    productDescription,
  };
}

async function enrichTrackedOrders(rows: unknown[]) {
  const normalizedRows = rows as TrackOrderRow[];
  const ids = normalizedRows
    .map((row) => (typeof row.id === "string" ? row.id : null))
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return normalizedRows;

  const client = serviceClient();
  const { data: orderRows, error: ordersError } = await client
    .from("orders")
    .select("id, product_id, variant_id, product_name, items")
    .in("id", ids);
  if (ordersError) return normalizedRows;

  const orderById = new Map(
    ((orderRows ?? []) as TrackOrderRow[]).map((row) => [row.id, row] as const),
  );
  const mergedRows = normalizedRows.map((row) => ({ ...row, ...(orderById.get(row.id) ?? {}) }));
  const productIds = Array.from(new Set(mergedRows.map(rowProductId).filter(Boolean)));
  if (productIds.length === 0) return mergedRows;

  const { data: products, error: productsError } = await client
    .from("products")
    .select("id, name, slug, sku, price, images, description, details, variants")
    .in("id", productIds);
  if (productsError) return mergedRows;

  const productById = new Map(
    ((products ?? []) as ProductLookupRow[]).map((product) => [product.id, product] as const),
  );
  return mergedRows.map((row) => enrichTrackRow(row, productById.get(rowProductId(row) ?? "")));
}

function databaseError(error: { message?: string } | null) {
  const message = error?.message ?? "";
  if (message.includes("RATE_LIMITED")) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please wait and try again.");
  }
  if (message.includes("IDEMPOTENCY_CONFLICT")) {
    throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "This request key was already used.");
  }
  if (message.includes("IDEMPOTENCY_IN_PROGRESS")) {
    throw new ApiError(409, "IDEMPOTENCY_IN_PROGRESS", "This request is still being processed.");
  }
  if (message.includes("INVALID_ORDER")) {
    throw new ApiError(400, "VALIDATION_ERROR", "The submitted order is invalid.");
  }
  if (
    /INSUFFICIENT_STOCK|PRODUCT_UNAVAILABLE|VARIANT_UNAVAILABLE|VARIANT_REQUIRED|LEGACY_QUANTITY_REQUIRED/.test(
      message,
    )
  ) {
    throw new ApiError(
      409,
      "INVENTORY_CONFLICT",
      "Stock or order quantity needs review. Refresh and try again.",
    );
  }
  throw new Error("Database operation failed");
}

const repository: OrdersRepository = {
  async create(input, idempotencyKey, requestHash, rateKey) {
    const { data, error } = await serviceClient().rpc("create_checkout_order_v2", {
      p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash,
      p_orders: (input as { orders: unknown[] }).orders,
      p_rate_key: rateKey,
    });
    if (error) databaseError(error);
    return data;
  },

  async list(request, limit, offset) {
    const client = await authenticatedClient(request);
    const { data, error } = await client
      .from("orders")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) databaseError(error);
    return data ?? [];
  },

  async read(request, id) {
    const client = await authenticatedClient(request);
    const { data, error } = await client
      .from("orders")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) databaseError(error);
    return data;
  },

  async update(request, id, input) {
    const client = await authenticatedClient(request);
    const update = input as UpdateOrderInput;
    const { data, error } = await client.rpc("update_order_inventory_v1", {
      p_order_id: id,
      p_patch: update,
    });
    if (error) databaseError(error);
    return data ? { ...data.order, inventoryProduct: data.product } : null;
  },

  async remove(request, id) {
    const client = await authenticatedClient(request);
    const { data, error } = await client
      .from("orders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");
    if (error) databaseError(error);
    return Boolean(data?.length);
  },

  async track(reference) {
    const { data, error } = await serviceClient().rpc("lookup_order_by_reference", {
      p_reference: reference,
    });
    if (error) databaseError(error);
    return enrichTrackedOrders(data ?? []);
  },
};

export const orderHandlers = createOrderHandlers(repository, {
  onCreated: (request, event) => sendMetaEvent(event, request),
});
