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
  throw new Error("Database operation failed");
}

const repository: OrdersRepository = {
  async create(input, idempotencyKey, requestHash, rateKey) {
    const { data, error } = await serviceClient().rpc("create_checkout_order_v1", {
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
    const payload = {
      ...(update.status !== undefined ? { status: update.status } : {}),
      ...(update.courierName !== undefined ? { courier_name: update.courierName } : {}),
      ...(update.trackingNumber !== undefined ? { tracking_number: update.trackingNumber } : {}),
      ...(update.stockDeducted !== undefined ? { stock_deducted: update.stockDeducted } : {}),
      ...(update.status === "Dispatched" ? { dispatched_at: new Date().toISOString() } : {}),
    };
    const { data, error } = await client
      .from("orders")
      .update(payload)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .maybeSingle();
    if (error) databaseError(error);
    return data;
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
    const { data, error } = await anonymousClient().rpc("lookup_order_by_reference", {
      p_reference: reference,
    });
    if (error) databaseError(error);
    return data ?? [];
  },
};

export const orderHandlers = createOrderHandlers(repository, {
  onCreated: (request, event) => sendMetaEvent(event, request),
});
