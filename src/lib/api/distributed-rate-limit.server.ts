import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "./logger.server.ts";

export interface ApiRateResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

const limiters = new Map<string, Ratelimit>();

async function databaseLimit(
  name: string,
  address: string,
  max: number,
  windowMs: number,
): Promise<ApiRateResult | null> {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;
  try {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(address));
    const hashed = Array.from(new Uint8Array(bytes), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const response = await fetch(`${url}/rest/v1/rpc/consume_api_rate_limit_v1`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_route: name,
        p_address_hash: hashed,
        p_max: max,
        p_window_ms: windowMs,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const result = await response.json();
    return typeof result?.allowed === "boolean" ? result : null;
  } catch {
    return null;
  }
}

export async function limitApiRequests(
  name: string,
  address: string,
  max: number,
  windowMs: number,
): Promise<ApiRateResult | null> {
  const url = process.env["UPSTASH_REDIS_REST_URL"]?.trim();
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"]?.trim();
  if (!url || !token) return databaseLimit(name, address, max, windowMs);
  const key = `${name}:${max}:${windowMs}`;
  if (!limiters.has(key)) {
    limiters.set(
      key,
      new Ratelimit({
        redis: new Redis({
          url,
          token,
          retry: { retries: 0 },
          signal: () => AbortSignal.timeout(3_000),
        }),
        limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
        prefix: `optique:api:${name}`,
        timeout: 2_000,
      }),
    );
  }
  try {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(address));
    const identifier = Array.from(new Uint8Array(bytes), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    const result = await limiters.get(key)!.limit(identifier);
    if (result.reason === "timeout") {
      logger.warn("api.distributed-rate-limit.timeout", { route: name });
      return databaseLimit(name, address, max, windowMs);
    }
    if (result.success) return databaseLimit(name, address, max, windowMs);
    return {
      allowed: false,
      remaining: result.remaining,
      retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1_000)),
    };
  } catch {
    // PostgreSQL coordinates limits across instances when Redis is unavailable.
    logger.warn("api.distributed-rate-limit.unavailable", { route: name });
    return databaseLimit(name, address, max, windowMs);
  }
}
