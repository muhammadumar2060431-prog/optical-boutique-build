import { createFileRoute } from "@tanstack/react-router";

import { storefrontCacheHandler } from "@/lib/api/storefront-cache.server";
import { withApi } from "@/lib/api/http.server";
import { invalidateStorefrontHandler } from "@/lib/api/storefront-invalidate.server";

const getStorefront = withApi(() => storefrontCacheHandler(), {
  name: "api.v1.storefront",
  methods: ["GET"],
  rateLimit: { max: 120, windowMs: 60_000 },
});

const invalidateStorefront = withApi(({ request }) => invalidateStorefrontHandler(request), {
  name: "api.v1.storefront.invalidate",
  methods: ["POST"],
  rateLimit: { max: 60, windowMs: 60_000 },
});

export const Route = createFileRoute("/api/v1/storefront")({
  server: {
    handlers: {
      GET: getStorefront,
      POST: invalidateStorefront,
      OPTIONS: getStorefront,
    },
  },
});
