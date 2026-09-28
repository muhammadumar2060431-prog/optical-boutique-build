import { json, withApi } from "./http.server.ts";

const startedAt = Date.now();

export const healthHandler = withApi(
  () =>
    json({
      status: "ok",
      service: "optique-web",
      apiVersion: "v1",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1_000),
    }),
  { name: "health", methods: ["GET"], rateLimit: { max: 120, windowMs: 60_000 } },
);
