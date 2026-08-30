import { useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Mail, MessageCircle, PackageSearch, Phone } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { whatsappLink } from "@/lib/whatsapp";
import type { Order, OrderStatus } from "@/lib/types";

const CANONICAL = "https://optical-boutique-build.lovable.app/order-status";

export const Route = createFileRoute("/order-status")({
  validateSearch: (search: Record<string, unknown>) => ({
    ref: typeof search['ref'] === "string" ? (search['ref'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Track Your Order — OPTIQUE Eyewear" },
      {
        name: "description",
        content:
          "Enter your OPTIQUE order reference to see the current status of your frames or lenses, and contact our opticians directly.",
      },
      { property: "og:title", content: "Track Your Order — OPTIQUE" },
      {
        property: "og:description",
        content: "Look up an OPTIQUE order reference to check its status and reach our team.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: OrderStatusPage,
});

const statusCopy: Record<OrderStatus, { label: string; note: string; tone: string }> = {
  New: {
    label: "Received",
    note: "We have your order and an optician will confirm availability shortly.",
    tone: "bg-gold/15 text-gold",
  },
  Contacted: {
    label: "In progress",
    note: "Our team has reached out to confirm details, fitting or delivery.",
    tone: "bg-gold/15 text-gold",
  },
  Completed: {
    label: "Completed",
    note: "This order has been fulfilled. Thank you for choosing us.",
    tone: "bg-jet/10 text-ink",
  },
  Cancelled: {
    label: "Cancelled",
    note: "This order was cancelled. Message us if that looks wrong.",
    tone: "bg-destructive/10 text-destructive",
  },
};

function OrderStatusPage() {
  const search = useSearch({ from: "/order-status" });
  const { getOrdersByReference, settings } = useStore();

  const [value, setValue] = useState(search.ref ?? "");
  const [query, setQuery] = useState(search.ref?.trim() ?? "");
  const [error, setError] = useState<string | null>(null);

  const results: Order[] = query ? getOrdersByReference(query) : [];
  const searched = query.length > 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = value.trim();
    if (!next) {
      setError("Enter the order reference from your confirmation, e.g. OPT-204118.");
      setQuery("");
      return;
    }
    setError(null);
    setQuery(next);
  };

  const wa = whatsappLink(
    settings.whatsapp,
    `Hello ${settings.storeName}, I'd like an update on order ${query || "(reference)"}.`,
  );

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="eyebrow text-gold">Order tracking</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Check your order status</h1>
        <p className="mt-3 max-w-xl text-sm text-ink-muted">
          Enter the reference from your order confirmation (it looks like{" "}
          <span className="font-semibold text-ink">OPT-204118</span>) to see where your frames or
          lenses are.
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
              aria-describedby={error ? "order-ref-error" : undefined}
              aria-invalid={error ? true : undefined}
            />
            {error && (
              <p id="order-ref-error" role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
          <Button type="submit" className="min-h-11 rounded-full sm:mt-8 sm:px-8">
            Track order
          </Button>
        </form>

        <div aria-live="polite" className="mt-10">
          {searched && results.length === 0 && (
            <div className="rounded-xl border border-stone bg-card p-8 text-center">
              <PackageSearch className="mx-auto h-8 w-8 text-ink-muted" aria-hidden="true" />
              <h2 className="mt-4 font-display text-2xl">No order found</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
                We couldn't find an order with reference{" "}
                <span className="font-semibold text-ink">{query}</span>. Check the code from your
                confirmation, or message us and we'll find it for you.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <section aria-label={`Order ${query}`} className="rounded-xl border border-stone bg-card p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl">Order {results[0]!.reference}</h2>
                  <p className="text-xs text-ink-muted">
                    Placed{" "}
                    {new Date(results[0]!.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    · {results[0]!.customerName}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] tracking-[0.16em] uppercase ${statusCopy[results[0]!.status].tone}`}
                >
                  {statusCopy[results[0]!.status].label}
                </span>
              </div>

              <p className="mt-4 text-sm text-ink-muted">{statusCopy[results[0]!.status].note}</p>

              <ul className="mt-6 divide-y divide-stone border-t border-stone">
                {results.map((order) => (
                  <li key={order.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                    <span>
                      {order.productName}
                      {order.variantLabel ? ` — ${order.variantLabel}` : ""}
                    </span>
                    <span className="text-xs tracking-[0.14em] uppercase text-ink-muted">
                      {statusCopy[order.status].label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section aria-labelledby="order-help" className="mt-12 rounded-xl border border-stone bg-mist p-6 sm:p-8">
          <h2 id="order-help" className="font-display text-2xl">
            Need help with this order?
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Our opticians answer during showroom hours ({settings.hours}).
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gold px-6 text-xs tracking-[0.16em] uppercase text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp us
            </a>
            <a
              href={`tel:${settings.phone.replace(/[^0-9+]/g, "")}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone px-6 text-xs tracking-[0.16em] uppercase transition-colors hover:border-gold hover:text-gold"
            >
              <Phone className="h-4 w-4" aria-hidden="true" /> {settings.phone}
            </a>
            <a
              href={`mailto:${settings.email}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone px-6 text-xs tracking-[0.16em] uppercase transition-colors hover:border-gold hover:text-gold"
            >
              <Mail className="h-4 w-4" aria-hidden="true" /> Email
            </a>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
