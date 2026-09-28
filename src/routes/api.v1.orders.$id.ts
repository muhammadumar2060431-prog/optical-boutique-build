import { createFileRoute } from "@tanstack/react-router";

import { withApi } from "@/lib/api/http.server";
import { orderHandlers } from "@/lib/api/orders.server";

export const Route = createFileRoute("/api/v1/orders/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApi(({ request: innerRequest }) => orderHandlers.read(innerRequest, params.id), {
          name: "api.v1.orders.read",
          methods: ["GET"],
        })({ request }),
      PATCH: ({ request, params }) =>
        withApi(({ request: innerRequest }) => orderHandlers.update(innerRequest, params.id), {
          name: "api.v1.orders.update",
          methods: ["PATCH"],
          rateLimit: { max: 30, windowMs: 60_000 },
        })({ request }),
      DELETE: ({ request, params }) =>
        withApi(({ request: innerRequest }) => orderHandlers.remove(innerRequest, params.id), {
          name: "api.v1.orders.delete",
          methods: ["DELETE"],
          rateLimit: { max: 20, windowMs: 60_000 },
        })({ request }),
      OPTIONS: ({ request, params }) =>
        withApi(({ request: innerRequest }) => orderHandlers.read(innerRequest, params.id), {
          name: "api.v1.orders.options",
        })({ request }),
    },
  },
});
