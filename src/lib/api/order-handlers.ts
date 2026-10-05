import { createOrdersSchema, updateOrderSchema } from "./contracts.ts";
import { ApiError, json, readJsonBody } from "./http.server.ts";
import { logger } from "./logger.server.ts";
import type { MetaEventInput } from "../meta-events.types.ts";

export interface OrdersRepository {
  create(
    input: unknown,
    idempotencyKey: string,
    requestHash: string,
    rateKey: string,
  ): Promise<unknown>;
  list(request: Request, limit: number, offset: number): Promise<unknown>;
  read(request: Request, id: string): Promise<unknown | null>;
  update(request: Request, id: string, input: unknown): Promise<unknown | null>;
  remove(request: Request, id: string): Promise<boolean>;
  track(reference: string): Promise<unknown[]>;
}

function validIdentifier(value: string) {
  if (!/^[A-Za-z0-9._:-]{1,100}$/.test(value)) {
    throw new ApiError(400, "INVALID_IDENTIFIER", "The requested identifier is invalid.");
  }
  return value;
}

async function sha256(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requestRateKey(request: Request) {
  const address =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return `orders:${await sha256(address)}`;
}

export function createOrderHandlers(
  repository: OrdersRepository,
  options: { onCreated?: (request: Request, event: MetaEventInput) => Promise<unknown> } = {},
) {
  return {
    create: async (request: Request) => {
      const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
      if (!/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey)) {
        throw new ApiError(
          400,
          "IDEMPOTENCY_KEY_REQUIRED",
          "A valid Idempotency-Key header is required.",
        );
      }
      const input = createOrdersSchema.parse(await readJsonBody(request, 100_000));
      const result = await repository.create(
        input,
        idempotencyKey,
        await sha256(input),
        await requestRateKey(request),
      );
      const replayed =
        typeof result === "object" &&
        result !== null &&
        (result as Record<string, unknown>)["replayed"] === true;
      if (input.metaEvent && !replayed && options.onCreated) {
        try {
          await options.onCreated(request, input.metaEvent);
        } catch {
          logger.error("meta.capi.order-hook.failed", {
            eventName: input.metaEvent.eventName,
            eventId: input.metaEvent.eventId,
          });
        }
      }
      return json(result, { status: 201 });
    },

    list: async (request: Request) => {
      const url = new URL(request.url);
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50));
      const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
      return json({ data: await repository.list(request, limit, offset) });
    },

    read: async (request: Request, id: string) => {
      const order = await repository.read(request, validIdentifier(id));
      if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
      return json({ data: order });
    },

    update: async (request: Request, id: string) => {
      const input = updateOrderSchema.parse(await readJsonBody(request, 100_000));
      const order = await repository.update(request, validIdentifier(id), input);
      if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
      return json({ data: order });
    },

    remove: async (request: Request, id: string) => {
      if (!(await repository.remove(request, validIdentifier(id)))) {
        throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
      }
      return new Response(null, { status: 204 });
    },

    track: async (reference: string) => {
      const normalized = reference.trim().toUpperCase();
      if (!/^OPT-[A-Z0-9]{5,28}$/.test(normalized)) {
        throw new ApiError(400, "INVALID_REFERENCE", "Enter a valid order reference.");
      }
      return json({ data: await repository.track(normalized) });
    },
  };
}
