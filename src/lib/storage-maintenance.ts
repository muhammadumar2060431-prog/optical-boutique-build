import type { SupabaseClient } from "@supabase/supabase-js";

export interface StorageCleanupResult {
  claimed: number;
  removed: number;
  retrying: number;
}

export async function requestStorageMaintenance(
  client: SupabaseClient,
  method: "GET" | "POST" = "POST",
) {
  const { data, error } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Admin sign-in required.");
  const response = await fetch("/api/v1/storage/cleanup", {
    method,
    credentials: "same-origin",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(60000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error?.message ?? "Storage cleanup could not be completed.");
  return result as StorageCleanupResult & { candidates?: number };
}
