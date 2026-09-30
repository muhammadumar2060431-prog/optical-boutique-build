import { Buffer } from "node:buffer";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { z } from "zod";

import { ApiError, json } from "./http.server.ts";

const answersSchema = z.object({
  school: z.string().trim().min(2).max(100),
  friend: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
});

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.");

const signupSchema = z.object({
  email: z.string().trim().email().max(254),
  password: passwordSchema,
  setupCode: z.string().min(1).max(256),
  answers: answersSchema,
});

const recoveryVerifySchema = z.object({
  action: z.literal("verify"),
  email: z.string().trim().email().max(254),
  answers: answersSchema,
});

const recoveryResetSchema = z.object({
  action: z.literal("reset"),
  recoveryToken: z.string().min(1).max(2_048),
  newPassword: passwordSchema,
});

const recoverySchema = z.discriminatedUnion("action", [recoveryVerifySchema, recoveryResetSchema]);

const recoveryTokenClaimsSchema = z.object({
  purpose: z.literal("admin-password-recovery"),
  userId: z.string().uuid(),
  nonce: z.string().length(64),
  addressHash: z.string().length(64),
  expiresAt: z.number().int().positive(),
});

const credentialsSchema = z
  .object({
    email: z.string().trim().email().max(254).optional(),
    newPassword: passwordSchema.optional(),
    answers: answersSchema,
  })
  .refine((value) => value.email || value.newPassword, {
    message: "Enter a new email or password.",
  });

type Answers = z.infer<typeof answersSchema>;

interface SecurityProfile {
  user_id: string;
  school_answer_hash: string;
  school_answer_salt: string;
  friend_answer_hash: string;
  friend_answer_salt: string;
  city_answer_hash: string;
  city_answer_salt: string;
}

type RecoveryTokenClaims = z.infer<typeof recoveryTokenClaimsSchema>;

const RECOVERY_TOKEN_TTL_MS = 5 * 60_000;
const RECOVERY_NONCE_HASH_KEY = "admin_recovery_nonce_hash";
const RECOVERY_EXPIRES_KEY = "admin_recovery_expires_at";

function config() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const setupSecret = process.env["ADMIN_SETUP_SECRET"];
  const pepper = process.env["ADMIN_SECURITY_PEPPER"];
  const allowedEmail = process.env["ADMIN_BOOTSTRAP_EMAIL"] ?? process.env["VITE_ADMIN_EMAIL"];
  if (!url || !serviceKey || !setupSecret || !pepper) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Admin security is not configured.");
  }
  return { url, serviceKey, setupSecret, pepper, allowedEmail: allowedEmail?.trim().toLowerCase() };
}

function serviceClient(url: string, serviceKey: string) {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function rejectOversizedPayload(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 16_384) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The submitted data is too large.");
  }
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
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function throttleBuckets(request: Request, scope: string, identity: string) {
  return Promise.all([
    digest(`${scope}:identity:${identity.toLowerCase()}`),
    digest(`${scope}:ip:${clientAddress(request)}`),
  ]);
}

async function ensureNotLocked(service: SupabaseClient, buckets: string[]) {
  const checks = await Promise.all(
    buckets.map((bucket) => service.rpc("check_admin_login_v1", { p_bucket_key: bucket })),
  );
  if (checks.some(({ error }) => error)) throw new Error("Security throttle check failed");
  const retryAfter = Math.max(...checks.map(({ data }) => Number(data ?? 0)));
  if (retryAfter > 0) {
    throw new ApiError(429, "SECURITY_LOCKED", "Too many attempts. Please wait 15 minutes.");
  }
}

async function recordSecurityAttempt(service: SupabaseClient, buckets: string[], success: boolean) {
  const attempts = await Promise.all(
    buckets.map((bucket) =>
      service.rpc("record_admin_login_v1", { p_bucket_key: bucket, p_success: success }),
    ),
  );
  if (attempts.some(({ error }) => error)) throw new Error("Security throttle update failed");
}

