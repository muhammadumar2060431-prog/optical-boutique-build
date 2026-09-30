import { createFileRoute } from "@tanstack/react-router";

import { adminCredentialsHandler } from "@/lib/api/admin-security.server";
import { withApi } from "@/lib/api/http.server";

const credentials = withApi(({ request }) => adminCredentialsHandler(request), {
  name: "api.v1.admin.credentials",
  methods: ["POST"],
  rateLimit: { max: 5, windowMs: 15 * 60_000 },
});

export const Route = createFileRoute("/api/v1/admin/credentials")({
  server: { handlers: { GET: credentials, POST: credentials, OPTIONS: credentials } },
});
