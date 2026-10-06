import { captureException } from "@sentry/tanstackstart-react";
import { ZodError } from "zod";

import { logger } from "./logger.server.ts";
import { limitApiRequests } from "./distributed-rate-limit.server.ts";
import { clientAddress } from "./client-address.ts";

type ApiHandler = (context: {
  request: Request;
  requestId: string;
}) => Promise<Response> | Response;

interface ApiOptions {
  name: string;
  rateLimit?: { max: number; windowMs: number; distributed?: boolean; failClosed?: boolean };
  methods?: string[];
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();
const MAX_RATE_BUCKETS = 10_000;
let nextBucketCleanupAt = 0;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function configuredOrigins(request: Request) {
  const values = [
    new URL(request.url).origin,
    process.env["SITE_URL"],
    process.env["VITE_SITE_URL"],
    ...(process.env["ALLOWED_ORIGINS"] ?? "").split(","),
  ];
  return new Set(values.map((value) => value?.trim().replace(/\/$/, "")).filter(Boolean));
}

function corsOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  return configuredOrigins(request).has(origin.replace(/\/$/, "")) ? origin : undefined;
}

function applyHeaders(response: Response, requestId: string, origin: string | null) {
  const headers = new Headers(response.headers);
  headers.set("X-Request-Id", requestId);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "no-store");
  headers.append("Vary", "Origin");
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key");
    headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    headers.set("Access-Control-Max-Age", "600");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, init);
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The submitted data is too large.");
  }
  if (!request.body) {
    throw new ApiError(400, "INVALID_JSON", "The request body must be valid JSON.");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytesRead = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel();
        throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The submitted data is too large.");
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(chunks.join(""));
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The request body must be valid JSON.");
  }
}

function getRequestId(request: Request) {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && /^[A-Za-z0-9._-]{8,100}$/.test(supplied) ? supplied : crypto.randomUUID();
}

function rateLimit(request: Request, name: string, max: number, windowMs: number) {
  const now = Date.now();
  if (now >= nextBucketCleanupAt) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
    nextBucketCleanupAt = now + 60_000;
  }
  const key = `${name}:${clientAddress(request)}`;
  const existing = buckets.get(key);
  if (!existing && buckets.size >= MAX_RATE_BUCKETS) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil(windowMs / 1_000) };
  }
  const bucket =
    !existing || existing.resetAt <= now ? { count: 0, resetAt: now + windowMs } : existing;
  bucket.count += 1;
  buckets.set(key, bucket);
  return {
    allowed: bucket.count <= max,
    remaining: Math.max(0, max - bucket.count),
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
  };
}

function publicError(error: unknown, requestId: string) {
  if (error instanceof ApiError) {
    return json(
      { error: { code: error.code, message: error.message, requestId } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues[0]?.message ?? "The submitted data is invalid.",
          requestId,
        },
      },
      { status: 400 },
    );
  }
  return json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again.",
        requestId,
      },
    },
    { status: 500 },
  );
}

export function withApi(
  handler: ApiHandler,
  options: ApiOptions,
  distributedLimiter = limitApiRequests,
) {
  return async ({ request }: { request: Request }) => {
    const startedAt = Date.now();
    const requestId = getRequestId(request);
    const origin = corsOrigin(request);
    let response: Response;

    if (origin === undefined) {
      response = json(
        { error: { code: "ORIGIN_NOT_ALLOWED", message: "Origin is not allowed.", requestId } },
        { status: 403 },
      );
    } else if (request.method === "OPTIONS") {
      response = new Response(null, { status: 204 });
    } else if (options.methods && !options.methods.includes(request.method)) {
      response = json(
        { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed.", requestId } },
        { status: 405 },
      );
    } else {
      const limit = options.rateLimit ?? { max: 60, windowMs: 60_000 };
      let rate = rateLimit(request, options.name, limit.max, limit.windowMs);
      let rateUnavailable = false;
      if (rate.allowed && options.rateLimit?.distributed) {
        const sharedRate = await distributedLimiter(
          options.name,
          clientAddress(request),
          limit.max,
          limit.windowMs,
        );
        rateUnavailable = sharedRate === null && Boolean(options.rateLimit.failClosed);
        rate = sharedRate ?? rate;
      }
      if (rateUnavailable) {
        response = json(
          {
            error: { code: "SERVICE_UNAVAILABLE", message: "Please try again shortly.", requestId },
          },
          { status: 503, headers: { "Retry-After": "30" } },
        );
      } else if (!rate.allowed) {
        response = json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many requests. Please wait a moment and try again.",
              requestId,
            },
          },
          { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
        );
      } else {
        try {
          response = await handler({ request, requestId });
          if (!response.headers.has("X-RateLimit-Remaining")) {
            response.headers.set("X-RateLimit-Remaining", String(rate.remaining));
          }
        } catch (error) {
          if (
            !(error instanceof ZodError) &&
            (!(error instanceof ApiError) || error.status >= 500)
          ) {
            captureException(error, {
              tags: { source: "api", route: options.name },
              extra: { requestId, method: request.method },
            });
          }
          logger.error("api.request.failed", { requestId, route: options.name, error });
          response = publicError(error, requestId);
        }
      }
    }

    logger.info("api.request.completed", {
      requestId,
      route: options.name,
      method: request.method,
      status: response.status,
      durationMs: Date.now() - startedAt,
    });
    return applyHeaders(response, requestId, origin ?? null);
  };
}

export function resetRateLimitsForTests() {
  buckets.clear();
  nextBucketCleanupAt = 0;
}
