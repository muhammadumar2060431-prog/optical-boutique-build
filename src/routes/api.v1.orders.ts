import { createFileRoute } from "@tanstack/react-router";

import { withApi } from "@/lib/api/http.server";
import { orderHandlers } from "@/lib/api/orders.server";

const listOrders = withApi(({ request }) => orderHandlers.list(request), {
  name: "api.v1.orders.list",
  methods: ["GET"],
  rateLimit: { max: 60, windowMs: 60_000 },
});

const createOrders = withApi(({ request }) => orderHandlers.create(request), {
  name: "api.v1.orders.create",
  methods: ["POST"],
  rateLimit: { max: 8, windowMs: 60_000 },
});

export const Route = createFileRoute("/api/v1/orders")({
  server: {
    handlers: {
      GET: listOrders,
      POST: createOrders,
      OPTIONS: createOrders,
    },
  },
});
