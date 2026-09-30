import { captureException } from "@sentry/tanstackstart-react";
import { ZodError } from "zod";

import { logger } from "./logger.server.ts";

type ApiHandler = (context: {
  request: Request;
  requestId: string;
}) => Promise<Response> | Response;

interface ApiOptions {
  name: string;
  rateLimit?: { max: number; windowMs: number };
  methods?: string[];
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

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

function clientAddress(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
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

function getRequestId(request: Request) {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && /^[A-Za-z0-9._-]{8,100}$/.test(supplied) ? supplied : crypto.randomUUID();
}

function rateLimit(request: Request, name: string, max: number, windowMs: number) {
  const now = Date.now();
  const key = `${name}:${clientAddress(request)}`;
  const existing = buckets.get(key);
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

export function withApi(handler: ApiHandler, options: ApiOptions) {
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
      const rate = rateLimit(request, options.name, limit.max, limit.windowMs);
      if (!rate.allowed) {
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
          response.headers.set("X-RateLimit-Remaining", String(rate.remaining));
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
}
