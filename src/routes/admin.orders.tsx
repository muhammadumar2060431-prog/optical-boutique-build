import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Receipt,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";

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
import { WhatsAppIcon } from "@/components/site/WhatsAppIcon";
import { useStore } from "@/lib/store";
import type { Order, OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const statuses: OrderStatus[] = ["New", "Contacted", "Completed", "Cancelled"];

const statusConfig: Record<
  OrderStatus,
  { label: string; badgeClass: string; activeClass: string; dotClass: string }
> = {
  New: {
    label: "New",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    activeClass: "bg-blue-600 text-white border-blue-600 shadow-sm",
    dotClass: "bg-blue-500",
  },
  Contacted: {
    label: "Contacted",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    activeClass: "bg-amber-600 text-white border-amber-600 shadow-sm",
    dotClass: "bg-amber-500",
  },
  Completed: {
    label: "Sold",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
    dotClass: "bg-emerald-500",
  },
  Cancelled: {
    label: "Cancelled",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    activeClass: "bg-rose-600 text-white border-rose-600 shadow-sm",
    dotClass: "bg-rose-500",
  },
};

function parseOrderInfo(order: Order) {
  const rawParts = (order.contact || "").split("·").map((s) => s.trim()).filter(Boolean);
  let phone = "";
  let email = "";

  for (const part of rawParts) {
    if (part.includes("@")) {
      email = part;
    } else if (/[\d\s+\-()]{7,}/.test(part)) {
      phone = part;
    }
  }

  if (!phone && !email && order.contact) {
    if (order.contact.includes("@")) email = order.contact;
    else phone = order.contact;
  }

  const cleanDigits = phone.replace(/[^0-9]/g, "");
  let waNumber = cleanDigits;
  if (cleanDigits.startsWith("0")) {
    waNumber = "92" + cleanDigits.slice(1);
  }

  const lines = (order.message || "").split("\n").map((l) => l.trim()).filter(Boolean);
  let address = "";
  let notes = "";
  let itemSummary = "";
  const generalLines: string[] = [];

  for (const line of lines) {
    if (/^delivery address:\s*/i.test(line)) {
      address = line.replace(/^delivery address:\s*/i, "").trim();
    } else if (/^customer notes:\s*/i.test(line)) {
      notes = line.replace(/^customer notes:\s*/i, "").trim();
    } else if (/^checkout order\s*/i.test(line)) {
      itemSummary = line;
    } else {
      generalLines.push(line);
    }
  }

  return {
    phone,
    waNumber,
    email,
    address,
    notes,
    itemSummary,
    generalMessage: generalLines.join("\n"),
  };
}

function OrderDetailsModal({
  order,
  storeName,
  onStatusChange,
}: {
  order: Order;
  storeName: string;
  onStatusChange: (status: OrderStatus) => void;
}) {
  const { products } = useStore();
  const [copied, setCopied] = useState(false);
  const info = useMemo(() => parseOrderInfo(order), [order]);

  const matchedProduct = useMemo(() => {
    if (order.productId) {
      const found = products.find((p) => p.id === order.productId);
      if (found) return found;
    }
    return (
      products.find(
        (p) => p.name.trim().toLowerCase() === (order.productName || "").trim().toLowerCase(),
      ) || null
    );
  }, [order.productId, order.productName, products]);

  const matchedVariant = useMemo(() => {
    if (!matchedProduct) return null;
    if (order.variantId) {
      const found = matchedProduct.variants.find((v) => v.id === order.variantId);
      if (found) return found;
    }
    if (order.variantLabel) {
      return (
        matchedProduct.variants.find(
          (v) => v.label.trim().toLowerCase() === order.variantLabel?.trim().toLowerCase(),
        ) || null
      );
    }
    return null;
  }, [matchedProduct, order.variantId, order.variantLabel]);

  const productImage = matchedVariant?.image || matchedProduct?.image || null;

  const copyReference = () => {
    if (!order.reference) return;
    navigator.clipboard.writeText(order.reference);
    setCopied(true);
    toast.success("Order reference copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const waMessage = encodeURIComponent(
    `Hello ${order.customerName}, this is ${storeName} regarding your order ${order.reference}. Could we confirm your order details?`,
  );
  const waUrl = info.waNumber ? `https://wa.me/${info.waNumber}?text=${waMessage}` : null;

  const currentStatusCfg = statusConfig[order.status] || statusConfig.New;

  return (
    <div className="flex flex-col max-h-[85vh]">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#505050] via-[#666666] to-[#505050] border-b border-[#444444] px-6 py-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Reference pill */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-black/25 px-3 py-1 font-mono text-xs font-semibold tracking-wider text-white backdrop-blur-sm border border-white/10">
              <Receipt className="h-3.5 w-3.5 text-gold" />
              {order.reference || "NO-REF"}
            </span>
            <button
              type="button"
              onClick={copyReference}
              title="Copy Reference"
              className="grid h-7 w-7 place-items-center rounded-md text-zinc-200 transition-colors hover:bg-white/20 hover:text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Status & Source badges */}
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-black/25 border border-white/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-100">
              {order.source === "cart"
                ? "🛒 Checkout"
                : order.source === "whatsapp"
                  ? "💬 WhatsApp"
                  : "✉️ Form"}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${currentStatusCfg.badgeClass}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${currentStatusCfg.dotClass}`} />
              {currentStatusCfg.label}
            </span>
          </div>
        </div>

        {/* Customer headline */}
        <div className="mt-4 flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-lg font-bold text-white shadow-md">
            {order.customerName.charAt(0).toUpperCase() || "C"}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-bold text-white sm:text-2xl">
              {order.customerName}
            </h2>
            <div className="flex items-center gap-2 text-xs text-zinc-200">
              <Clock className="h-3.5 w-3.5 text-zinc-200" />
              <span>
                {new Date(order.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                at {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="overflow-y-auto p-6 space-y-5">
        {/* Quick Contact Bar */}
        {(info.phone || info.email) && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
              Customer Contact & Actions
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {info.phone && (
                <>
                  <a
                    href={`tel:${info.phone}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm transition-colors hover:bg-zinc-100"
                  >
                    <Phone className="h-3.5 w-3.5 text-zinc-500" />
                    {info.phone}
                  </a>
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-transform duration-150 hover:bg-[#20ba5a] active:scale-95"
                    >
                      <WhatsAppIcon className="h-4 w-4 fill-current text-white" />
                      Chat on WhatsApp
                    </a>
                  )}
                </>
              )}
              {info.email && (
                <a
                  href={`mailto:${info.email}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-100"
                >
                  <Mail className="h-3.5 w-3.5 text-zinc-500" />
                  {info.email}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Product & Order Items */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-2.5">
            <Package className="h-4 w-4 text-zinc-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Ordered Item
            </h3>
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Product Thumbnail */}
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-1 flex items-center justify-center shadow-xs">
                {productImage ? (
                  <img
                    src={productImage}
                    alt={order.productName}
                    className="h-full w-full object-contain transition-transform duration-200 hover:scale-105"
                  />
                ) : (
                  <Package className="h-6 w-6 text-zinc-400" />
                )}
              </div>

              <div className="min-w-0">
                <p className="font-bold text-zinc-900 text-base leading-snug">
                  {order.productName}
                </p>
                {order.variantLabel && (
                  <span className="mt-1 inline-block rounded-md bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                    Variant: {order.variantLabel}
                  </span>
                )}
              </div>
            </div>

            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              {order.stockDeducted ? "Stock deducted" : "Manual stock"}
            </span>
          </div>

          {info.itemSummary && (
            <div className="mt-3 rounded-lg bg-zinc-50 p-2.5 text-xs font-medium text-zinc-700 border border-zinc-100">
              {info.itemSummary}
            </div>
          )}
        </div>

        {/* Delivery Address Card */}
        {info.address && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-900 mb-1.5">
              <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Delivery Address
              </h3>
            </div>
            <p className="pl-6 text-sm font-medium text-zinc-800 leading-relaxed">
              {info.address}
            </p>
          </div>
        )}

        {/* Customer Notes Card */}
        {info.notes && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-900 mb-1.5">
              <FileText className="h-4 w-4 text-amber-600 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Customer Notes
              </h3>
            </div>
            <p className="pl-6 text-sm font-medium text-zinc-800 italic">
              "{info.notes}"
            </p>
          </div>
        )}

        {/* General Inquiry / Form Message */}
        {info.generalMessage && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-700 mb-1.5">
              <MessageSquare className="h-4 w-4 text-zinc-500 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Message / Inquiry
              </h3>
            </div>
            <p className="pl-6 text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
              {info.generalMessage}
            </p>
          </div>
        )}
      </div>

      {/* Footer Status Actions */}
      <div className="border-t border-zinc-200 bg-zinc-50/90 px-6 py-4">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-700">
            Update Order Status
          </p>
          <span className="text-[11px] text-zinc-500">
            Stock updates automatically on status change
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {statuses.map((s) => {
            const isCurrent = order.status === s;
            const cfg = statusConfig[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => onStatusChange(s)}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-200 border ${
                  isCurrent
                    ? cfg.activeClass
                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300"
                }`}
              >
                {isCurrent && <Check className="h-3.5 w-3.5 shrink-0" />}
                {s === "Completed" ? "Mark as Sold" : s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AdminOrders() {
  const { orders, setOrderStatus, settings } = useStore();
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
          if (
            !o.customerName.toLowerCase().includes(q) &&
            !o.productName.toLowerCase().includes(q) &&
            !(o.reference || "").toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      }),
    [orders, status, source, query],
  );

  const change = (order: Order, next: OrderStatus) => {
    if (
      !window.confirm(
        `Aap order "${order.reference}" ka status "${next}" karna chahte hain? (Are you sure you want to change status to ${next}?)`,
      )
    ) {
      return;
    }
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
          placeholder="Search customer, product or reference"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-11 bg-white border-zinc-300"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger
            aria-label="Filter by status"
            className="min-h-11 bg-white border-zinc-300"
          >
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
          <SelectTrigger
            aria-label="Filter by source"
            className="min-h-11 bg-white border-zinc-300"
          >
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="form">Contact form</SelectItem>
            <SelectItem value="cart">Checkout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#666666] bg-[#f9f9f9] px-6 py-16 text-center text-sm text-ink-muted">
          No orders yet — new WhatsApp and contact-form enquiries will appear here automatically.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#666666] bg-[#f9f9f9] shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b-2 border-[#555555] bg-[#666666] text-left text-xs tracking-[0.14em] uppercase text-white">
              <tr>
                <th className="px-4 py-3 text-white font-semibold">Ref</th>
                <th className="px-4 py-3 text-white font-semibold">Date</th>
                <th className="px-4 py-3 text-white font-semibold">Customer</th>
                <th className="px-4 py-3 text-white font-semibold">Product</th>
                <th className="px-4 py-3 text-white font-semibold">Source</th>
                <th className="px-4 py-3 text-white font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-300 bg-[#f9f9f9]">
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className="cursor-pointer transition-colors hover:bg-zinc-200/80"
                >
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs font-semibold text-zinc-900">
                    {o.reference || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-zinc-900">{o.customerName}</p>
                    <p className="text-xs text-ink-muted">{o.contact}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-900">{o.productName}</span>
                    {o.variantLabel ? <span className="text-zinc-600"> · {o.variantLabel}</span> : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={o.source === "whatsapp" ? "default" : "secondary"}>
                      {o.source === "whatsapp"
                        ? "WhatsApp"
                        : o.source === "cart"
                          ? "Checkout"
                          : "Form"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        o.status === "New"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : o.status === "Contacted"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : o.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {o.status === "Completed" ? "Sold" : o.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl overflow-hidden p-0 rounded-2xl border-zinc-200 bg-white shadow-2xl">
          {selected && (
            <OrderDetailsModal
              order={selected}
              storeName={settings.storeName}
              onStatusChange={(nextStatus) => change(selected, nextStatus)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
