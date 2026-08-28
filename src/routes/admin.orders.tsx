import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { Order, OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const statuses: OrderStatus[] = ["New", "Contacted", "Completed", "Cancelled"];

function AdminOrders() {
  const { orders, setOrderStatus } = useStore();
  const [status, setStatus] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (status !== "all" && o.status !== status) return false;
        if (source !== "all" && o.source !== source) return false;
        if (query) {
          const q = query.toLowerCase();
          if (!o.customerName.toLowerCase().includes(q) && !o.productName.toLowerCase().includes(q))
            return false;
        }
        return true;
      }),
    [orders, status, source, query],
  );

  const change = (order: Order, next: OrderStatus) => {
    setOrderStatus(order.id, next);
    setSelected((prev) => (prev && prev.id === order.id ? { ...prev, status: next } : prev));
    toast.success(
      next === "Completed"
        ? "Marked as sold — stock updated in Inventory."
        : next === "Cancelled"
          ? "Order cancelled — any deducted stock was returned."
          : `Order marked ${next}.`,
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-gold">Inbox</p>
        <h1 className="mt-2 font-display text-3xl">Orders & enquiries</h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          placeholder="Search customer or product"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-11"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="min-h-11">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="min-h-11">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="form">Contact form</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone bg-card px-6 py-16 text-center text-sm text-ink-muted">
          No orders yet — new WhatsApp and contact-form enquiries will appear here automatically.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-stone text-left text-xs tracking-[0.14em] uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className="cursor-pointer transition-colors hover:bg-mist"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{o.customerName}</p>
                    <p className="text-xs text-ink-muted">{o.contact}</p>
                  </td>
                  <td className="px-4 py-3">
                    {o.productName}
                    {o.variantLabel ? ` — ${o.variantLabel}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={o.source === "whatsapp" ? "default" : "secondary"}>
                      {o.source === "whatsapp" ? "WhatsApp" : "Form"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={o.status === "New" ? "default" : "outline"}>{o.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{selected.customerName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="text-ink-muted">{selected.contact}</p>
                <p>
                  <span className="text-ink-muted">Product: </span>
                  {selected.productName}
                  {selected.variantLabel ? ` — ${selected.variantLabel}` : ""}
                </p>
                <p>
                  <span className="text-ink-muted">Received: </span>
                  {new Date(selected.createdAt).toLocaleString()}
                </p>
                <p className="rounded-md bg-mist p-3">{selected.message}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {statuses.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={selected.status === s ? "default" : "outline"}
                      className="min-h-11"
                      onClick={() => change(selected, s)}
                    >
                      {s === "Completed" ? "Mark as Sold" : s}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
