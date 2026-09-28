import { createHash } from "node:crypto";

import { logger } from "./api/logger.server.ts";
import type {
  MetaCustomDataInput,
  MetaEventInput,
  MetaUserDataInput,
} from "./meta-events.types.ts";

type MetaHashedKey = "em" | "ph" | "fn" | "ln" | "ct" | "st" | "zp" | "country" | "external_id";

type MetaHashedUserData = Partial<Record<MetaHashedKey, string[]>> & {
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
};

export interface MetaCapiPayload {
  data: Array<{
    event_name: string;
    event_time: number;
    event_id: string;
    action_source: "website";
    event_source_url: string;
    user_data: MetaHashedUserData;
    custom_data?: Record<string, unknown>;
  }>;
  test_event_code?: string;
}

export function hashMetaValue(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase(), "utf8").digest("hex");
}

function parseCookies(request: Request) {
  const values = new Map<string, string>();
  for (const item of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = item.indexOf("=");
    if (separator < 1) continue;
    const key = item.slice(0, separator).trim();
    const rawValue = item.slice(separator + 1).trim();
    try {
      values.set(key, decodeURIComponent(rawValue));
    } catch {
      values.set(key, rawValue);
    }
  }
  return values;
}

function clientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  );
}

function buildUserData(input: MetaUserDataInput | undefined, request: Request): MetaHashedUserData {
  const userData: MetaHashedUserData = {};
  const hashedFields: Array<[keyof MetaUserDataInput, MetaHashedKey]> = [
    ["email", "em"],
    ["phone", "ph"],
    ["firstName", "fn"],
    ["lastName", "ln"],
    ["city", "ct"],
    ["state", "st"],
    ["zip", "zp"],
    ["country", "country"],
    ["externalId", "external_id"],
  ];

  for (const [inputKey, outputKey] of hashedFields) {
    const value = input?.[inputKey]?.trim();
    if (value) userData[outputKey] = [hashMetaValue(value)];
  }

  const ip = clientIp(request);
  if (ip && ip !== "unknown") userData.client_ip_address = ip;
  const userAgent = request.headers.get("user-agent")?.trim();
  if (userAgent) userData.client_user_agent = userAgent;

  const cookies = parseCookies(request);
  const fbp = cookies.get("_fbp")?.trim();
  const fbc = cookies.get("_fbc")?.trim();
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  return userData;
}

function buildCustomData(input: MetaCustomDataInput | undefined) {
  if (!input) return undefined;
  const customData: Record<string, unknown> = {};
  if (input.value !== undefined) customData["value"] = input.value;
  if (input.currency) customData["currency"] = input.currency.trim().toUpperCase();
  if (input.contentIds?.length) customData["content_ids"] = input.contentIds;
  if (input.contentType) customData["content_type"] = input.contentType;
  if (input.contentName) customData["content_name"] = input.contentName;
  if (input.numItems !== undefined) customData["num_items"] = input.numItems;
  return Object.keys(customData).length ? customData : undefined;
}

export function buildMetaCapiPayload(
  input: MetaEventInput,
  request: Request,
  options: { eventTime?: number | undefined; testEventCode?: string | undefined } = {},
): MetaCapiPayload {
  const customData = buildCustomData(input.customData);
  const event = {
    event_name: input.eventName,
    event_time: options.eventTime ?? Math.floor(Date.now() / 1_000),
    event_id: input.eventId,
    action_source: "website" as const,
    event_source_url: input.eventSourceUrl,
    user_data: buildUserData(input.userData, request),
    ...(customData ? { custom_data: customData } : {}),
  };
  const testEventCode = options.testEventCode?.trim();
  return {
    data: [event],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };
}

export async function sendMetaEvent(input: MetaEventInput, request: Request) {
  const accessToken = process.env["META_ACCESS_TOKEN"]?.trim();
  const pixelId = process.env["META_PIXEL_ID"]?.trim();
  const graphVersion = process.env["META_GRAPH_API_VERSION"]?.trim();

  if (!accessToken || !pixelId || !graphVersion) {
    logger.error("meta.capi.configuration.missing", {
      eventName: input.eventName,
      eventId: input.eventId,
      missing: [
        !accessToken ? "META_ACCESS_TOKEN" : null,
        !pixelId ? "META_PIXEL_ID" : null,
        !graphVersion ? "META_GRAPH_API_VERSION" : null,
      ].filter(Boolean),
    });
    return { ok: false, status: 0 };
  }

  if (!/^v\d+\.\d+$/.test(graphVersion) || !/^\d+$/.test(pixelId)) {
    logger.error("meta.capi.configuration.invalid", {
      eventName: input.eventName,
      eventId: input.eventId,
    });
    return { ok: false, status: 0 };
  }

  const endpoint = new URL(`https://graph.facebook.com/${graphVersion}/${pixelId}/events`);
  endpoint.searchParams.set("access_token", accessToken);
  const payload = buildMetaCapiPayload(input, request, {
    testEventCode: process.env["TEST_EVENT_CODE"],
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });
    const body = (await response.json().catch(() => null)) as {
      events_received?: number;
      fbtrace_id?: string;
      error?: { message?: string; type?: string; code?: number; fbtrace_id?: string };
    } | null;

    if (!response.ok || body?.error) {
      logger.error("meta.capi.request.failed", {
        eventName: input.eventName,
        eventId: input.eventId,
        status: response.status,
        errorCode: body?.error?.code,
        errorType: body?.error?.type,
        errorMessage: body?.error?.message,
        traceId: body?.error?.fbtrace_id ?? body?.fbtrace_id,
      });
      return { ok: false, status: response.status };
    }

    logger.info("meta.capi.request.completed", {
      eventName: input.eventName,
      eventId: input.eventId,
      status: response.status,
      eventsReceived: body?.events_received,
      traceId: body?.fbtrace_id,
    });
    return { ok: true, status: response.status };
  } catch (error) {
    logger.error("meta.capi.request.failed", {
      eventName: input.eventName,
      eventId: input.eventId,
      status: 0,
      errorType: error instanceof Error ? error.name : "UnknownError",
      errorMessage: "Meta Graph API request failed before a response was received.",
    });
    return { ok: false, status: 0 };
  }
}
