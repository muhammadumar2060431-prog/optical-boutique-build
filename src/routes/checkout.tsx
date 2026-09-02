import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart";
import { formatPrice, newOrderReference, useStore } from "@/lib/store";
import { saveOrderReceipt } from "@/lib/last-order";

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
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://optical-boutique-build.lovable.app/checkout" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

const phonePattern = /^[+]?[0-9][0-9\s-]{7,19}$/;

const checkoutSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Please enter your full name (at least 2 characters)." })
    .max(80, { message: "Name must be under 80 characters." })
    .regex(/^[\p{L}\p{M}'\-.\s]+$/u, { message: "Name can only contain letters, spaces and - ' ." }),
  email: z
    .string()
    .trim()
    .max(255, { message: "Email must be under 255 characters." })
    .email({ message: "Enter a valid email address, e.g. name@example.com." })
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(24, { message: "Phone number is too long." })
    .regex(phonePattern, { message: "Enter a valid phone number, e.g. +92 300 1234567." })
    .or(z.literal("")),
  notes: z.string().trim().max(500, { message: "Notes must be under 500 characters." }),
});

type FieldName = "name" | "email" | "phone" | "notes";
type Errors = Partial<Record<FieldName, string>>;

function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { addOrder, getStockFor, adjustStock } = useStore();
  const navigate = useNavigate();

  const [values, setValues] = useState({ name: "", email: "", phone: "", notes: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});

  const stockLines = items.map((item) => ({
    item,
    stock: getStockFor(item.productId, item.variantId),
  }));
  const stockBlocked = stockLines.some(({ item, stock }) => stock <= 0 || item.qty > stock);

  const validate = (next = values): Errors => {
    const result = checkoutSchema.safeParse(next);
    const found: Errors = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0] as FieldName;
        if (!found[key]) found[key] = issue.message;
      }
    }
    if (!next.email.trim() && !next.phone.trim()) {
      found.phone = found.phone ?? "Give us at least one way to reach you — phone or email.";
      found.email = found.email ?? "Give us at least one way to reach you — phone or email.";
    }
    return found;
  };

  const setField = (field: FieldName, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (touched[field]) setErrors(validate(next));
  };

  const blurField = (field: FieldName) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate());
  };

  const placeOrder = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setTouched({ name: true, email: true, phone: true, notes: true });
    if (Object.keys(found).length > 0 || items.length === 0 || stockBlocked) return;

    const reference = newOrderReference();
    const contact = [values.phone.trim(), values.email.trim()].filter(Boolean).join(" · ");

    for (const item of items) {
      // Inventory comes down immediately so the item shows as unavailable right away.
      adjustStock(item.productId, item.variantId, -item.qty);
      addOrder({
        customerName: values.name.trim(),
        contact,
        productId: item.productId,
        productName: item.name,
        variantId: item.variantId,
        variantLabel: item.variantLabel,
        message: [
          `Checkout order ${reference} — quantity ${item.qty} (${formatPrice(item.price * item.qty)}).`,
          values.notes.trim() ? `Customer notes: ${values.notes.trim()}` : "",
        ]
          .filter(Boolean)
          .join(" "),
        reference,
        source: "cart",
        stockDeducted: true,
      });
    }
    saveOrderReceipt({
      reference,
      placedAt: new Date().toISOString(),
      customerName: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      notes: values.notes.trim(),
      lines: items.map((i) => ({
        name: i.name,
        variantLabel: i.variantLabel,
        qty: i.qty,
        price: i.price,
      })),
      subtotal,
    });
    clearCart();
    void navigate({ to: "/order-confirmation", search: { ref: reference } });
  };

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

  const fieldError = (field: FieldName) =>
    touched[field] && errors[field] ? (
      <p id={`co-${field}-error`} role="alert" className="text-xs text-destructive">
        {errors[field]}
      </p>
    ) : null;

  const describedBy = (field: FieldName) =>
    touched[field] && errors[field] ? `co-${field}-error` : undefined;

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
                value={values.name}
                onChange={(e) => setField("name", e.target.value)}
                onBlur={() => blurField("name")}
                aria-invalid={Boolean(touched.name && errors.name)}
                aria-describedby={describedBy("name")}
                className="min-h-11"
                placeholder="Ayesha Khan"
              />
              {fieldError("name")}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="co-phone">Phone number</Label>
                <Input
                  id="co-phone"
                  type="tel"
                  inputMode="tel"
                  value={values.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  onBlur={() => blurField("phone")}
                  aria-invalid={Boolean(touched.phone && errors.phone)}
                  aria-describedby={describedBy("phone")}
                  className="min-h-11"
                  placeholder="+92 300 1234567"
                />
                {fieldError("phone")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-email">Email address</Label>
                <Input
                  id="co-email"
                  type="email"
                  inputMode="email"
                  value={values.email}
                  onChange={(e) => setField("email", e.target.value)}
                  onBlur={() => blurField("email")}
                  aria-invalid={Boolean(touched.email && errors.email)}
                  aria-describedby={describedBy("email")}
                  className="min-h-11"
                  placeholder="ayesha@example.com"
                />
                {fieldError("email")}
              </div>
            </div>
            <p className="text-xs text-ink-muted">
              At least one contact method is required — we confirm every order personally.
            </p>
            <div className="space-y-2">
              <Label htmlFor="co-notes">Delivery address or notes (optional)</Label>
              <Textarea
                id="co-notes"
                value={values.notes}
                onChange={(e) => setField("notes", e.target.value)}
                onBlur={() => blurField("notes")}
                aria-invalid={Boolean(touched.notes && errors.notes)}
                aria-describedby={describedBy("notes")}
                rows={4}
                maxLength={500}
                placeholder="Prescription details, delivery address, preferred contact time…"
              />
              {fieldError("notes")}
              <p className="text-xs text-ink-muted">{values.notes.length}/500 characters</p>
            </div>
            {stockBlocked && (
              <p role="alert" className="text-xs font-semibold text-destructive">
                One or more items in your bag are no longer available in the requested quantity.{" "}
                <Link to="/cart" className="underline">
                  Review your bag
                </Link>
                .
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={stockBlocked}
              className="min-h-12 w-full rounded-full sm:w-auto sm:px-10"
            >
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
              {stockLines.map(({ item, stock }) => (
                <li key={item.key} className="flex justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block truncate">{item.name}</span>
                    <span className="text-xs text-ink-muted">
                      {item.variantLabel ? `${item.variantLabel} · ` : ""}Qty {item.qty}
                    </span>
                    {(stock <= 0 || item.qty > stock) && (
                      <span className="block text-xs font-semibold text-destructive">
                        {stock <= 0 ? "Out of stock" : `Only ${stock} left`}
                      </span>
                    )}
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
