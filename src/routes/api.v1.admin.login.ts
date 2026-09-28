import { createFileRoute } from "@tanstack/react-router";

import { adminLoginHandler } from "@/lib/api/admin-auth.server";
import { withApi } from "@/lib/api/http.server";

const login = withApi(({ request }) => adminLoginHandler(request), {
  name: "api.v1.admin.login",
  methods: ["POST"],
  rateLimit: { max: 10, windowMs: 60_000 },
});

export const Route = createFileRoute("/api/v1/admin/login")({
  server: {
    handlers: {
      POST: login,
      OPTIONS: login,
    },
  },
});
