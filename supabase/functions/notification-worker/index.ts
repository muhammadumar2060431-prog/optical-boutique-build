import { drainNotifications } from "./worker.ts";

async function matchesSecret(provided: string | null, expected: string | undefined) {
  if (!provided || !expected) return false;
  const encode = new TextEncoder();
  const left = new Uint8Array(await crypto.subtle.digest("SHA-256", encode.encode(provided)));
  const right = new Uint8Array(await crypto.subtle.digest("SHA-256", encode.encode(expected)));
  let diff = 0;
  for (let n = 0; n < left.length; n++) diff |= left[n]! ^ right[n]!;
  return diff === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (
    !(await matchesSecret(
      request.headers.get("X-Resend-Webhook-Secret"),
      Deno.env.get("RESEND_WEBHOOK_SECRET"),
    ))
  )
    return new Response(null, { status: 401 });
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resend = Deno.env.get("RESEND_API_KEY");
  if (!url || !service || !resend)
    return Response.json({ error: "WORKER_UNAVAILABLE" }, { status: 503 });
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("DATABASE_UNAVAILABLE");
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  };
  try {
    const result = await drainNotifications({
      rpc,
      adminEmail: Deno.env.get("ADMIN_EMAIL") || "shop.nigah@gmail.com",
      send: async (mail, key) => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resend}`,
            "Content-Type": "application/json",
            "Idempotency-Key": key,
          },
          body: JSON.stringify({
            from: Deno.env.get("RESEND_FROM_EMAIL") || "Nigah <onboarding@resend.dev>",
            to: [mail.to],
            subject: mail.subject,
            html: mail.html,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`RESEND_${response.status}`);
      },
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: "WORKER_UNAVAILABLE" }, { status: 503 });
  }
});
