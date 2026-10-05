import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageFaqs } from "@/components/site/PageFaqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart";
import { formatPrice, newOrderReference, useStore } from "@/lib/store";
import { saveOrderReceipt } from "@/lib/last-order";
import {
  createMetaEventId,
  splitMetaName,
  trackMetaBrowserEvent,
  trackMetaEvent,
} from "@/lib/meta-events";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Nigah Boutique Eyewear" },
      {
        name: "description",
        content:
          "Complete your eyewear order. Our optical team reviews every prescription and order detail for precision delivery.",
      },
      { property: "og:title", content: "Checkout — Nigah Boutique Eyewear" },
      {
        property: "og:description",
        content: "Confirm your delivery details and place your order.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: getSiteUrl("/checkout") },
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
    .regex(/^[\p{L}\p{M}'\-.\s]+$/u, {
      message: "Name can only contain letters, spaces and - ' .",
    }),
  email: z
    .string()
    .trim()
    .min(1, { message: "Email address is required." })
    .max(255, { message: "Email must be under 255 characters." })
    .email({ message: "Enter a valid email address, e.g. name@example.com." }),
  phone: z
    .string()
    .trim()
    .min(1, { message: "Phone number is required." })
    .max(24, { message: "Phone number is too long." })
    .regex(phonePattern, { message: "Enter a valid phone number, e.g. +92 300 1234567." }),
  address: z
    .string()
    .trim()
    .min(5, { message: "Please provide your full delivery address." })
    .max(500, { message: "Address must be under 500 characters." }),
  notes: z.string().trim().max(500, { message: "Notes must be under 500 characters." }),
});

type FieldName = "name" | "email" | "phone" | "address" | "notes";
type Errors = Partial<Record<FieldName, string>>;

function CheckoutPage() {
  const { items, subtotal, clearCart, hydrated } = useCart();
  const { addOrders, getStockFor } = useStore();
  const navigate = useNavigate();

  const [values, setValues] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef("checkout:" + crypto.randomUUID());
  const purchaseEventIdRef = useRef(createMetaEventId("purchase"));
  const initiateCheckoutTrackedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || items.length === 0 || initiateCheckoutTrackedRef.current) return;
    initiateCheckoutTrackedRef.current = true;
    trackMetaEvent({
      eventName: "InitiateCheckout",
      customData: {
        value: subtotal,
        currency: "PKR",
        contentIds: items.map((item) => item.productId),
        contentType: "product",
        contentName: "Shopping bag checkout",
        numItems: items.reduce((total, item) => total + item.qty, 0),
      },
    });
  }, [hydrated, items, subtotal]);

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

  const placeOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setTouched({ name: true, email: true, phone: true, address: true, notes: true });
    if (Object.keys(found).length > 0 || items.length === 0 || stockBlocked) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const reference = newOrderReference();
    const { firstName, lastName } = splitMetaName(values.name);
    const purchaseEvent = {
      eventName: "Purchase" as const,
      eventId: purchaseEventIdRef.current,
      eventSourceUrl: window.location.href,
      userData: {
        email: values.email,
        phone: values.phone,
        firstName,
        ...(lastName ? { lastName } : {}),
        externalId: reference,
      },
      customData: {
        value: subtotal,
        currency: "PKR",
        contentIds: items.map((item) => item.productId),
        contentType: "product",
        contentName: "Order " + reference,
        numItems: items.reduce((total, item) => total + item.qty, 0),
      },
    };
    const contact = [values.phone.trim(), values.email.trim()].filter(Boolean).join(" · ");

    const savedOrders = await addOrders(
      items.map((item) => ({
        customerName: values.name.trim(),
        contact,
        productId: item.productId,
        productName: item.name,
        variantId: item.variantId,
        variantLabel: item.variantLabel,
        quantity: item.qty,
        message: [
          `Checkout order ${reference} — quantity ${item.qty} (${formatPrice(item.price * item.qty)}).`,
          `Delivery address: ${values.address.trim()}`,
          values.notes.trim() ? `Customer notes: ${values.notes.trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        reference,
        source: "cart",
        stockDeducted: false,
      })),
      idempotencyKeyRef.current,
      purchaseEvent,
    );

    if (!savedOrders) {
      submittingRef.current = false;
      setSubmitting(false);
      toast.error("Your order could not be saved. Please try again.");
      return;
    }
    saveOrderReceipt({
      reference,
      placedAt: new Date().toISOString(),
      customerName: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      address: values.address.trim(),
      notes: values.notes.trim(),
      lines: items.map((i) => ({
        name: i.name,
        variantLabel: i.variantLabel,
        qty: i.qty,
        price: i.price,
      })),
      subtotal,
    });
    trackMetaBrowserEvent(purchaseEvent);
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
          <PageFaqs page="checkout" />
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
      <div className="mx-auto w-full max-w-5xl overflow-x-clip px-4 py-10 sm:px-6 sm:py-16">
        <p className="eyebrow text-gold">Almost there</p>
        <h1 className="mt-2 font-display text-4xl tracking-normal sm:text-5xl">Checkout</h1>

        <div className="mt-8 grid min-w-0 gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <form onSubmit={placeOrder} noValidate className="min-w-0 space-y-5">
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
            <div className="space-y-2">
              <Label htmlFor="co-address">Delivery address</Label>
              <Textarea
                id="co-address"
                value={values.address}
                onChange={(e) => setField("address", e.target.value)}
                onBlur={() => blurField("address")}
                aria-invalid={Boolean(touched.address && errors.address)}
                aria-describedby={describedBy("address")}
                rows={3}
                maxLength={500}
                placeholder="House no., street, area, city..."
              />
              {fieldError("address")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-notes">Order notes (optional)</Label>
              <Textarea
                id="co-notes"
                value={values.notes}
                onChange={(e) => setField("notes", e.target.value)}
                onBlur={() => blurField("notes")}
                aria-invalid={Boolean(touched.notes && errors.notes)}
                aria-describedby={describedBy("notes")}
                rows={2}
                maxLength={500}
                placeholder="Prescription details, preferred contact time…"
              />
              {fieldError("notes")}
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
              disabled={stockBlocked || submitting}
              className="min-h-12 w-full max-w-full rounded-full px-6 text-sm sm:w-auto sm:px-10"
            >
              {submitting ? "Saving order..." : "Place order"}
            </Button>
            <p className="mt-1 block text-xs leading-snug text-ink-muted">
              No payment is taken online — our team confirms your order and arranges payment on
              delivery or in the showroom.
            </p>
          </form>

          <div className="min-w-0">
            <aside className="h-fit min-w-0 max-w-full overflow-hidden rounded-xl border border-stone bg-mist p-4 sm:p-6">
              <h2 className="font-display text-2xl tracking-normal">Order summary</h2>
              <ul className="mt-4 space-y-4 text-sm">
                {stockLines.map(({ item, stock }) => (
                  <li
                    key={item.key}
                    className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3"
                  >
                    <span className="min-w-0 pr-1">
                      <span className="block min-w-0 break-words leading-snug">{item.name}</span>
                      <span className="mt-1 block text-xs leading-snug text-ink-muted">
                        {item.variantLabel ? `${item.variantLabel} · ` : ""}Qty {item.qty}
                      </span>
                      {(stock <= 0 || item.qty > stock) && (
                        <span className="block text-xs font-semibold text-destructive">
                          {stock <= 0 ? "Out of stock" : `Only ${stock} left`}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-right text-sm font-semibold">
                      {formatPrice(item.price * item.qty)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex min-w-0 justify-between gap-4 border-t border-stone pt-4 text-sm">
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
            <PageFaqs page="checkout" />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
