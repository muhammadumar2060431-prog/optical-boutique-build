import assert from "node:assert/strict";
import { it } from "node:test";
import { notificationEmails } from "../supabase/functions/notification-worker/emails.ts";
import {
  drainNotifications,
  type NotificationJob,
} from "../supabase/functions/notification-worker/worker.ts";

const job: NotificationJob = {
  id: "1",
  dedupeKey: "orders:order-1",
  leaseToken: "lease",
  sentTargets: [],
  payload: {
    table: "orders",
    record: {
      id: "order-1",
      reference: "OPT-TEST123",
      customer_name: "Test",
      phone: "test@example.test",
      product_name: "Frame",
      total: 20,
    },
  },
};

it("sends both order receipts and newsletter emails as independent jobs", () => {
  const order = notificationEmails(
    {
      table: "orders",
      record: {
        id: "order-test",
        reference: "OPT-TEST",
        phone: "03001234567",
        email: "buyer@example.test",
        product_name: "Frame",
        total: 1999,
      },
    },
    "admin@example.test",
  );
  const subscriber = notificationEmails(
    { table: "subscribers", record: { email: "buyer@example.test" } },
    "admin@example.test",
  );
  assert.deepEqual(
    order.map((mail) => [mail.target, mail.to]),
    [
      ["customer", "buyer@example.test"],
      ["admin", "admin@example.test"],
    ],
  );
  assert.deepEqual(
    subscriber.map((mail) => [mail.target, mail.to]),
    [
      ["subscriber", "buyer@example.test"],
      ["admin", "admin@example.test"],
    ],
  );
  assert.match(order[0]!.subject, /Order Confirmed/);
  assert.match(order[1]!.subject, /New Order/);
  assert.match(subscriber[0]!.subject, /Welcome/);
  assert.match(subscriber[1]!.subject, /New Subscriber/);
  assert.match(order[0]!.html, /PKR 1,999.00/);
});

it("uses legacy checkout item contact and notes when top-level fields are absent", () => {
  const mails = notificationEmails(
    {
      table: "orders",
      record: {
        id: "legacy-order",
        phone: "03001234567",
        items: [
          {
            contact: "03001234567 / buyer@example.test",
            productName: "Classic Frame",
            message: "Delivery address: Lahore",
            quantity: 2,
          },
        ],
      },
    },
    "admin@example.test",
  );
  assert.equal(mails[0]!.to, "buyer@example.test");
  assert.match(mails[0]!.html, /Classic Frame/);
  assert.match(mails[0]!.html, /Delivery address: Lahore/);
});

it("retains combined phone-email checkout contacts and never suppresses the admin order alert", () => {
  const mails = notificationEmails(
    { table: "orders", record: { id: "combined", phone: "03001234567 / buyer@example.test" } },
    "admin@example.test",
  );
  assert.equal(mails[0]!.to, "buyer@example.test");
  const noEmail = notificationEmails(
    { table: "orders", record: { id: "phone-only", phone: "03001234567" } },
    "admin@example.test",
  );
  assert.equal(noEmail.length, 1);
  assert.equal(noEmail[0]!.target, "admin");
});
it("acknowledges successful sends and records recipient-level receipts", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const keys: string[] = [];
  let read = false;
  const result = await drainNotifications({
    adminEmail: "admin@example.test",
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === "claim_notification_job_v1" && !read) {
        read = true;
        return job;
      }
      return null;
    },
    send: async (_email, key) => {
      keys.push(key);
    },
  });
  assert.deepEqual(result, { processed: 1, failed: 0 });
  assert.deepEqual(keys, ["orders:order-1:customer", "orders:order-1:admin"]);
  assert.equal(calls.filter((call) => call.name === "mark_notification_delivery_v1").length, 2);
  assert.equal(
    calls.find((call) => call.name === "finish_notification_job_v1")?.args["p_success"],
    true,
  );
});
it("retries only the unfinished recipient after a partial delivery", async () => {
  const targets: string[] = [];
  let read = false;
  await drainNotifications({
    adminEmail: "admin@example.test",
    rpc: async (name) => {
      if (name === "claim_notification_job_v1" && !read) {
        read = true;
        return { ...job, sentTargets: ["customer"] };
      }
      return null;
    },
    send: async (mail) => {
      targets.push(mail.target);
    },
  });
  assert.deepEqual(targets, ["admin"]);
});
it("records a retryable failure without marking the job sent or leaking provider payloads", async () => {
  const calls: Record<string, unknown>[] = [];
  let read = false;
  const result = await drainNotifications({
    adminEmail: "admin@example.test",
    rpc: async (name, args) => {
      if (name === "claim_notification_job_v1" && !read) {
        read = true;
        return job;
      }
      if (name === "finish_notification_job_v1") calls.push(args);
      return null;
    },
    send: async () => {
      throw new Error("RESEND_503");
    },
  });
  assert.deepEqual(result, { processed: 0, failed: 1 });
  assert.equal(calls[0]?.["p_success"], false);
  assert.equal(calls[0]?.["p_error_code"], "RESEND_503");
});
it("bounds work per invocation and supports a notification-free operational probe", async () => {
  let claimed = 0;
  const result = await drainNotifications({
    adminEmail: "admin@example.test",
    rpc: async (name) =>
      name === "claim_notification_job_v1"
        ? { ...job, id: String(++claimed), payload: { kind: "probe" } }
        : null,
    send: async () => {
      throw new Error("Probe must never send email");
    },
  });
  assert.equal(claimed, 5);
  assert.deepEqual(result, { processed: 5, failed: 0 });
});
