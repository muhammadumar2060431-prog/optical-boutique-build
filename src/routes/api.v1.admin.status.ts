import { createFileRoute } from "@tanstack/react-router";

import { adminSignupStatusHandler } from "@/lib/api/admin-security.server";
import { withApi } from "@/lib/api/http.server";

const status = withApi(() => adminSignupStatusHandler(), {
  name: "api.v1.admin.status",
  methods: ["GET"],
  rateLimit: { max: 30, windowMs: 60_000 },
});

export const Route = createFileRoute("/api/v1/admin/status")({
  server: { handlers: { GET: status, OPTIONS: status } },
});
