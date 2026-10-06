import {
  getOrderEmailTemplate,
  getAdminOrderNotificationTemplate,
  getQueryEmailTemplate,
  getAdminQueryNotificationTemplate,
  getSubscriberEmailTemplate,
} from "../resend-emails/templates.ts";

export interface NotificationEmail {
  target: string;
  to: string;
  subject: string;
  html: string;
}
const emailPattern = /[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/;
const email = (value: unknown) =>
  typeof value === "string" ? value.match(emailPattern)?.[0] || null : null;
const htmlSafe = (record: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      typeof value === "string"
        ? value.replace(
            /[&<>"']/g,
            (character) =>
              ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
          )
        : value,
    ]),
  );

export function notificationEmails(
  payload: { table?: string; record?: Record<string, unknown>; kind?: string },
  adminEmail: string,
): NotificationEmail[] {
  if (payload.kind === "probe") return [];
  const record = payload.record;
  if (!record) throw new Error("INVALID_JOB");
  if (payload.table === "orders") {
    const order = {
      reference: record["reference"] || record["id"],
      customer_name: record["customer_name"] || "Customer",
      contact: record["phone"] || "",
      product_name: record["product_name"] || "Nigah Frames",
      variant_label: record["variant_label"] || "",
      source: record["source"] || "Website",
      message: record["address"] || "",
      total: record["total"] || 0,
    };
    const customerEmail = email(order.contact);
    return [
      ...(customerEmail
        ? [
            {
              target: "customer",
              to: customerEmail,
              subject: `Order Confirmed - ${order.reference}`,
              html: getOrderEmailTemplate(htmlSafe(order)),
            },
          ]
        : []),
      {
        target: "admin",
        to: adminEmail,
        subject: `New Order: ${order.reference}`,
        html: getAdminOrderNotificationTemplate(htmlSafe(order)),
      },
    ];
  }
  if (payload.table === "queries") {
    const query = {
      name: record["name"] || "Customer",
      contact: record["contact"] || "",
      product_name: record["product_name"] || "",
      message: record["message"] || "",
    };
    const customerEmail = email(query.contact);
    return [
      ...(customerEmail
        ? [
            {
              target: "customer",
              to: customerEmail,
              subject: "We received your inquiry - Nigah Boutique",
              html: getQueryEmailTemplate(htmlSafe(query)),
            },
          ]
        : []),
      {
        target: "admin",
        to: adminEmail,
        subject: "New Inquiry - Nigah Boutique",
        html: getAdminQueryNotificationTemplate(htmlSafe(query)),
      },
    ];
  }
  if (payload.table === "subscribers") {
    const subscriberEmail = email(record["email"]);
    if (!subscriberEmail) throw new Error("INVALID_JOB");
    return [
      {
        target: "subscriber",
        to: subscriberEmail,
        subject: "Welcome to Nigah",
        html: getSubscriberEmailTemplate(),
      },
      {
        target: "admin",
        to: adminEmail,
        subject: "New Subscriber - Nigah",
        html: "<p>A new subscriber joined the newsletter. View the subscriber list in your admin panel.</p>",
      },
    ];
  }
  throw new Error("INVALID_JOB");
}
