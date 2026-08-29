import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart";
import { formatPrice, useStore } from "@/lib/store";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — OPTIQUE Eyewear" },
      {
        name: "description",
        content:
          "Confirm your details and place your OPTIQUE order — our opticians confirm every order personally.",
      },
      { property: "og:title", content: "Checkout — OPTIQUE Eyewear" },
      {
        property: "og:description",
        content: "Confirm your details and place your eyewear order.",
      },
    ],
  }),
  component: CheckoutPage,
});

interface Errors {
  name?: string;
  contact?: string;
}

function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { addOrder } = useStore();

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [placed, setPlaced] = useState<string | null>(null);

  const validate = () => {
    const next: Errors = {};
    if (!name.trim()) next.name = "Please tell us your name.";
    const value = contact.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const validPhone = /^[+0-9][0-9\s-]{7,}$/.test(value);
    if (!value) next.contact = "A phone number or email is required.";
    else if (!validEmail && !validPhone) next.contact = "Enter a valid phone number or email.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const placeOrder = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate() || items.length === 0) return;

    const reference = `OPT-${Date.now().toString().slice(-6)}`;
    for (const item of items) {
      addOrder({
        customerName: name.trim(),
        contact: contact.trim(),
        productId: item.productId,
        productName: item.name,
        variantId: item.variantId,
        variantLabel: item.variantLabel,
        message: [
          `Checkout order ${reference} — quantity ${item.qty} (${formatPrice(item.price * item.qty)}).`,
          notes.trim() ? `Customer notes: ${notes.trim()}` : "",
        ]
          .filter(Boolean)
          .join(" "),
        source: "cart",
      });
    }
    clearCart();
    setPlaced(reference);
  };

  if (placed) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
          <CheckCircle2 className="mx-auto h-10 w-10 text-gold" />
          <h1 className="mt-6 font-display text-4xl">Order placed</h1>
          <p className="mt-3 text-sm text-ink-muted">
            Reference <span className="font-semibold text-ink">{placed}</span>. Thanks — an
            optician will confirm availability and delivery with you shortly on WhatsApp or email.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-xs tracking-[0.18em] uppercase text-primary-foreground"
          >
            Back to home
          </Link>
        </div>
      </SiteLayout>
    );
  }

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
          <h1 className="font-display text-4xl">Nothing to check out</h1>
          <p className="mt-3 text-sm text-ink-muted">
            Your bag is empty. Add a frame or lens and your order summary will appear here.
          </p>
          <Link
            to="/glasses"
            className="mt-8 inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-xs tracking-[0.18em] uppercase text-primary-foreground"
          >
            Browse the collection
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="eyebrow text-gold">Almost there</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Checkout</h1>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
          <form onSubmit={placeOrder} noValidate className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="co-name">Full name</Label>
              <Input
                id="co-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-11"
                placeholder="Ayesha Khan"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-contact">Phone or email</Label>
              <Input
                id="co-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="min-h-11"
                placeholder="+92 300 1234567"
              />
              {errors.contact && <p className="text-xs text-destructive">{errors.contact}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-notes">Delivery address or notes (optional)</Label>
              <Textarea
                id="co-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Prescription details, delivery address, preferred contact time…"
              />
            </div>
            <Button type="submit" size="lg" className="min-h-12 w-full rounded-full sm:w-auto sm:px-10">
              Place order
            </Button>
            <p className="text-xs text-ink-muted">
              No payment is taken online — our team confirms your order and arranges payment on
              delivery or in the showroom.
            </p>
          </form>

          <aside className="h-fit rounded-xl border border-stone bg-mist p-6">
            <h2 className="font-display text-2xl">Order summary</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {items.map((item) => (
                <li key={item.key} className="flex justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block truncate">{item.name}</span>
                    <span className="text-xs text-ink-muted">
                      {item.variantLabel ? `${item.variantLabel} · ` : ""}Qty {item.qty}
                    </span>
                  </span>
                  <span className="font-semibold whitespace-nowrap">
                    {formatPrice(item.price * item.qty)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex justify-between border-t border-stone pt-4 text-sm">
              <span className="text-ink-muted">Subtotal</span>
              <span className="font-semibold text-gold">{formatPrice(subtotal)}</span>
            </div>
            <Link
              to="/cart"
              className="mt-4 block text-xs tracking-[0.16em] uppercase text-ink-muted transition-colors hover:text-gold"
            >
              Edit bag
            </Link>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}
