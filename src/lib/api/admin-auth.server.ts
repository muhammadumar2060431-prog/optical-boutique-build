import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { ApiError, json, readJsonBody } from "./http.server.ts";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1_024),
});

function config() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const anonKey = process.env["SUPABASE_ANON_KEY"] ?? process.env["VITE_SUPABASE_ANON_KEY"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !anonKey || !serviceKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Authentication is temporarily unavailable.");
  }
  return { url, anonKey, serviceKey };
}

function clientAddress(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function retryResponse(retryAfter: number) {
  return json(
    {
      error: {
        code: "LOGIN_LOCKED",
        message: "Too many failed attempts. Please wait before trying again.",
        retryAfter,
      },
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export async function adminLoginHandler(request: Request) {
  const credentials = credentialsSchema.parse(await readJsonBody(request, 8_192));
  const { url, anonKey, serviceKey } = config();
  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const buckets = await Promise.all([
    digest(`email:${credentials.email.toLowerCase()}`),
    digest(`ip:${clientAddress(request)}`),
  ]);

  const lockChecks = await Promise.all(
    buckets.map((bucket) => service.rpc("check_admin_login_v1", { p_bucket_key: bucket })),
  );
  if (lockChecks.some(({ error }) => error)) throw new Error("Login throttle check failed");
  const activeLock = Math.max(...lockChecks.map(({ data }) => Number(data ?? 0)));
  if (activeLock > 0) return retryResponse(activeLock);

  const auth = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await auth.auth.signInWithPassword(credentials);

  let authorized = false;
  if (!error && data.session) {
    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
    const adminCheck = await userClient.rpc("is_admin");
    if (adminCheck.error) throw new Error("Admin authorization check failed");
    authorized = adminCheck.data === true;
  }

  if (!data.session || !authorized) {
    const attempts = await Promise.all(
      buckets.map((bucket) =>
        service.rpc("record_admin_login_v1", { p_bucket_key: bucket, p_success: false }),
      ),
    );
    if (attempts.some(({ error: attemptError }) => attemptError)) {
      throw new Error("Login throttle update failed");
    }
    if (data.session) await auth.auth.signOut();
    const retryAfter = Math.max(...attempts.map(({ data: seconds }) => Number(seconds ?? 0)));
    if (retryAfter > 0) return retryResponse(retryAfter);
    throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
  }

  const clears = await Promise.all(
    buckets.map((bucket) =>
      service.rpc("record_admin_login_v1", { p_bucket_key: bucket, p_success: true }),
    ),
  );
  if (clears.some(({ error: clearError }) => clearError)) {
    throw new Error("Login throttle reset failed");
  }

  return json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
}
