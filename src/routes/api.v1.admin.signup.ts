import { createFileRoute } from "@tanstack/react-router";

import { adminSignupHandler } from "@/lib/api/admin-security.server";
import { withApi } from "@/lib/api/http.server";

const signup = withApi(({ request }) => adminSignupHandler(request), {
  name: "api.v1.admin.signup",
  methods: ["POST"],
  rateLimit: { max: 5, windowMs: 15 * 60_000 },
});

export const Route = createFileRoute("/api/v1/admin/signup")({
  server: { handlers: { GET: signup, POST: signup, OPTIONS: signup } },
});
