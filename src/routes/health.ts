import { createFileRoute } from "@tanstack/react-router";

import { healthHandler } from "@/lib/api/health-handler";

export const Route = createFileRoute("/health")({
  server: { handlers: { GET: healthHandler, OPTIONS: healthHandler } },
});
