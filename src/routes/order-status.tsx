/* eslint-disable @typescript-eslint/no-explicit-any -- Public RPC order rows are normalized at this route boundary. */
import { useState, useEffect } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  PackageSearch,
  Phone,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageFaqs } from "@/components/site/PageFaqs";
import { WhatsAppIcon } from "@/components/site/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCourierTrackingUrl } from "@/lib/couriers";
import { useStore } from "@/lib/store";
import { whatsappLink } from "@/lib/whatsapp";
import type { Order, OrderStatus, Product } from "@/lib/types";
import { getSiteUrl } from "@/lib/utils";

const CANONICAL = getSiteUrl("/order-status");

type TrackedOrder = Order & {
  productImage?: string | null;
  productSlug?: string | null;
  productPrice?: number | null;
  productSku?: string | null;
  productDescription?: string | null;
};

export const Route = createFileRoute("/order-status")({
  validateSearch: (search: Record<string, unknown>) => ({
    ref: typeof search["ref"] === "string" ? (search["ref"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Track Your Order — Nigah Eyewear" },
      {
        name: "description",
        content:
          "Enter your Nigah order reference to see live courier tracking and status of your frames or lenses.",
      },
      { property: "og:title", content: "Track Your Order — Nigah" },
      {
        property: "og:description",
        content:
          "Look up an Nigah order reference to check its status, live courier tracking, and reach our team.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: OrderStatusPage,
});

const statusCopy: Record<OrderStatus, { label: string; note: string; tone: string; step: number }> =
  {
    New: {
      label: "Order Received",
      note: "We have received your order. Our optician team is preparing your frames.",
      tone: "bg-blue-50 text-blue-700 border-blue-200",
      step: 1,
    },
    Contacted: {
      label: "Order Confirmed",
      note: "Your order and prescription details have been confirmed.",
      tone: "bg-amber-50 text-amber-700 border-amber-200",
      step: 2,
    },
    Dispatched: {
      label: "Dispatched",
      note: "Your parcel is on its way via our trusted courier partner.",
      tone: "bg-indigo-50 text-indigo-700 border-indigo-200",
      step: 3,
    },
    Completed: {
      label: "Delivered & Completed",
      note: "This order has been fulfilled. Thank you for choosing Nigah.",
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
      step: 4,
    },
    Cancelled: {
      label: "Cancelled",
      note: "This order was cancelled. Message us on WhatsApp if that looks incorrect.",
      tone: "bg-destructive/10 text-destructive border-destructive/20",
      step: 0,
    },
  };

const getStatusInfo = (status?: string) => {
  if (!status) return statusCopy.New;
  const key = (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()) as OrderStatus;
  return statusCopy[key] || statusCopy.New;
};

/** Map a raw Supabase order row to the Order store type */
function mapRawToOrder(o: any): TrackedOrder {
  return {
    id: o.id,
    reference:
      o.reference ||
      o.items?.[0]?.reference ||
      (o.id ? `OPT-${String(o.id).slice(0, 6).toUpperCase()}` : "OPT-ORDER"),
    createdAt: o.createdAt || o.created_at || new Date().toISOString(),
    customerName: o.customerName || o.customer_name || "Customer",
    contact: o.contact || o.phone || "",
    productId: o.productId || o.product_id || o.items?.[0]?.productId || null,
    productName: o.productName || o.product_name || o.items?.[0]?.productName || "Glasses",
    variantId: o.variantId || o.variant_id || o.items?.[0]?.variantId || null,
    variantLabel: o.variantLabel || o.variant_label || o.items?.[0]?.variantLabel || null,
    message: o.message || o.address || "",
    source: (o.source ||
      o.items?.[0]?.source ||
      ((o.productName || o.items?.[0]?.productName || "").toLowerCase().includes("whatsapp")
        ? "whatsapp"
        : "cart")) as any,
    status: (o.status
      ? o.status.charAt(0).toUpperCase() + o.status.slice(1).toLowerCase()
      : "New") as OrderStatus,
    stockDeducted: o.stockDeducted ?? true,
    courierName: o.courier_name || o.courierName || o.items?.[0]?.courierName || null,
    trackingNumber: o.tracking_number || o.trackingNumber || o.items?.[0]?.trackingNumber || null,
    dispatchedAt: o.dispatched_at || o.dispatchedAt || null,
    productImage:
      o.productImage ||
      o.product_image ||
      o.image ||
      o.items?.[0]?.productImage ||
      o.items?.[0]?.product_image ||
      o.items?.[0]?.image ||
      null,
    productSlug: o.productSlug || o.product_slug || o.items?.[0]?.productSlug || null,
    productPrice:
      Number(o.productPrice ?? o.product_price ?? o.items?.[0]?.productPrice ?? NaN) || null,
    productSku: o.productSku || o.sku || o.items?.[0]?.sku || null,
    productDescription: o.productDescription || o.description || o.items?.[0]?.description || null,
  };
}

function findProductForOrder(order: TrackedOrder, products: Product[]) {
  if (order.productId) {
    const byId = products.find((product) => product.id === order.productId);
    if (byId) return byId;
  }

  const normalizedName = order.productName.trim().toLowerCase();
  return products.find((product) => product.name.trim().toLowerCase() === normalizedName) ?? null;
}

function orderProductDetails(order: TrackedOrder, products: Product[]) {
  const product = findProductForOrder(order, products);
  const variant = product?.variants.find((item) => item.id === order.variantId) ?? null;
  const image =
    order.productImage ||
    variant?.image ||
    product?.image ||
    product?.subImages?.[0] ||
    "/placeholder.svg";
  const name = product?.name || order.productName || "Glasses";
  const price = order.productPrice ?? variant?.price ?? product?.price ?? null;
  const sku = order.productSku || product?.sku || null;
  const description =
    order.productDescription ||
    product?.description ||
    product?.details?.lensInfo ||
    "Premium eyewear prepared by Nigah.";

  return { product, variant, image, name, price, sku, description };
}

function formatOrderPrice(value: number | null) {
  if (!value || value <= 0) return null;
  return `Rs. ${value.toLocaleString("en-PK")}`;
}

/**
 * Order tracking uses the versioned API so validation, CORS, rate limiting,
 * logging, and the narrow database RPC remain server-side.
 */
async function fetchOrdersByRef(reference: string): Promise<TrackedOrder[]> {
  const trimmed = reference.trim();
  if (!trimmed) return [];

  const response = await fetch(`/api/v1/orders/track/${encodeURIComponent(trimmed)}`, {
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("Order lookup failed");

  const payload = (await response.json()) as { data?: unknown[] };
  return (payload.data ?? []).map(mapRawToOrder);
}
function OrderStatusPage() {
  const search = useSearch({ from: "/order-status" });

  // ✅ SECURITY FIX: Only pull `settings` from the global store.
  //    Previously `orders: allOrders` was also destructured here which loaded
  //    ALL customer orders into client JavaScript memory — any user could
  //    inspect them via browser DevTools. That exposure is now fully removed.
  const { settings, products } = useStore();

  const [value, setValue] = useState(search.ref ?? "");
  const [query, setQuery] = useState(search.ref?.trim() ?? "");
  const [results, setResults] = useState<TrackedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [searched, setSearched] = useState(false);

  // Auto-search when page loads with ?ref= in URL
  useEffect(() => {
    if (search.ref?.trim()) {
      const ref = search.ref.trim();
      setValue(ref);
      setQuery(ref);
      runSearch(ref);
    }
  }, [search.ref]);

  async function runSearch(ref: string) {
    setLoading(true);
    setSearched(true);
    setFetchError(null);
    setResults([]);
    try {
      const found = await fetchOrdersByRef(ref);
      setResults(found);
    } catch {
      setFetchError("Could not reach the server. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next = value.trim();
    if (!next) {
      setInputError("Enter the order reference from your confirmation, e.g. OPT-204118.");
      setQuery("");
      setResults([]);
      setSearched(false);
      return;
    }
    setInputError(null);
    setQuery(next);
    await runSearch(next);
  };

  const primaryOrder = results[0];
  const activeStatus = primaryOrder ? getStatusInfo(primaryOrder.status) : null;
  const courierTrackingUrl = primaryOrder
    ? getCourierTrackingUrl(primaryOrder.courierName, primaryOrder.trackingNumber)
    : null;

  const copyTrackingNumber = () => {
    if (!primaryOrder?.trackingNumber) return;
    navigator.clipboard.writeText(primaryOrder.trackingNumber);
    setCopiedTracking(true);
    toast.success("Tracking number copied to clipboard");
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const wa = whatsappLink(
    settings.whatsapp,
    `Hello ${settings.storeName}, I'd like an update on order ${query || "(reference)"}.`,
  );

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="eyebrow text-gold">Order tracking</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Check Your Order Status</h1>
        <p className="mt-3 max-w-xl text-sm text-ink-muted">
          Enter your order reference code (e.g.{" "}
          <span className="font-semibold text-ink">OPT-204118</span>) to view live progress, courier
          details, and dispatch updates.
        </p>

        <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 space-y-2">
            <Label htmlFor="order-ref">Order reference</Label>
            <Input
              id="order-ref"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="OPT-204118"
              autoComplete="off"
              className="min-h-11"
              aria-describedby={inputError ? "order-ref-error" : undefined}
              aria-invalid={inputError ? true : undefined}
            />
            {inputError && (
              <p id="order-ref-error" role="alert" className="text-xs text-destructive">
                {inputError}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="min-h-11 rounded-full sm:mt-8 sm:px-8"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? "Searching…" : "Track order"}
          </Button>
        </form>

        <div aria-live="polite" className="mt-10">
          {loading && (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-stone bg-card p-8 text-sm text-ink-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              Looking up your order…
            </div>
          )}

          {fetchError && !loading && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
              {fetchError}
            </div>
          )}

          {searched && !loading && !fetchError && results.length === 0 && (
            <div className="rounded-xl border border-stone bg-card p-8 text-center">
              <PackageSearch className="mx-auto h-8 w-8 text-ink-muted" aria-hidden="true" />
              <h2 className="mt-4 font-display text-2xl">No order found</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
                We couldn't find an order with reference{" "}
                <span className="font-semibold text-ink">{query}</span>. Double-check the code from
                your confirmation email or WhatsApp receipt, or contact us below and we'll help.
              </p>
            </div>
          )}

          {results.length > 0 && primaryOrder && activeStatus && (
            <section
              aria-label={`Order ${query}`}
              className="rounded-2xl border border-stone bg-card p-6 sm:p-8 space-y-6 shadow-sm"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone/50 pb-4">
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold">
                    Order {primaryOrder.reference}
                  </h2>
                  <p className="text-xs text-ink-muted mt-1">
                    Placed on{" "}
                    {new Date(primaryOrder.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    · {primaryOrder.customerName}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider border ${activeStatus.tone}`}
                >
                  {activeStatus.label}
                </span>
              </div>

              {/* Status Note */}
              <div className="rounded-xl bg-zinc-50 border border-stone/60 p-4">
                <p className="text-sm font-medium text-zinc-800">{activeStatus.note}</p>
              </div>

              {/* Visual Order Progress Timeline */}
              {primaryOrder.status !== "Cancelled" && (
                <div className="py-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-4">
                    Delivery Progress
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { step: 1, label: "Received" },
                      { step: 2, label: "Confirmed" },
                      { step: 3, label: "Dispatched" },
                      { step: 4, label: "Delivered" },
                    ].map((st) => {
                      const isDone = activeStatus.step >= st.step;
                      const isCurrent = activeStatus.step === st.step;
                      return (
                        <div key={st.step} className="flex flex-col items-center gap-2">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isDone
                                ? "bg-black text-white ring-4 ring-black/10"
                                : "bg-zinc-200 text-zinc-500 border border-zinc-300"
                            }`}
                          >
                            {isDone ? <Check className="h-4 w-4" /> : st.step}
                          </div>
                          <span
                            className={`text-xs font-semibold ${
                              isCurrent
                                ? "text-black font-bold"
                                : isDone
                                  ? "text-zinc-700"
                                  : "text-zinc-400"
                            }`}
                          >
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dedicated Courier & Tracking Card */}
              {(primaryOrder.courierName || primaryOrder.trackingNumber) && (
                <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                          Courier Partner
                        </p>
                        <p className="font-display text-lg font-bold text-indigo-950">
                          {primaryOrder.courierName || "Express Courier"}
                        </p>
                      </div>
                    </div>

                    {primaryOrder.dispatchedAt && (
                      <span className="text-xs font-medium text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full">
                        Dispatched {new Date(primaryOrder.dispatchedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {primaryOrder.trackingNumber && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3.5 border border-indigo-100">
                      <div>
                        <span className="text-[11px] font-semibold uppercase text-zinc-500 block">
                          Tracking Number / Consignment #
                        </span>
                        <span className="font-mono text-base font-bold text-zinc-900">
                          {primaryOrder.trackingNumber}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={copyTrackingNumber}
                          className="h-9 text-xs border-zinc-300"
                        >
                          {copiedTracking ? (
                            <>
                              <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1.5 h-3.5 w-3.5" />
                              Copy
                            </>
                          )}
                        </Button>

                        {courierTrackingUrl && (
                          <Button
                            asChild
                            size="sm"
                            className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                          >
                            <a href={courierTrackingUrl} target="_blank" rel="noreferrer noopener">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              Track on Courier Portal
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Items in Order */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
                  Items in this Order
                </p>
                <ul className="space-y-3">
                  {results.map((order) => {
                    const details = orderProductDetails(order, products);
                    const price = formatOrderPrice(details.price);
                    const itemStatus = getStatusInfo(order.status);
                    const variantLabel = details.variant?.label || order.variantLabel;

                    return (
                      <li
                        key={order.id}
                        className="grid gap-4 rounded-2xl border border-stone bg-white p-3.5 shadow-sm sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-xl border border-stone bg-mist sm:h-24 sm:w-24">
                          <img
                            src={details.image}
                            alt={details.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-xl font-bold leading-tight text-zinc-950">
                              {details.name}
                            </h3>
                            {variantLabel ? (
                              <span className="rounded-full border border-stone bg-zinc-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                                {variantLabel}
                              </span>
                            ) : null}
                          </div>

                          <p className="line-clamp-2 text-sm leading-6 text-ink-muted">
                            {details.description}
                          </p>

                          <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                            {details.sku ? <span>SKU {details.sku}</span> : null}
                            {order.productId ? <span>Product ID {order.productId}</span> : null}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
                          {price ? (
                            <span className="font-display text-lg font-bold text-zinc-950">
                              {price}
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${itemStatus.tone}`}
                          >
                            {itemStatus.label}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}
        </div>

        <section
          aria-labelledby="order-help"
          className="mt-12 rounded-xl border border-stone bg-mist p-6 sm:p-8"
        >
          <h2 id="order-help" className="font-display text-2xl">
            Need help with this order?
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Our opticians answer during showroom hours (
            {settings.hours || "Mon – Sat: 11:00 AM – 9:00 PM"}).
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20BA5A] px-6 text-xs font-bold tracking-[0.16em] uppercase text-white transition-transform hover:scale-[1.02] shadow-md"
            >
              <WhatsAppIcon className="h-4 w-4 text-white" /> WhatsApp us
            </a>
            <a
              href={`tel:${(settings.phone ?? "").replace(/[^0-9+]/g, "")}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone px-6 text-xs font-semibold tracking-[0.16em] uppercase text-ink transition-all duration-200 hover:bg-[#444444] hover:border-[#444444] hover:text-white"
            >
              <Phone className="h-4 w-4" aria-hidden="true" /> {settings.phone || "+92 300 0000000"}
            </a>
            <a
              href={`mailto:${settings.email}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone px-6 text-xs font-semibold tracking-[0.16em] uppercase text-ink transition-all duration-200 hover:bg-[#444444] hover:border-[#444444] hover:text-white"
            >
              <Mail className="h-4 w-4" aria-hidden="true" /> Email
            </a>
          </div>
        </section>
        <PageFaqs page="tracking" />
      </div>
    </SiteLayout>
  );
}
