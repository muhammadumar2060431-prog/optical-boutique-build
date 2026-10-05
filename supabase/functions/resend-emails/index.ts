/* eslint-disable @typescript-eslint/no-explicit-any -- Webhook payloads are validated and normalized at this external boundary. */
import {
  getOrderEmailTemplate,
  getAdminOrderNotificationTemplate,
  getQueryEmailTemplate,
  getAdminQueryNotificationTemplate,
  getSubscriberEmailTemplate,
} from "./templates.ts";

const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "shop.nigah@gmail.com";

// ─── IMPORTANT ─────────────────────────────────────────────────────────────
// Using Resend's default sending domain until a custom domain is verified.
// Once you verify your domain on resend.com/domains, change this to:
//   "Nigah <hello@yourdomain.com>"
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Nigah <onboarding@resend.dev>";

async function secretsMatch(
  provided: string | null,
  expected: string | undefined,
): Promise<boolean> {
  if (!provided || !expected) return false;

  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(providedHash);
  const right = new Uint8Array(expectedHash);
  let difference = left.length ^ right.length;

  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
}
// ───────────────────────────────────────────────────────────────────────────

/** Extract first email address from a string like "+92 300 ... · user@email.com" */
function extractEmail(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  const match = text.match(/[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/);
  return match ? match[0].trim() : null;
}

/** Send a single email using direct HTTP fetch to Resend REST API (ultra-lightweight & fast) */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  bcc?: string,
): Promise<{ success: boolean; error?: any }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("[resend] ERROR: RESEND_API_KEY secret is not set in Supabase!");
    return { success: false, error: "RESEND_API_KEY secret missing in Supabase Edge Functions" };
  }

  try {
    const payload: any = {
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    };
    if (bcc) payload.bcc = [bcc];

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[resend] Failed to send to ${to}:`, JSON.stringify(data));
      return { success: false, error: data };
    }

    console.log(`[resend] ✓ Email sent to ${to}:`, data.id);
    return { success: true, id: data.id };
  } catch (err: any) {
    console.error(`[resend] Exception sending to ${to}:`, err?.message ?? err);
    return { success: false, error: err?.message ?? String(err) };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  const providedSecret = req.headers.get("X-Resend-Webhook-Secret");
  if (!(await secretsMatch(providedSecret, webhookSecret))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { type, table, record } = body;
  console.log(`[resend-emails] Received event: type=${type}, table=${table}`);

  // Only process INSERT events
  if (type !== "INSERT" || !record) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "Not an INSERT event or no record provided" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const results: any[] = [];

    if (table === "orders") {
      // ── Normalize Order Record ──
      const firstItem =
        Array.isArray(record.items) && record.items.length > 0 ? record.items[0] : {};

      const normalizedOrder = {
        reference: firstItem.reference || record.reference || record.id || "OPT-ORDER",
        customer_name: record.customer_name || record.customerName || "Valued Customer",
        contact: record.email || record.phone || record.contact || "N/A",
        product_name:
          firstItem.productName || record.product_name || record.productName || "Nigah Frames",
        variant_label: firstItem.variantLabel || record.variant_label || record.variantLabel || "",
        source: record.source || firstItem.source || "Website",
        message: record.address
          ? `Address: ${record.address}${record.city ? `, ${record.city}` : ""}${record.notes ? `\nNotes: ${record.notes}` : ""}`
          : record.message || "",
        total: record.total || 0,
      };

      const customerEmail =
        extractEmail(normalizedOrder.contact) || extractEmail(record.email || "");

      // Send to customer if valid email found
      if (customerEmail) {
        const custRes = await sendEmail(
          customerEmail,
          `Order Confirmed — ${normalizedOrder.reference}`,
          getOrderEmailTemplate(normalizedOrder),
        );
        results.push({ target: "customer", email: customerEmail, ...custRes });
      }

      // Always send admin notification
      const adminRes = await sendEmail(
        ADMIN_EMAIL,
        `🛍️ New Order: ${normalizedOrder.reference} — ${normalizedOrder.customer_name}`,
        getAdminOrderNotificationTemplate(normalizedOrder),
      );
      results.push({ target: "admin", email: ADMIN_EMAIL, ...adminRes });
    } else if (table === "queries") {
      // ── Normalize Query Record ──
      const normalizedQuery = {
        name: record.name || "Customer",
        contact: record.contact || record.email || record.phone || "N/A",
        product_name: record.product_name || record.productName || "",
        message: record.message || "",
      };

      const customerEmail = extractEmail(normalizedQuery.contact);

      // Send to customer if valid email found
      if (customerEmail) {
        const custRes = await sendEmail(
          customerEmail,
          "We received your inquiry — Nigah Boutique",
          getQueryEmailTemplate(normalizedQuery),
        );
        results.push({ target: "customer", email: customerEmail, ...custRes });
      }

      // Always send admin notification
      const adminRes = await sendEmail(
        ADMIN_EMAIL,
        `💬 New Inquiry from ${normalizedQuery.name}`,
        getAdminQueryNotificationTemplate(normalizedQuery),
      );
      results.push({ target: "admin", email: ADMIN_EMAIL, ...adminRes });
    } else if (table === "subscribers") {
      // ── Subscriber Record ──
      if (!record.email) {
        return new Response(JSON.stringify({ error: "No email in subscriber record" }), {
          status: 400,
        });
      }

      const subRes = await sendEmail(
        record.email,
        "Welcome to Nigah — You're on the list! 👓",
        getSubscriberEmailTemplate(),
      );
      results.push({ target: "subscriber", email: record.email, ...subRes });

      const adminRes = await sendEmail(
        ADMIN_EMAIL,
        `📧 New Subscriber: ${record.email}`,
        `<p>A new user <strong>${record.email}</strong> subscribed to the Nigah newsletter.</p>`,
      );
      results.push({ target: "admin", email: ADMIN_EMAIL, ...adminRes });
    } else {
      console.log(`[resend-emails] Unhandled table: ${table}`);
      return new Response(
        JSON.stringify({ skipped: true, reason: `Table "${table}" not handled` }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const failed = results.filter((result) => !result.success);
    return new Response(JSON.stringify({ success: failed.length === 0, results }), {
      status: failed.length === 0 ? 200 : 502,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[resend-emails] Unexpected error:", err?.message ?? err);
    return new Response(JSON.stringify({ error: "Email processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
