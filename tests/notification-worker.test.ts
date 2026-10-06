import assert from "node:assert/strict";
import { it } from "node:test";
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
