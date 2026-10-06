import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { useStore, parseOrderRecord } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export function AdminDashboard() {
  const { isAdmin } = useStore();
  const summary = useQuery({
    queryKey: ["admin-dashboard"],
    enabled: isAdmin,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_stats_v1");
      if (error) throw new Error("Dashboard could not be loaded.");
      return data as {
        products: number;
        categories: number;
        newOrders: number;
        stockAlerts: number;
        recentOrders: Record<string, unknown>[];
      };
    },
  });
  const queue = useQuery({
    queryKey: ["admin-notifications"],
    enabled: isAdmin,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_notification_queue_v1");
      if (error) throw new Error("Notification status could not be loaded.");
      return data as {
        pending: number;
        processing: number;
        failed: number;
        failedJobs: Array<{ id: string; attempts: number; error_code: string }>;
      };
    },
  });
  const todaysOrders = (summary.data?.recentOrders || []).map((row) => parseOrderRecord(row));

  const metrics = [
    { label: "Total products", value: summary.data?.products ?? "-" },
    { label: "Categories", value: summary.data?.categories ?? "-" },
    { label: "New orders", value: summary.data?.newOrders ?? "-" },
    { label: "Stock alerts", value: summary.data?.stockAlerts ?? "-" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow text-gold">Overview</p>
        <h1 className="mt-2 font-display text-3xl">Dashboard</h1>
      </header>
      {summary.error && (
        <p role="alert" className="text-sm text-destructive">
          {summary.error.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-[#666666] bg-[#f9f9f9] p-5">
            <p className="text-xs tracking-[0.14em] uppercase text-ink-muted">{m.label}</p>
            <p className="mt-2 font-display text-4xl text-gold">{m.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-[#666666] bg-[#f9f9f9] shadow-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#555555] bg-[#666666] rounded-t-xl px-5 py-4">
          <h2 className="truncate font-display text-xl text-white">Recent orders</h2>
          <Link
            to="/admin/orders"
            className="shrink-0 text-xs tracking-[0.14em] uppercase text-white/80 hover:text-white"
          >
            View all
          </Link>
        </div>
        {todaysOrders.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-muted">
            No orders in the last 24 hours.
          </p>
        ) : (
          <ul className="divide-y divide-stone">
            {todaysOrders.slice(0, 6).map((o) => (
              <li
                key={o.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{o.customerName}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {o.productName}
                    {o.variantLabel ? ` — ${o.variantLabel}` : ""} ·{" "}
                    {new Date(o.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={o.status === "New" ? "default" : "secondary"}>{o.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="border-t border-stone pt-4 text-sm">
        <h2 className="font-semibold">Notifications</h2>
        {queue.error ? (
          <p role="alert">{queue.error.message}</p>
        ) : (
          <p className="mt-2 text-ink-muted">
            Pending: {queue.data?.pending ?? "-"} | Processing: {queue.data?.processing ?? "-"} |
            Failed: {queue.data?.failed ?? "-"}
          </p>
        )}
        {queue.data?.failedJobs.map((job) => (
          <div
            key={job.id}
            className="mt-2 flex items-center justify-between gap-3 border-b border-stone py-2"
          >
            <span>
              #{job.id} | {job.error_code} | {job.attempts} attempts
            </span>
            <Button
              size="icon"
              variant="outline"
              title="Retry notification"
              aria-label="Retry notification"
              onClick={async () => {
                if (
                  !window.confirm(
                    `Retry notification #${job.id}? Delivery with an unknown outcome older than 24 hours may be repeated.`,
                  )
                )
                  return;
                const { error } = await supabase.rpc("retry_notification_job_v1", {
                  p_job_id: job.id,
                });
                if (error) toast.error("Notification could not be retried.");
                else {
                  toast.success("Notification queued again.");
                  void queue.refetch();
                }
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
