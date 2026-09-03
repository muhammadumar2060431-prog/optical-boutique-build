import { useEffect, useState } from "react";
import { Link, createFileRoute, useSearch } from "@tanstack/react-router";
import { CheckCircle2, MessageCircle, PackageSearch } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { formatPrice, useStore } from "@/lib/store";
import { loadOrderReceipt, type OrderReceipt } from "@/lib/last-order";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/order-confirmation")({
  validateSearch: (search: Record<string, unknown>) => ({
    ref: typeof search['ref'] === "string" ? (search['ref'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Order Confirmed — OPTIQUE Eyewear" },
      {
        name: "description",
        content:
          "Your OPTIQUE order is confirmed. Review your items, total and next steps to reach our opticians on WhatsApp.",
      },
      { property: "og:title", content: "Order Confirmed — OPTIQUE Eyewear" },
      {
        property: "og:description",
        content: "Your order details, totals and next steps.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderConfirmationPage,
});

function OrderConfirmationPage() {
  const { ref } = useSearch({ from: "/order-confirmation" });
  const { settings, getOrdersByReference } = useStore();
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);

  useEffect(() => {
    setReceipt(loadOrderReceipt(ref));
  }, [ref]);

  const orders = ref ? getOrdersByReference(ref) : [];

  if (!ref) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
          <PackageSearch className="mx-auto h-10 w-10 text-ink-muted" aria-hidden="true" />
          <h1 className="mt-6 font-display text-4xl">No order to show</h1>
          <p className="mt-3 text-sm text-ink-muted">
            This page appears right after you place an order. Have a reference already? Track it on
            the order status page.
          </p>
          <Link
            to="/order-status"
            search={{ ref: undefined }}
            className="mt-8 inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-xs tracking-[0.18em] uppercase text-primary-foreground"
          >
            Track an order
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const lines =
    receipt?.lines ??
    orders.map((o) => ({
      name: o.productName,
      variantLabel: o.variantLabel,
      qty: 1,
      price: 0,
    }));
  const subtotal = receipt?.subtotal ?? 0;
  const customerName = receipt?.customerName ?? orders[0]?.customerName ?? "";

  const waMessage = `Hello ${settings.storeName}, I've just placed order ${ref}${
    customerName ? ` under the name ${customerName}` : ""
  }. Could you confirm availability and delivery?`;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-gold" aria-hidden="true" />
          <p className="eyebrow mt-4 text-gold">Order confirmed</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Thank you{customerName ? `, ${customerName.split(" ")[0]}` : ""}</h1>
          <p className="mt-3 text-sm text-ink-muted">
            Your reference is <span className="font-semibold text-ink">{ref}</span>. Keep it safe —
            you can check progress any time on the order status page.
          </p>
        </div>

        <section className="mt-10 rounded-xl border border-stone bg-card p-6">
          <h2 className="font-display text-2xl">Order details</h2>
          <ul className="mt-4 divide-y divide-stone text-sm">
            {lines.map((line, index) => (
              <li key={`${line.name}-${index}`} className="flex justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="block">{line.name}</span>
                  <span className="text-xs text-ink-muted">
                    {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.qty}
                  </span>
                </span>
                {line.price > 0 && (
                  <span className="font-semibold whitespace-nowrap">
                    {formatPrice(line.price * line.qty)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {subtotal > 0 && (
            <dl className="mt-4 space-y-2 border-t border-stone pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="font-semibold">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Delivery</dt>
                <dd className="text-ink-muted">Confirmed with you</dd>
              </div>
              <div className="flex justify-between border-t border-stone pt-2 text-base">
                <dt className="font-semibold">Total due</dt>
                <dd className="font-semibold text-gold">{formatPrice(subtotal)}</dd>
              </div>
            </dl>
          )}
          {receipt && (receipt.phone || receipt.email || receipt.notes) && (
            <div className="mt-5 border-t border-stone pt-4 text-sm text-ink-muted">
              {receipt.phone && <p>Phone: {receipt.phone}</p>}
              {receipt.email && <p>Email: {receipt.email}</p>}
              {receipt.notes && <p className="mt-2">Notes: {receipt.notes}</p>}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-stone bg-mist p-6 text-center">
          <h2 className="font-display text-2xl">Next step</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Message us on WhatsApp with your reference so an optician can confirm availability,
            fitting and delivery straight away.
          </p>
          <Button asChild size="lg" className="mt-5 min-h-12 rounded-full px-8">
            <a
              href={whatsappLink(settings.whatsapp, waMessage)}
              target="_blank"
              rel="noreferrer noopener"
            >
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Contact us on WhatsApp
            </a>
          </Button>
          <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs tracking-[0.16em] uppercase">
            <Link
              to="/order-status"
              search={{ ref }}
              className="text-ink-muted transition-colors hover:text-gold"
            >
              Track this order
            </Link>
            <Link to="/glasses" className="text-ink-muted transition-colors hover:text-gold">
              Continue shopping
            </Link>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
