import { createFileRoute } from "@tanstack/react-router";

import { adminRecoverHandler } from "@/lib/api/admin-security.server";
import { withApi } from "@/lib/api/http.server";

const recover = withApi(({ request }) => adminRecoverHandler(request), {
  name: "api.v1.admin.recover",
  methods: ["POST"],
  rateLimit: { max: 5, windowMs: 15 * 60_000 },
});

export const Route = createFileRoute("/api/v1/admin/recover")({
  server: { handlers: { GET: recover, POST: recover, OPTIONS: recover } },
});
