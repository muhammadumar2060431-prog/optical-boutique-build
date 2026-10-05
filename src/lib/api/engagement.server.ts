import { Buffer } from "node:buffer";

import { createClient } from "@supabase/supabase-js";

import {
  createProductReviewSchema,
  createSubscriberSchema,
  type CreateProductReviewInput,
  type CreateSubscriberInput,
} from "./contracts.ts";
import { ApiError, json, readJsonBody } from "./http.server.ts";
import { createReviewRecord } from "./review-record.ts";

const STORAGE_BUCKET = "optique-images";
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function serviceClient() {
  const url =
    process.env["SUPABASE_URL"] ??
    process.env["VITE_SUPABASE_URL"] ??
    import.meta.env.VITE_SUPABASE_URL;
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey) {
    throw new ApiError(
      503,
      "SERVICE_UNAVAILABLE",
      "Submission service is temporarily unavailable.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function imageExtension(mimeType: string) {
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("avif")) return "avif";
  return "jpg";
}

async function uploadReviewImage(image: string | null | undefined) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;

  const match = /^data:(image\/[A-Za-z0-9.+-]+);base64,(.+)$/.exec(image);
  if (!match) {
    throw new ApiError(400, "VALIDATION_ERROR", "The review image is invalid.");
  }

  const mimeType = match[1]!.toLowerCase();
  if (!IMAGE_MIME_TYPES.has(mimeType)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Use a JPG, PNG, WebP, or AVIF review image.");
  }

  const bytes = Buffer.from(match[2]!, "base64");
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The review image must be under 5 MB.");
  }

  const client = serviceClient();
  const path = `testimonials/${crypto.randomUUID()}.${imageExtension(mimeType)}`;
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    upsert: false,
    contentType: mimeType,
    cacheControl: "31536000",
  });
  if (error) throw new Error("Review image upload failed");

  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function subscriberHandler(request: Request) {
  const input: CreateSubscriberInput = createSubscriberSchema.parse(
    await readJsonBody(request, 20_000),
  );
  const client = serviceClient();
  const id = `sub-${crypto.randomUUID()}`;
  const { data, error } = await client.rpc("subscribe_email", {
    p_id: id,
    p_email: input.email,
  });
  if (error) throw new Error("Subscriber insert failed");

  const row = Array.isArray(data) ? data[0] : data;
  return json(
    {
      data: {
        id: row?.id ?? id,
        email: row?.email ?? input.email.trim().toLowerCase(),
        status: row?.status ?? "active",
        createdAt: row?.created_at ?? new Date().toISOString(),
      },
    },
    { status: 201 },
  );
}

export async function productReviewHandler(request: Request) {
  const input: CreateProductReviewInput = createProductReviewSchema.parse(
    await readJsonBody(request, 7_500_000),
  );
  const reviewImage = await uploadReviewImage(input.reviewImage);
  const id = `review-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  const { record, response } = createReviewRecord(input, id, createdAt, reviewImage);

  const client = serviceClient();
  const { error } = await client.from("testimonials").insert(record);
  if (error) throw new Error("Review insert failed");

  return json(
    {
      data: response,
    },
    { status: 201 },
  );
}
