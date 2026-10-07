const BASE_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.googletagmanager.com https://*.google-analytics.com https://www.facebook.com https://connect.facebook.net",
  "frame-src https://www.googletagmanager.com https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://www.tiktok.com https://www.facebook.com",
  "worker-src 'self' blob:",
];

export function applySecurityHeaders(response: Response, request: Request) {
  const headers = new Headers(response.headers);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secureRequest = new URL(request.url).protocol === "https:" || forwardedProto === "https";
  const csp = secureRequest ? [...BASE_CSP, "upgrade-insecure-requests"] : BASE_CSP;

  headers.set("Content-Security-Policy", csp.join("; "));
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (secureRequest) {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
