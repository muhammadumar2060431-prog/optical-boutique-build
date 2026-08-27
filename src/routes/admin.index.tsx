import { Link, createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { products, categories, orders, getInventoryRows } = useStore();
  const rows = getInventoryRows();
  const lowStock = rows.filter((r) => r.status !== "In stock");
  const newOrders = orders.filter((o) => o.status === "New");

  const metrics = [
    { label: "Total products", value: products.length },
    { label: "Categories", value: categories.length },
    { label: "New orders", value: newOrders.length },
    { label: "Stock alerts", value: lowStock.length },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow text-gold">Overview</p>
        <h1 className="mt-2 font-display text-3xl">Dashboard</h1>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-stone bg-card p-5">
            <p className="text-xs tracking-[0.14em] uppercase text-ink-muted">{m.label}</p>
            <p className="mt-2 font-display text-4xl text-gold">{m.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-stone bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-stone px-5 py-4">
          <h2 className="truncate font-display text-xl">Recent orders</h2>
          <Link to="/admin/orders" className="shrink-0 text-xs tracking-[0.14em] uppercase text-gold">
            View all
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-muted">
            No orders yet — new WhatsApp and contact-form enquiries will appear here automatically.
          </p>
        ) : (
          <ul className="divide-y divide-stone">
            {orders.slice(0, 6).map((o) => (
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
    </div>
  );
}
