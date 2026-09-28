/* eslint-disable @typescript-eslint/no-explicit-any -- Email templates accept normalized webhook records from multiple table shapes. */
/**
 * Professional HTML Email Templates for OPTIQUE Boutique Eyewear
 * =================================================================
 * - Order Confirmation (Customer + Admin Notification)
 * - Query Received (Customer Confirmation + Admin Alert)
 * - Newsletter Welcome (Subscriber)
 */

const BRAND_COLOR = "#c9a227";
const DARK_COLOR = "#1a1a1a";
const LIGHT_BG = "#f8f6f2";
const BORDER_COLOR = "#e8e4dc";

function baseWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OPTIQUE Boutique Eyewear</title>
</head>
<body style="margin:0;padding:0;background-color:${LIGHT_BG};font-family:'Segoe UI',Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${LIGHT_BG};">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:${DARK_COLOR};padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:${BRAND_COLOR};font-size:26px;font-weight:700;letter-spacing:6px;text-transform:uppercase;">OPTIQUE</h1>
              <p style="margin:6px 0 0;color:#888;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Boutique Eyewear</p>
            </td>
          </tr>

          <!-- Body -->
          ${content}

          <!-- Footer -->
          <tr>
            <td style="background-color:#f0ece4;padding:24px 40px;text-align:center;border-top:1px solid ${BORDER_COLOR};">
              <p style="margin:0 0 8px;color:#888;font-size:12px;">© ${new Date().getFullYear()} OPTIQUE Boutique Eyewear. All rights reserved.</p>
              <p style="margin:0;color:#aaa;font-size:11px;">
                If you have any questions, reply to this email or WhatsApp us directly.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function pill(text: string, color = BRAND_COLOR): string {
  return `<span style="display:inline-block;background:${color};color:#fff;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${text}</span>`;
}

