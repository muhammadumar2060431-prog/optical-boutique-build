import { useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { CheckCircle2, Clock, Mail, MapPin, Phone } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageFaqs } from "@/components/site/PageFaqs";
import { WhatsAppIcon } from "@/components/site/WhatsAppIcon";
import { useWhatsAppModal } from "@/components/site/WhatsAppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { splitMetaName, trackMetaEvent } from "@/lib/meta-events";

import { breadcrumbSchema, jsonLdScript, webPageSchema } from "@/lib/schema";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/contact")({
  validateSearch: (search: Record<string, unknown>) => ({
    product: typeof search["product"] === "string" ? (search["product"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Contact Nigah — Expert Optician Support & Inquiries" },
      {
        name: "description",
        content:
          "Connect with Nigah optical specialists via WhatsApp, email, or inquiry form for personalized frame fittings, lens advice, and order assistance.",
      },
      { property: "og:title", content: "Contact Nigah — Expert Optician Support & Inquiries" },
      {
        property: "og:description",
        content:
          "Connect with our optical specialists for personalized frame fittings and lens advice.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: getSiteUrl("/contact") },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/contact") }],
    scripts: [
      jsonLdScript([
        webPageSchema({
          path: "/contact",
          name: "Contact Nigah",
          description:
            "Contact Nigah optical specialists for frame fitting, lens advice, product inquiries, and order support.",
          type: "ContactPage",
        }),
        breadcrumbSchema([
          { name: "Home", url: getSiteUrl("/") },
          { name: "Contact", url: getSiteUrl("/contact") },
        ]),
      ]),
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
  const { settings, products } = useStore();
  const { openWhatsAppModal } = useWhatsAppModal();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [productRef, setProductRef] = useState(search.product ?? "");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    const matched = products.find((p) => p.name.toLowerCase() === productRef.trim().toLowerCase());
    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          productId: matched?.id ?? null,
          productName: productRef.trim() || "General enquiry",
          message: message.trim(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error?.message || "Your enquiry could not be sent.");
      }

      const { firstName, lastName } = splitMetaName(name);
      const contactValue = contact.trim();
      const isEmail = contactValue.includes("@");
      trackMetaEvent({
        eventName: "Lead",
        userData: {
          ...(isEmail ? { email: contactValue } : { phone: contactValue }),
          firstName,
          ...(lastName ? { lastName } : {}),
        },
        customData: {
          ...(matched ? { contentIds: [matched.id] } : {}),
          contentType: matched ? "product" : "service",
          contentName: productRef.trim() || "General enquiry",
        },
      });
      setSent(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Your enquiry could not be sent. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <section className="lens-halo bg-background py-10 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:gap-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow text-gold">Get in touch</p>
            <h1 className="mt-2 max-w-[12ch] font-display text-[2.45rem] leading-[1.05] tracking-normal sm:mt-3 sm:max-w-none sm:text-5xl sm:leading-[1.2]">
              Talk to an optician
            </h1>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted sm:text-sm">
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
              <form
                onSubmit={onSubmit}
                noValidate
                className="mt-7 min-w-0 space-y-4 sm:mt-8 sm:space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Ayesha Khan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="min-h-11 max-w-full text-sm placeholder:text-sm sm:text-base sm:placeholder:text-base"
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Phone or email</Label>
                  <Input
                    id="contact"
                    placeholder="e.g. +92 300 1234567 or your@email.com"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="min-h-11 max-w-full text-sm placeholder:text-sm sm:text-base sm:placeholder:text-base"
                  />
                  {errors.contact && <p className="text-xs text-destructive">{errors.contact}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productRef">Product reference (optional)</Label>
                  <Input
                    id="productRef"
                    placeholder="e.g. Aviator Classic, SKU, or model name"
                    value={productRef}
                    onChange={(e) => setProductRef(e.target.value)}
                    className="min-h-11 max-w-full text-sm placeholder:text-sm sm:text-base sm:placeholder:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    rows={4}
                    placeholder="Tell us what you need help with..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-32 max-w-full text-sm placeholder:text-sm sm:min-h-[60px] sm:text-base sm:placeholder:text-base"
                  />
                  {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                </div>
                {submitError && (
                  <p role="alert" className="text-sm text-destructive">
                    {submitError}
                  </p>
                )}
                <Button
                  type="submit"
                  size="lg"
                  className="min-h-12 w-full rounded-full px-8 text-sm sm:w-auto sm:text-sm"
                  disabled={submitting}
                >
                  {submitting ? "Sending..." : "Send enquiry"}
                </Button>
              </form>
            )}
          </div>

          <aside className="space-y-5 sm:space-y-6">
            <button
              type="button"
              onClick={() =>
                openWhatsAppModal({
                  productName: productRef ? `Inquiry: ${productRef}` : "General Contact Inquiry",
                })
              }
              className="flex w-full min-w-0 items-center gap-4 rounded-xl bg-jet p-5 text-left text-cream transition-transform duration-200 hover:scale-[1.01] cursor-pointer border-0 sm:p-6"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#25D366] text-white shadow-md">
                <WhatsAppIcon className="h-6 w-6 text-white" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-xl leading-tight tracking-normal">
                  Chat on WhatsApp
                </span>
                <span className="block truncate text-xs text-cream/60">{settings.whatsapp}</span>
              </span>
            </button>

            <div className="space-y-4 rounded-xl border border-stone bg-mist p-5 text-sm sm:p-6">
              <p className="eyebrow text-gold">Showroom</p>
              <p className="flex min-w-0 gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {settings.address}
              </p>
              <p className="flex min-w-0 gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {settings.phone}
              </p>
              <p className="flex min-w-0 gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span className="break-all">{settings.email}</span>
              </p>
              <p className="flex min-w-0 gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {settings.hours}
              </p>
            </div>
            <PageFaqs page="contact" />
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}