function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashAnswer(answer: string, salt: string, pepper: string) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${normalizeAnswer(answer)}:${pepper}`),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 210_000 },
    material,
    256,
  );
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function constantTimeEqual(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(left)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    difference |= a[index]! ^ b[index]!;
  }
  return difference === 0;
}

function randomToken(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function encodeTokenPart(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeTokenPart(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

async function signRecoveryClaims(claims: RecoveryTokenClaims, pepper: string) {
  const payload = encodeTokenPart(JSON.stringify(claims));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const encodedSignature = Buffer.from(signature).toString("base64url");
  return `${payload}.${encodedSignature}`;
}

async function readRecoveryClaims(token: string, pepper: string) {
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expectedSignature = Buffer.from(signature).toString("base64url");
  if (!(await constantTimeEqual(suppliedSignature, expectedSignature))) return null;

  try {
    return recoveryTokenClaimsSchema.parse(JSON.parse(decodeTokenPart(payload)));
  } catch {
    return null;
  }
}

function withoutRecoveryMetadata(metadata: Record<string, unknown>) {
  const next = { ...metadata };
  delete next[RECOVERY_NONCE_HASH_KEY];
  delete next[RECOVERY_EXPIRES_KEY];
  return next;
}

async function buildProfile(userId: string, answers: Answers, pepper: string) {
  const schoolSalt = randomSalt();
  const friendSalt = randomSalt();
  const citySalt = randomSalt();
  const [schoolHash, friendHash, cityHash] = await Promise.all([
    hashAnswer(answers.school, schoolSalt, pepper),
    hashAnswer(answers.friend, friendSalt, pepper),
    hashAnswer(answers.city, citySalt, pepper),
  ]);
  return {
    user_id: userId,
    school_answer_hash: schoolHash,
    school_answer_salt: schoolSalt,
    friend_answer_hash: friendHash,
    friend_answer_salt: friendSalt,
    city_answer_hash: cityHash,
    city_answer_salt: citySalt,
    updated_at: new Date().toISOString(),
  };
}

async function verifyAnswers(profile: SecurityProfile, answers: Answers, pepper: string) {
  const hashes = await Promise.all([
    hashAnswer(answers.school, profile.school_answer_salt, pepper),
    hashAnswer(answers.friend, profile.friend_answer_salt, pepper),
    hashAnswer(answers.city, profile.city_answer_salt, pepper),
  ]);
  const checks = await Promise.all([
    constantTimeEqual(hashes[0]!, profile.school_answer_hash),
    constantTimeEqual(hashes[1]!, profile.friend_answer_hash),
    constantTimeEqual(hashes[2]!, profile.city_answer_hash),
  ]);
  return checks.every(Boolean);
}

async function findUserByEmail(service: SupabaseClient, email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  return null;
}

async function getProfile(service: SupabaseClient, userId: string) {
  const { data, error } = await service
    .from("admin_security_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as SecurityProfile | null;
}

export async function adminSignupStatusHandler() {
  const settings = config();
  const service = serviceClient(settings.url, settings.serviceKey);
  const { count, error } = await service
    .from("admin_security_profiles")
    .select("user_id", { count: "exact", head: true });
  if (error) throw error;
  return json(
    { signupAvailable: (count ?? 0) === 0 },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function adminSignupHandler(request: Request) {
  rejectOversizedPayload(request);
  const input = signupSchema.parse(await request.json());
  const settings = config();
  const service = serviceClient(settings.url, settings.serviceKey);
  const buckets = await throttleBuckets(request, "admin-signup", input.email);
  await ensureNotLocked(service, buckets);
  if (!(await constantTimeEqual(input.setupCode, settings.setupSecret))) {
    await recordSecurityAttempt(service, buckets, false);
    throw new ApiError(403, "INVALID_SETUP_CODE", "The setup code is incorrect.");
  }
  if (settings.allowedEmail && input.email.toLowerCase() !== settings.allowedEmail) {
    throw new ApiError(403, "EMAIL_NOT_ALLOWED", "This email is not allowed to become an admin.");
  }

  const { count, error: countError } = await service
    .from("admin_security_profiles")
    .select("user_id", { count: "exact", head: true });
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new ApiError(409, "ADMIN_EXISTS", "Admin signup is already complete.");
  }

  let user = await findUserByEmail(service, input.email);
  let createdUser = false;
  if (user) {
    const { data, error } = await service.auth.admin.updateUserById(user.id, {
      password: input.password,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await service.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error("Admin user creation failed");
    user = data.user;
    createdUser = true;
  }

  try {
    const profile = await buildProfile(user.id, input.answers, settings.pepper);
    const { error: profileError } = await service
      .from("admin_security_profiles")
      .upsert(profile, { onConflict: "user_id" });
    if (profileError) throw profileError;
    const { error: adminError } = await service
      .from("admin_users")
      .upsert({ user_id: user.id }, { onConflict: "user_id" });
    if (adminError) throw adminError;
    await recordSecurityAttempt(service, buckets, true);
  } catch (error) {
    if (createdUser) {
      await service.auth.admin.deleteUser(user.id);
    } else {
      await service.from("admin_security_profiles").delete().eq("user_id", user.id);
    }
    throw error;
  }

  return json({ success: true }, { status: 201 });
}

export async function adminRecoverHandler(request: Request) {
  rejectOversizedPayload(request);
  const input = recoverySchema.parse(await request.json());
  const settings = config();
  const service = serviceClient(settings.url, settings.serviceKey);
  const identity = input.action === "verify" ? input.email : await digest(input.recoveryToken);
  const buckets = await throttleBuckets(request, `admin-recovery-${input.action}`, identity);
  await ensureNotLocked(service, buckets);

  if (input.action === "verify") {
    const user = await findUserByEmail(service, input.email);
    if (!user) {
      await recordSecurityAttempt(service, buckets, false);
      throw new ApiError(401, "RECOVERY_FAILED", "The email or security answers are incorrect.");
    }
    const profile = await getProfile(service, user.id);
    if (!profile || !(await verifyAnswers(profile, input.answers, settings.pepper))) {
      await recordSecurityAttempt(service, buckets, false);
      throw new ApiError(401, "RECOVERY_FAILED", "The email or security answers are incorrect.");
    }

    const nonce = randomToken();
    const expiresAt = Date.now() + RECOVERY_TOKEN_TTL_MS;
    const nonceHash = await digest(`${nonce}:${settings.pepper}`);
    const appMetadata = {
      ...user.app_metadata,
      [RECOVERY_NONCE_HASH_KEY]: nonceHash,
      [RECOVERY_EXPIRES_KEY]: expiresAt,
    };
    const { error: challengeError } = await service.auth.admin.updateUserById(user.id, {
      app_metadata: appMetadata,
    });
    if (challengeError) throw challengeError;

    const recoveryToken = await signRecoveryClaims(
      {
        purpose: "admin-password-recovery",
        userId: user.id,
        nonce,
        addressHash: await digest(clientAddress(request)),
        expiresAt,
      },
      settings.pepper,
    );
    await recordSecurityAttempt(service, buckets, true);
    return json(
      { success: true, recoveryToken, expiresIn: RECOVERY_TOKEN_TTL_MS / 1_000 },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const claims = await readRecoveryClaims(input.recoveryToken, settings.pepper);
  const addressHash = await digest(clientAddress(request));
  if (
    !claims ||
    claims.expiresAt <= Date.now() ||
    !(await constantTimeEqual(claims.addressHash, addressHash))
  ) {
    await recordSecurityAttempt(service, buckets, false);
    throw new ApiError(
      401,
      "RECOVERY_TOKEN_INVALID",
      "Verification expired. Answer the security questions again.",
    );
  }

  const { data: userResult, error: userError } = await service.auth.admin.getUserById(
    claims.userId,
  );
  const user = userResult.user;
  const storedNonceHash = user?.app_metadata?.[RECOVERY_NONCE_HASH_KEY];
  const storedExpiry = user?.app_metadata?.[RECOVERY_EXPIRES_KEY];
  const expectedNonceHash = await digest(`${claims.nonce}:${settings.pepper}`);
  if (
    userError ||
    !user ||
    typeof storedNonceHash !== "string" ||
    typeof storedExpiry !== "number" ||
    storedExpiry !== claims.expiresAt ||
    storedExpiry <= Date.now() ||
    !(await constantTimeEqual(storedNonceHash, expectedNonceHash))
  ) {
    await recordSecurityAttempt(service, buckets, false);
    throw new ApiError(
      401,
      "RECOVERY_TOKEN_INVALID",
      "Verification expired. Answer the security questions again.",
    );
  }

  const { error } = await service.auth.admin.updateUserById(user.id, {
    password: input.newPassword,
    app_metadata: withoutRecoveryMetadata(user.app_metadata),
  });
  if (error) throw error;
  await recordSecurityAttempt(service, buckets, true);
  return json({ success: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function adminCredentialsHandler(request: Request) {
  rejectOversizedPayload(request);
  const input = credentialsSchema.parse(await request.json());
  const settings = config();
  const service = serviceClient(settings.url, settings.serviceKey);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new ApiError(401, "UNAUTHORIZED", "Sign in again to continue.");
  const { data, error: userError } = await service.auth.getUser(token);
  if (userError || !data.user) {
    throw new ApiError(401, "UNAUTHORIZED", "Sign in again to continue.");
  }
  const profile = await getProfile(service, data.user.id);
  const { data: admin } = await service
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!admin || !profile) {
    throw new ApiError(403, "FORBIDDEN", "Administrator access is required.");
  }
  const buckets = await throttleBuckets(request, "admin-credentials", data.user.id);
  await ensureNotLocked(service, buckets);
  if (!(await verifyAnswers(profile, input.answers, settings.pepper))) {
    await recordSecurityAttempt(service, buckets, false);
    throw new ApiError(401, "VERIFICATION_FAILED", "The security answers are incorrect.");
  }
  const { error } = await service.auth.admin.updateUserById(data.user.id, {
    ...(input.email ? { email: input.email, email_confirm: true } : {}),
    ...(input.newPassword ? { password: input.newPassword } : {}),
  });
  if (error) throw error;
  await recordSecurityAttempt(service, buckets, true);
  return json({ success: true });
}
