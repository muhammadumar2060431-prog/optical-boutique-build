import { createContactQuerySchema, type CreateContactQueryInput } from "./contracts.ts";
import { ApiError, json } from "./http.server.ts";
import { limitContactRequests, type ContactRateLimitResult } from "./contact-rate-limit.server.ts";

export interface ContactRepository {
  create(input: CreateContactQueryInput): Promise<{ id: string }>;
}

type ContactLimiter = (request: Request) => Promise<ContactRateLimitResult>;

async function readJson(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 20_000) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The request is too large.");
  }
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The request body must be valid JSON.");
  }
}

function rateHeaders(rate: ContactRateLimitResult) {
  return {
    "X-RateLimit-Limit": String(rate.limit),
    "X-RateLimit-Remaining": String(Math.max(0, rate.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(rate.reset / 1_000)),
  };
}

export function createContactHandler(
  repository: ContactRepository,
  limiter: ContactLimiter = limitContactRequests,
) {
  return async (request: Request) => {
    const rate = await limiter(request);
    if (!rate.success) {
      const retryAfter = Math.max(1, Math.ceil((rate.reset - Date.now()) / 1_000));
      return json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many enquiries. Please wait a while and try again.",
          },
        },
        {
          status: 429,
          headers: { ...rateHeaders(rate), "Retry-After": String(retryAfter) },
        },
      );
    }

    const input = createContactQuerySchema.parse(await readJson(request));
    const query = await repository.create(input);
    return json({ data: query }, { status: 201, headers: rateHeaders(rate) });
  };
}
