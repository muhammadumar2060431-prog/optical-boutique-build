import type { SupabaseClient } from "@supabase/supabase-js";

export async function invalidatePublicStorefront(client: SupabaseClient): Promise<boolean> {
  try {
    const session = await client.auth.getSession();
    const token = session.data.session?.access_token;
    if (session.error || !token) return false;
    const response = await fetch("/api/v1/storefront", {
      method: "POST",
      credentials: "same-origin",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
