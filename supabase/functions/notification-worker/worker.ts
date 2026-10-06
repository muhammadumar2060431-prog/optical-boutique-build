import { notificationEmails, type NotificationEmail } from "./emails.ts";

export interface NotificationJob {
  id: string;
  dedupeKey: string;
  leaseToken: string;
  sentTargets: string[];
  payload: Parameters<typeof notificationEmails>[0];
}
export interface WorkerDependencies {
  rpc: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  send: (email: NotificationEmail, key: string) => Promise<void>;
  adminEmail: string;
  now?: () => number;
}

export async function drainNotifications(deps: WorkerDependencies) {
  const now = deps.now || Date.now;
  const deadline = now() + 45000;
  let processed = 0;
  let failed = 0;
  while (processed + failed < 5 && now() < deadline) {
    const job = (await deps.rpc("claim_notification_job_v1", {})) as NotificationJob | null;
    if (!job) break;
    const args = { p_job_id: job.id, p_lease_token: job.leaseToken };
    try {
      for (const mail of notificationEmails(job.payload, deps.adminEmail)) {
        if (job.sentTargets.includes(mail.target)) continue;
        await deps.send(mail, `${job.dedupeKey}:${mail.target}`);
        await deps.rpc("mark_notification_delivery_v1", { ...args, p_target: mail.target });
      }
      await deps.rpc("finish_notification_job_v1", { ...args, p_success: true });
      processed++;
    } catch (error) {
      const code =
        error instanceof Error &&
        /^(RESEND_[0-9]{3}|INVALID_JOB|DELIVERY_TIMEOUT)$/.test(error.message)
          ? error.message
          : "DELIVERY_UNAVAILABLE";
      await deps.rpc("finish_notification_job_v1", {
        ...args,
        p_success: false,
        p_error_code: code,
      });
      failed++;
    }
  }
  return { processed, failed };
}
