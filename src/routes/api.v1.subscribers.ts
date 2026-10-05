import { createFileRoute } from "@tanstack/react-router";

import { subscriberHandler } from "@/lib/api/engagement.server";
import { withApi } from "@/lib/api/http.server";

const createSubscriber = withApi(({ request }) => subscriberHandler(request), {
  name: "api.v1.subscribers.create",
  methods: ["POST"],
  rateLimit: { max: 3, windowMs: 60 * 60_000 },
});

export const Route = createFileRoute("/api/v1/subscribers")({
  server: {
    handlers: {
      POST: createSubscriber,
      OPTIONS: createSubscriber,
    },
  },
});
