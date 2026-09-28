import "./lib/error-capture";

import * as Sentry from "@sentry/tanstackstart-react";
import { logger } from "./lib/api/logger.server";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { applySecurityHeaders } from "./lib/security-headers";

const sentryDsn = process.env["SENTRY_DSN"];
const configuredSampleRate = Number(process.env["SENTRY_TRACES_SAMPLE_RATE"] ?? "0.1");
const tracesSampleRate =
  Number.isFinite(configuredSampleRate) && configuredSampleRate >= 0 && configuredSampleRate <= 1
    ? configuredSampleRate
    : 0.1;

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
  environment: process.env["SENTRY_ENVIRONMENT"] ?? process.env["NODE_ENV"],
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
  },
  tracesSampleRate,
});
type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const error = consumeLastCapturedError() ?? new Error("h3 swallowed an SSR error");
  Sentry.captureException(error, { tags: { source: "ssr-response" } });
  logger.error("ssr.response.failed", { error });
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

const serverEntry: ServerEntry = {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return applySecurityHeaders(await normalizeCatastrophicSsrResponse(response), request);
    } catch (error) {
      Sentry.captureException(error, { tags: { source: "ssr-request" } });
      logger.error("ssr.request.failed", { error });
      return applySecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        request,
      );
    }
  },
};

export default Sentry.wrapFetchWithSentry(
  serverEntry as Parameters<typeof Sentry.wrapFetchWithSentry>[0],
) as ServerEntry;
