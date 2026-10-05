import { createContactQuerySchema, type CreateContactQueryInput } from "./contracts.ts";
import { json, readJsonBody } from "./http.server.ts";
import { limitContactRequests, type ContactRateLimitResult } from "./contact-rate-limit.server.ts";

export interface ContactRepository {
  create(input: CreateContactQueryInput): Promise<{ id: string }>;
}

type ContactLimiter = (request: Request) => Promise<ContactRateLimitResult>;

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

    const input = createContactQuerySchema.parse(await readJsonBody(request, 20_000));
    const query = await repository.create(input);
    return json({ data: query }, { status: 201, headers: rateHeaders(rate) });
  };
}
