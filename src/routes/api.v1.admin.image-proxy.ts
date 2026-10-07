import { createFileRoute } from "@tanstack/react-router";

import { ApiError, withApi } from "@/lib/api/http.server";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/avif", "image/jpeg", "image/png", "image/webp"]);

function configuredStorageHosts() {
  const hosts = new Set<string>();
  for (const value of [
    process.env["VITE_SUPABASE_URL"],
    process.env["SUPABASE_URL"],
    import.meta.env.VITE_SUPABASE_URL,
  ]) {
    if (!value) continue;
    try {
      hosts.add(new URL(value).host);
    } catch {
      // Ignore malformed optional env values.
    }
  }
  return hosts;
}

function assertAllowedImageUrl(rawUrl: string | null) {
  if (!rawUrl) throw new ApiError(400, "IMAGE_URL_REQUIRED", "Image URL is required.");

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ApiError(400, "INVALID_IMAGE_URL", "Image URL is invalid.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new ApiError(400, "INVALID_IMAGE_URL", "Only HTTP image URLs can be adjusted.");
  }

  if (url.username || url.password || !configuredStorageHosts().has(url.host)) {
    throw new ApiError(403, "IMAGE_HOST_NOT_ALLOWED", "This image host is not allowed.");
  }

  if (!url.pathname.startsWith("/storage/v1/object/public/optique-images/")) {
    throw new ApiError(403, "IMAGE_PATH_NOT_ALLOWED", "Only storage images can be adjusted.");
  }

  return url;
}

const getImage = withApi(
  async ({ request }) => {
    const sourceUrl = assertAllowedImageUrl(new URL(request.url).searchParams.get("url"));
    const response = await fetch(sourceUrl, {
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg" },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new ApiError(
        response.status === 404 ? 404 : 502,
        "IMAGE_FETCH_FAILED",
        "Image fetch failed.",
      );
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new ApiError(415, "UNSUPPORTED_IMAGE_TYPE", "This image type cannot be adjusted.");
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_IMAGE_BYTES) {
      throw new ApiError(413, "IMAGE_TOO_LARGE", "The image is too large to adjust.");
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new ApiError(413, "IMAGE_TOO_LARGE", "The image is too large to adjust.");
    }

    return new Response(bytes, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Length": String(bytes.byteLength),
        "Content-Type": contentType,
      },
    });
  },
  {
    name: "api.v1.admin.image-proxy",
    methods: ["GET"],
    rateLimit: { max: 120, windowMs: 60_000 },
  },
);

export const Route = createFileRoute("/api/v1/admin/image-proxy")({
  server: {
    handlers: {
      GET: getImage,
      OPTIONS: getImage,
    },
  },
});
