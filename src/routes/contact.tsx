import { useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { CheckCircle2, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/contact")({
  validateSearch: (search: Record<string, unknown>) => ({
    product: typeof search['product'] === "string" ? (search['product'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Contact OPTIQUE — Book a Fitting or Ask an Optician" },
      {
        name: "description",
        content:
          "Message us on WhatsApp or send an enquiry. Showroom address, opening hours and direct contact details.",
      },
      { property: "og:title", content: "Contact OPTIQUE — Book a Fitting" },
      {
        property: "og:description",
        content: "Reach our opticians on WhatsApp, by phone or through the enquiry form.",
      },
    ],
  }),
  component: ContactPage,
});

interface Errors {
  name?: string;
  contact?: string;
  message?: string;
}

function ContactPage() {
  const search = useSearch({ from: "/contact" });
  const { settings, addOrder, products } = useStore();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [productRef, setProductRef] = useState(search.product ?? "");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const wa = whatsappLink(settings.whatsapp, `Hello ${settings.storeName}, I'd like some advice.`);

  const validate = () => {
    const next: Errors = {};
    if (!name.trim()) next.name = "Please tell us your name.";
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.trim());
    const isPhone = /^[+0-9][0-9\s-]{7,}$/.test(contact.trim());
    if (!contact.trim()) next.contact = "We need a phone number or email to reply.";
    else if (!isEmail && !isPhone) next.contact = "That doesn't look like a valid phone or email.";
    if (message.trim().length < 8) next.message = "Please add a little more detail.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const matched = products.find(
      (p) => p.name.toLowerCase() === productRef.trim().toLowerCase(),
    );
    addOrder({
      customerName: name.trim(),
      contact: contact.trim(),
      productId: matched?.id ?? null,
      productName: productRef.trim() || "General enquiry",
      variantId: null,
      variantLabel: null,
      message: message.trim(),
      source: "form",
    });
    setSent(true);
  };

  return (
    <SiteLayout>
      <section className="lens-halo bg-background py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow text-gold">Get in touch</p>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl">Talk to an optician</h1>
            <p className="mt-3 max-w-md text-sm text-ink-muted">
              Send us a note about a frame, a prescription or a repair — we usually reply the same
              working day.
            </p>

            {sent ? (
              <div className="mt-8 rounded-xl border border-stone bg-card p-8">
                <CheckCircle2 className="h-8 w-8 text-gold" />
                <h2 className="mt-4 font-display text-2xl">Thanks — message received</h2>
                <p className="mt-2 text-sm text-ink-muted">
                  We'll get back to you shortly on WhatsApp or email.
                </p>
                <Button
                  variant="outline"
                  className="mt-6 min-h-11 rounded-full"
                  onClick={() => {
                    setSent(false);
                    setName("");
                    setContact("");
                    setMessage("");
                    setProductRef("");
                  }}
                >
                  Send another
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="min-h-11"
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Phone or email</Label>
                  <Input
                    id="contact"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="min-h-11"
                  />
                  {errors.contact && <p className="text-xs text-destructive">{errors.contact}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productRef">Product reference (optional)</Label>
                  <Input
                    id="productRef"
                    value={productRef}
                    onChange={(e) => setProductRef(e.target.value)}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                </div>
                <Button type="submit" size="lg" className="min-h-12 rounded-full px-8">
                  Send enquiry
                </Button>
              </form>
            )}
          </div>

          <aside className="space-y-6">
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 rounded-xl bg-jet p-6 text-cream transition-transform duration-200 hover:scale-[1.01]"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold text-primary-foreground">
                <MessageCircle className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-xl">Chat on WhatsApp</span>
                <span className="block truncate text-xs text-cream/60">{settings.whatsapp}</span>
              </span>
            </a>

            <div className="space-y-4 rounded-xl border border-stone bg-card p-6 text-sm">
              <p className="eyebrow text-gold">Showroom</p>
              <p className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {settings.address}
              </p>
              <p className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {settings.phone}
              </p>
              <p className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span className="break-all">{settings.email}</span>
              </p>
              <p className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {settings.hours}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}
