import { createFileRoute } from "@tanstack/react-router";

import { withApi } from "@/lib/api/http.server";
import { orderHandlers } from "@/lib/api/orders.server";

export const Route = createFileRoute("/api/v1/orders/track/$reference")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApi(() => orderHandlers.track(params.reference), {
          name: "api.v1.orders.track",
          methods: ["GET"],
          rateLimit: { max: 20, windowMs: 60_000, distributed: true, failClosed: true },
        })({ request }),
      OPTIONS: ({ request }) =>
        withApi(() => new Response(null, { status: 204 }), {
          name: "api.v1.orders.track.options",
        })({ request }),
    },
  },
});
