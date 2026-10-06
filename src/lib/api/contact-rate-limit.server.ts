import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { logger } from "./logger.server.ts";
import { clientAddress } from "./client-address.ts";

export interface ContactRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const CONTACT_RATE_LIMIT = 5;
const CONTACT_RATE_WINDOW_MS = 60 * 60 * 1_000;

let contactLimiter: Ratelimit | null | undefined;

function fallbackResult(): ContactRateLimitResult {
  return {
    success: true,
    limit: CONTACT_RATE_LIMIT,
    remaining: CONTACT_RATE_LIMIT,
    reset: Date.now() + CONTACT_RATE_WINDOW_MS,
  };
}

function getContactLimiter() {
  if (contactLimiter !== undefined) return contactLimiter;

  const url = process.env["UPSTASH_REDIS_REST_URL"]?.trim();
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"]?.trim();
  if (!url || !token) {
    contactLimiter = null;
    return contactLimiter;
  }

  contactLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(CONTACT_RATE_LIMIT, "1 h"),
    prefix: "optique:contact",
  });
  return contactLimiter;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function limitContactRequests(request: Request): Promise<ContactRateLimitResult> {
  const limiter = getContactLimiter();
  if (!limiter) return fallbackResult();

  try {
    const result = await limiter.limit(await sha256(clientAddress(request)));
    if (result.reason === "timeout") {
      logger.warn("contact.rate-limit.timeout");
      return fallbackResult();
    }
    return result;
  } catch (error) {
    // The API wrapper still applies its in-memory fallback limit if Redis is unavailable.
    logger.warn("contact.rate-limit.unavailable", { error });
    return fallbackResult();
  }
}

export function resetContactRateLimiterForTests() {
  contactLimiter = undefined;
}