function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BORDER_COLOR};color:#666;font-size:13px;width:35%;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${BORDER_COLOR};color:${DARK_COLOR};font-size:13px;font-weight:600;vertical-align:top;">${value}</td>
    </tr>`;
}

// ─── ORDER EMAIL (Customer Receipt) ─────────────────────────────────────────
export function getOrderEmailTemplate(order: any): string {
  const content = `
    <tr>
      <td style="padding:36px 40px;">
        <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Order Confirmation</p>
        <h2 style="margin:0 0 24px;color:${DARK_COLOR};font-size:22px;">Thank you, ${order.customer_name || "Valued Customer"}!</h2>
        <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.7;">
          We have successfully received your order. Our optical specialists are reviewing it and will contact you shortly to confirm payment and delivery.
        </p>

        <!-- Order Reference Badge -->
        <div style="background:${LIGHT_BG};border:1px solid ${BORDER_COLOR};border-radius:8px;padding:16px 20px;margin:0 0 24px;text-align:center;">
          <p style="margin:0 0 4px;color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Your Order Reference</p>
          <p style="margin:0;color:${BRAND_COLOR};font-size:24px;font-weight:700;letter-spacing:3px;">${order.reference || "—"}</p>
          <p style="margin:6px 0 0;color:#999;font-size:11px;">Keep this for tracking your order</p>
        </div>

        <!-- Order Details Table -->
        <h3 style="margin:0 0 12px;color:${DARK_COLOR};font-size:14px;text-transform:uppercase;letter-spacing:1px;">Order Details</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
          ${infoRow("Product", order.product_name || "—")}
          ${order.variant_label ? infoRow("Variant", order.variant_label) : ""}
          ${infoRow("Status", pill("Received"))}
          ${infoRow("Contact", order.contact || "—")}
        </table>

        ${
          order.message
            ? `
        <div style="background:${LIGHT_BG};border-left:3px solid ${BRAND_COLOR};padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:24px;">
          <p style="margin:0 0 4px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Notes</p>
          <p style="margin:0;color:#555;font-size:13px;line-height:1.6;">${order.message.replace(/\n/g, "<br/>")}</p>
        </div>`
            : ""
        }

        <!-- Next Steps -->
        <div style="background:#fff8ee;border:1px solid #f0d898;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;color:#a07800;font-size:13px;font-weight:700;">⏱ What happens next?</p>
          <ul style="margin:0;padding:0 0 0 18px;color:#555;font-size:13px;line-height:1.8;">
            <li>Our team will call / WhatsApp you to confirm your order.</li>
            <li>Payment is made on delivery or in-store — no online payment needed.</li>
            <li>We will update you with dispatch details once ready.</li>
          </ul>
        </div>

        <p style="margin:0;color:#555;font-size:14px;">Warm regards,<br/><strong style="color:${DARK_COLOR};">The OPTIQUE Team</strong></p>
      </td>
    </tr>`;
  return baseWrapper(content);
}

// ─── ADMIN ORDER NOTIFICATION ────────────────────────────────────────────────
export function getAdminOrderNotificationTemplate(order: any): string {
  const content = `
    <tr>
      <td style="padding:36px 40px;">
        <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:2px;">New Order Alert</p>
        <h2 style="margin:0 0 24px;color:${DARK_COLOR};font-size:22px;">🛍️ New Order: ${order.reference || "—"}</h2>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
          ${infoRow("Customer", order.customer_name || "—")}
          ${infoRow("Contact", order.contact || "—")}
          ${infoRow("Product", order.product_name || "—")}
          ${order.variant_label ? infoRow("Variant", order.variant_label) : ""}
          ${infoRow("Source", order.source || "—")}
          ${infoRow("Reference", order.reference || "—")}
        </table>

        ${
          order.message
            ? `
        <div style="background:${LIGHT_BG};border-left:3px solid ${BRAND_COLOR};padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:24px;">
          <p style="margin:0 0 4px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Customer Notes / Address</p>
          <p style="margin:0;color:#555;font-size:13px;line-height:1.6;">${order.message.replace(/\n/g, "<br/>")}</p>
        </div>`
            : ""
        }

        <p style="margin:0;color:#888;font-size:12px;">Please follow up with the customer promptly.</p>
      </td>
    </tr>`;
  return baseWrapper(content);
}

// ─── QUERY EMAIL (Customer Confirmation) ────────────────────────────────────
export function getQueryEmailTemplate(query: any): string {
  const content = `
    <tr>
      <td style="padding:36px 40px;">
        <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Inquiry Received</p>
        <h2 style="margin:0 0 24px;color:${DARK_COLOR};font-size:22px;">We've got your message, ${query.name || "there"}!</h2>
        <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.7;">
          Thank you for reaching out. Our optical specialists have received your inquiry and will get back to you <strong>within the same working day</strong>.
        </p>

        <div style="background:${LIGHT_BG};border:1px solid ${BORDER_COLOR};border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 12px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Inquiry Summary</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${query.product_name ? infoRow("About", query.product_name) : ""}
            ${infoRow("We'll reply to", query.contact || "—")}
          </table>
          ${
            query.message
              ? `
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid ${BORDER_COLOR};">
            <p style="margin:0 0 6px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Your message</p>
            <p style="margin:0;color:#555;font-size:13px;line-height:1.6;">${query.message.replace(/\n/g, "<br/>")}</p>
          </div>`
              : ""
          }
        </div>

        <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.7;">
          Meanwhile, you can also reach us instantly on WhatsApp for the quickest response.
        </p>

        <p style="margin:0;color:#555;font-size:14px;">Kind regards,<br/><strong style="color:${DARK_COLOR};">The OPTIQUE Team</strong></p>
      </td>
    </tr>`;
  return baseWrapper(content);
}

// ─── ADMIN QUERY NOTIFICATION ────────────────────────────────────────────────
export function getAdminQueryNotificationTemplate(query: any): string {
  const content = `
    <tr>
      <td style="padding:36px 40px;">
        <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:2px;">New Customer Inquiry</p>
        <h2 style="margin:0 0 24px;color:${DARK_COLOR};font-size:22px;">💬 New Query from ${query.name || "Customer"}</h2>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
          ${infoRow("From", query.name || "—")}
          ${infoRow("Contact", query.contact || "—")}
          ${query.product_name ? infoRow("About", query.product_name) : ""}
        </table>

        ${
          query.message
            ? `
        <div style="background:${LIGHT_BG};border-left:3px solid ${BRAND_COLOR};padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:24px;">
          <p style="margin:0 0 4px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Message</p>
          <p style="margin:0;color:#555;font-size:13px;line-height:1.6;">${query.message.replace(/\n/g, "<br/>")}</p>
        </div>`
            : ""
        }
      </td>
    </tr>`;
  return baseWrapper(content);
}

// ─── NEWSLETTER WELCOME EMAIL ────────────────────────────────────────────────
export function getSubscriberEmailTemplate(subscriber: any): string {
  const content = `
    <tr>
      <td style="padding:36px 40px;text-align:center;">
        <div style="margin-bottom:24px;">
          <p style="margin:0;font-size:40px;">👓</p>
        </div>
        <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:2px;">You're in!</p>
        <h2 style="margin:0 0 16px;color:${DARK_COLOR};font-size:24px;">Welcome to OPTIQUE</h2>
        <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.8;max-width:440px;margin-left:auto;margin-right:auto;">
          Thank you for subscribing! You're now part of an exclusive circle that gets first access to new collections, expert optical advice, and special offers.
        </p>

        <div style="background:${LIGHT_BG};border:1px solid ${BORDER_COLOR};border-radius:8px;padding:20px;margin:0 0 28px;text-align:left;">
          <p style="margin:0 0 12px;color:${DARK_COLOR};font-size:13px;font-weight:700;">What to expect:</p>
          <ul style="margin:0;padding:0 0 0 18px;color:#555;font-size:13px;line-height:2;">
            <li>New collection launches before anyone else</li>
            <li>Exclusive subscriber-only discounts</li>
            <li>Optical care tips from our specialists</li>
            <li>Style guides & trend reports</li>
          </ul>
        </div>

        <a href="https://optique-boutique.com" style="display:inline-block;background-color:${BRAND_COLOR};color:#fff;padding:14px 32px;text-decoration:none;border-radius:30px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-size:12px;">Explore the Collection</a>

        <p style="margin:28px 0 0;color:#aaa;font-size:12px;">Subscribed by mistake? Simply ignore this email.</p>
      </td>
    </tr>`;
  return baseWrapper(content);
}
