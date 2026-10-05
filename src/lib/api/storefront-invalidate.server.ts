import { createClient } from "@supabase/supabase-js";
import { ApiError, json } from "./http.server.ts";
import { incrementCacheRevision } from "./redis-json-cache.server.ts";
import { STOREFRONT_REVISION_KEY } from "./storefront-cache.server.ts";

export async function invalidateStorefrontHandler(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    throw new ApiError(401, "UNAUTHORIZED", "Admin sign-in required.");
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_ANON_KEY"] ?? process.env["VITE_SUPABASE_ANON_KEY"];
  if (!url || !key) throw new ApiError(503, "UNAVAILABLE", "Authentication is unavailable.");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const user = await client.auth.getUser(authorization.slice(7));
  if (user.error || !user.data.user)
    throw new ApiError(401, "UNAUTHORIZED", "Admin sign-in required.");
  const admin = await client.rpc("is_admin");
  if (admin.error || admin.data !== true)
    throw new ApiError(403, "FORBIDDEN", "Administrator permission required.");
  if (!(await incrementCacheRevision(STOREFRONT_REVISION_KEY)))
    throw new ApiError(503, "CACHE_UNAVAILABLE", "Data is saved but public cache refresh failed.");
  return json({ ok: true });
}
