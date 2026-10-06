export function clientAddress(request: Request, env = process.env): string {
  if (env["VERCEL"] === "1") {
    return request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  }
  if (env["TRUSTED_PROXY"] === "cloudflare") {
    return request.headers.get("cf-connecting-ip")?.trim() || "unknown";
  }
  if (env["NODE_ENV"] === "production") return "unknown";
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
