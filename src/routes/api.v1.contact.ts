import { createFileRoute } from "@tanstack/react-router";

import { contactHandler } from "@/lib/api/contact.server";
import { withApi } from "@/lib/api/http.server";

const postContact = withApi(({ request }) => contactHandler(request), {
  name: "api.v1.contact.create",
  methods: ["POST"],
  rateLimit: { max: 5, windowMs: 60 * 60 * 1_000, distributed: true, failClosed: true },
});

export const Route = createFileRoute("/api/v1/contact")({
  server: {
    handlers: {
      POST: postContact,
      OPTIONS: postContact,
    },
  },
});
