import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { processStorageCleanup, storageObjectExists } from "../storage-cleanup.ts";
import { requireAdminClient } from "./storefront-invalidate.server.ts";
import { ApiError, json } from "./http.server.ts";

const BUCKET = "optique-images";

export function storageCleanupClient() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new ApiError(503, "UNAVAILABLE", "Storage cleanup is unavailable.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function runStorageCleanup(client: SupabaseClient = storageCleanupClient()) {
  return processStorageCleanup({
    claim: async () => {
      const { data, error } = await client.rpc("claim_storage_cleanup_v1", { p_limit: 100 });
      if (error)
        throw new ApiError(
          503,
          "CLEANUP_UNAVAILABLE",
          "Storage cleanup could not start. Check its database setup and retry.",
        );
      return (data as Array<{ path: string }>).map((row) => row.path);
    },
    remove: async (paths) => {
      const { error } = await client.storage.from(BUCKET).remove(paths);
      if (error) throw error;
    },
    exists: (path) =>
      storageObjectExists(path, (folder, options) =>
        client.storage.from(BUCKET).list(folder, options),
      ),
    finish: async (paths, errorMessage) => {
      const { error } = await client.rpc("finish_storage_cleanup_v1", {
        p_paths: paths,
        p_error: errorMessage,
      });
      if (error) throw error;
    },
  });
}

export async function storageCleanupHandler(request: Request) {
  await requireAdminClient(request);
  const client = storageCleanupClient();
  if (request.method === "GET") {
    const { count, error } = await client.rpc(
      "storage_cleanup_candidates_v1",
      {},
      { count: "exact", head: true },
    );
    if (error)
      throw new ApiError(
        503,
        "CLEANUP_UNAVAILABLE",
        "Storage cleanup is unavailable. Please retry.",
      );
    return json({ candidates: count ?? 0 });
  }
  return json(await runStorageCleanup(client));
}
