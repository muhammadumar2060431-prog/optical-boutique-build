import { createFileRoute } from "@tanstack/react-router";
import { storageCleanupHandler } from "@/lib/api/storage-cleanup.server";
import { withApi } from "@/lib/api/http.server";

const cleanup = withApi(({ request }) => storageCleanupHandler(request), {
  name: "api.v1.storage.cleanup",
  methods: ["GET", "POST"],
  rateLimit: { max: 30, windowMs: 60000 },
});

export const Route = createFileRoute("/api/v1/storage/cleanup")({
  server: { handlers: { GET: cleanup, POST: cleanup, OPTIONS: cleanup } },
});
