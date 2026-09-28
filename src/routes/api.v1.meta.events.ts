import { createFileRoute } from "@tanstack/react-router";

import { metaEventHandler } from "@/lib/api/meta-event-handler.server";
import { withApi } from "@/lib/api/http.server";

const postMetaEvent = withApi(({ request }) => metaEventHandler(request), {
  name: "api.v1.meta.events.create",
  methods: ["POST"],
  rateLimit: { max: 120, windowMs: 60_000 },
});

export const Route = createFileRoute("/api/v1/meta/events")({
  server: {
    handlers: {
      GET: postMetaEvent,
      POST: postMetaEvent,
      OPTIONS: postMetaEvent,
    },
  },
});
