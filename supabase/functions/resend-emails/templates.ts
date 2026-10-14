/* eslint-disable @typescript-eslint/no-explicit-any -- Templates accept normalized webhook records. */
const SITE_URL = "https://www.nigah.store";

function baseWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>Nigah Eyewear</title>
  <style>
    a { color: #000000 !important; }
    @media only screen and (max-width: 600px) {
      .outer { padding: 16px 8px !important; }
      .content { padding: 28px 20px !important; }
      .heading { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#ffffff;color:#000000;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
    <tr>
      <td class="outer" align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #000000;">
          <tr>
            <td align="center" style="padding:28px 24px 24px;border-bottom:3px solid #000000;">
              <a href="${SITE_URL}" style="display:inline-block;color:#000000;text-decoration:none;">
                <img src="${SITE_URL}/email-logo.png" width="150" alt="Nigah Eyewear" style="display:block;width:150px;max-width:100%;height:auto;border:0;" />
              </a>
              <p style="margin:14px 0 0;color:#000000;font-size:11px;line-height:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">NIGAH &middot; BOUTIQUE EYEWEAR</p>
            </td>
          </tr>
          ${content}
          <tr>
            <td align="center" style="padding:22px 20px;background:#000000;color:#ffffff;">
              <p style="margin:0 0 8px;font-size:12px;line-height:18px;font-weight:700;">NIGAH EYEWEAR</p>
              <p style="margin:0;font-size:11px;line-height:18px;">&copy; ${new Date().getFullYear()} Nigah Boutique Eyewear. All rights reserved.</p>
              <p style="margin:8px 0 0;font-size:11px;line-height:18px;">For assistance, reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(label: string, title: string): string {
  return `<p style="margin:0 0 10px;font-size:11px;line-height:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${label}</p>
    <h1 class="heading" style="margin:0 0 24px;font-size:28px;line-height:1.25;font-weight:700;overflow-wrap:anywhere;word-break:break-word;">${title}</h1>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td width="35%" style="padding:13px 12px 13px 0;border-bottom:1px solid #000000;font-size:12px;line-height:20px;vertical-align:top;">${label}</td>
    <td style="padding:13px 0;border-bottom:1px solid #000000;font-size:13px;line-height:20px;font-weight:600;vertical-align:top;overflow-wrap:anywhere;word-break:break-word;">${value}</td>
  </tr>`;
}

function details(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;margin:0 0 24px;">${rows}</table>`;
}

function note(label: string, message: string): string {
  if (!message) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;margin:0 0 24px;border:1px solid #000000;">
    <tr><td style="padding:16px;">
      <p style="margin:0 0 8px;font-size:11px;line-height:16px;font-weight:700;text-transform:uppercase;">${label}</p>
      <p style="margin:0;font-size:13px;line-height:21px;overflow-wrap:anywhere;word-break:break-word;">${message.replace(/\r?\n/g, "<br />")}</p>
    </td></tr>
  </table>`;
}

function orderRows(order: any): string {
  const total = Number(order.total);
  const quantity = Number(order.quantity);
  return (
    infoRow("Order reference", order.reference || "Not provided") +
    infoRow("Customer", order.customer_name || "Valued Customer") +
    infoRow("Contact", order.contact || "Not provided") +
    infoRow("Product", order.product_name || "Not provided") +
    (order.variant_label ? infoRow("Variant", order.variant_label) : "") +
    (Number.isInteger(quantity) && quantity > 0 ? infoRow("Quantity", String(quantity)) : "") +
    (order.total != null && Number.isFinite(total) && total >= 0
      ? infoRow(
          "Order total",
          `PKR ${total.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        )
      : "")
  );
}

export function getOrderEmailTemplate(order: any): string {
  return baseWrapper(`<tr><td class="content" style="padding:32px;">
    ${heading("Order receipt", "Thank you for your order")}
    <p style="margin:0 0 24px;font-size:14px;line-height:23px;">Hello ${order.customer_name || "Valued Customer"},<br />We have received your order. Please keep this receipt for your records.</p>
    ${details(orderRows(order) + infoRow("Order status", "Received - awaiting confirmation"))}
    ${note("Delivery address / order notes", order.message)}
    ${note("What happens next", "Our team will contact you to confirm your order, payment and delivery details. We will share dispatch updates once your order is ready.")}
    <p style="margin:0;font-size:13px;line-height:21px;">Thank you for choosing Nigah.<br /><strong>The Nigah Team</strong></p>
  </td></tr>`);
}

export function getAdminOrderNotificationTemplate(order: any): string {
  return baseWrapper(`<tr><td class="content" style="padding:32px;">
    ${heading("New order notification", "New order received")}
    <p style="margin:0 0 24px;font-size:13px;line-height:21px;">A new order is ready for review and confirmation.</p>
    ${details(orderRows(order) + infoRow("Order source", order.source || "Website"))}
    ${note("Customer notes / delivery address", order.message)}
    <p style="margin:0;font-size:12px;line-height:20px;">Please confirm the order and delivery details with the customer.</p>
  </td></tr>`);
}

export function getQueryEmailTemplate(query: any): string {
  return baseWrapper(`<tr><td class="content" style="padding:32px;">
    ${heading("Inquiry confirmation", "We received your message")}
    <p style="margin:0 0 24px;font-size:14px;line-height:23px;">Hello ${query.name || "there"},<br />Thank you for contacting Nigah. Our team will review your inquiry and get back to you shortly.</p>
    ${details(
      (query.product_name ? infoRow("Product", query.product_name) : "") +
        infoRow("Contact", query.contact || "Not provided"),
    )}
    ${note("Your message", query.message)}
    <p style="margin:0;font-size:13px;line-height:21px;">Kind regards,<br /><strong>The Nigah Team</strong></p>
  </td></tr>`);
}

export function getAdminQueryNotificationTemplate(query: any): string {
  return baseWrapper(`<tr><td class="content" style="padding:32px;">
    ${heading("Customer inquiry", "New message received")}
    ${details(
      infoRow("Customer", query.name || "Customer") +
        infoRow("Contact", query.contact || "Not provided") +
        (query.product_name ? infoRow("Product", query.product_name) : ""),
    )}
    ${note("Message", query.message)}
  </td></tr>`);
}

export function getSubscriberEmailTemplate(): string {
  return baseWrapper(`<tr><td class="content" style="padding:32px;">
    ${heading("Newsletter", "Welcome to Nigah")}
    <p style="margin:0 0 24px;font-size:14px;line-height:23px;">Thank you for subscribing. You will receive updates on new collections, exclusive offers and eyewear care from the Nigah team.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border:2px solid #000000;padding:14px 22px;">
        <a href="${SITE_URL}" style="color:#000000;font-size:12px;font-weight:700;text-decoration:none;">Explore the collection &rarr;</a>
      </td>
    </tr></table>
    <p style="margin:24px 0 0;font-size:11px;line-height:18px;">If you did not subscribe, you can ignore this email.</p>
  </td></tr>`);
}
