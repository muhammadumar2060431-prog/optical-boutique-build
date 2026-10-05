import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, RefreshCw, RotateCcw, ShieldCheck, XCircle } from "lucide-react";

import { Reveal } from "@/components/site/Reveal";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useStore } from "@/lib/store";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/returns-policy")({
  head: () => ({
    meta: [
      { title: "Returns, Replacements & Refund Policy - Nigah Eyewear" },
      {
        name: "description",
        content:
          "Our 7-day hassle-free replacement guarantee, custom prescription lens guarantee, exchange guidelines, and return procedures at Nigah Optical Boutique.",
      },
      { property: "og:title", content: "Returns, Replacements & Refund Policy - Nigah Eyewear" },
      {
        property: "og:description",
        content:
          "Transparent 7-day exchange, prescription accuracy guarantee, and returns process.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: getSiteUrl("/returns-policy") },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/returns-policy") }],
  }),
  component: ReturnsPolicyPage,
});

function ReturnsPolicyPage() {
  const { settings } = useStore();

  return (
    <SiteLayout>
      <div className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-block max-w-full rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-800 sm:px-3.5 sm:text-[11px] sm:tracking-[0.2em] mb-4">
                Peace of Mind Guarantee
              </span>
              <h1 className="font-display text-3xl font-semibold leading-tight tracking-normal text-black sm:text-5xl sm:tracking-tight">
                Returns & Exchange Policy
              </h1>
              <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed">
                At Nigah, we stand behind the optical accuracy and craftsmanship of every frame and
                lens we dispense. Here is our straightforward replacement and refund policy.
              </p>
            </div>
          </Reveal>

          {/* Quick Pillars Grid */}
          <Reveal delay={100}>
            <div className="grid gap-6 sm:grid-cols-3 mb-16">
              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <RotateCcw className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">7-Day Replacement</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Exchange any ready-to-wear frame or sunglasses within 7 calendar days of receipt.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <ShieldCheck className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">
                  100% Prescription Accuracy
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Free lens remake if there is any optical power deviation from your doctor's slip.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <RefreshCw className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">
                  Fast WhatsApp Support
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Initiate replacement claims in minutes by sharing order details on our WhatsApp
                  concierge.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Detailed Content */}
          <div className="space-y-12 text-zinc-800 leading-relaxed">
            {/* Section 1 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-xl font-semibold leading-snug text-black sm:text-2xl">
                1. 7-Day Frame & Sunglasses Replacement
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                If your selected eyeglasses frame or sunglasses do not fit your facial contour
                comfortably or you wish to switch to another design:
              </p>
              <ul className="space-y-2 text-sm text-zinc-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    The item must be in{" "}
                    <strong className="text-black">original, unworn, brand-new condition</strong>{" "}
                    without any scratches or frame warping.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Must include the original protective hard box, micro-fiber lens cloth, and
                    product certificate.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Contact us within 7 days of package delivery to obtain a return authorization
                    number.
                  </span>
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-xl font-semibold leading-snug text-black sm:text-2xl">
                2. Custom Prescription Lenses Policy
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                Prescription lenses are custom-crafted and cut exclusively according to your
                individual ophthalmic parameters (Sphere, Cylinder, Axis, and Pupillary Distance).
              </p>
              <ul className="space-y-2 text-sm text-zinc-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-black">Optical Guarantee:</strong> If the delivered
                    lenses do not match the prescription slip you provided, we will re-manufacture
                    and replace your lenses at zero extra cost.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>
                    Because prescription lenses cannot be re-used for other patients, custom lenses
                    cannot be returned for cash refunds unless an optical manufacturing error
                    occurred.
                  </span>
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-xl font-semibold leading-snug text-black sm:text-2xl">
                3. Damaged in Transit or Defective Items
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                In the rare event that your eyewear arrives damaged, scratched, or defective:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-zinc-700">
                <li>
                  Send clear photographs or a short video showing the damaged part to our WhatsApp
                  helpline within <strong className="text-black">48 hours</strong> of delivery.
                </li>
                <li>
                  Our optical team will immediately review your case and dispatch a fresh
                  replacement pair without waiting for prolonged claim procedures.
                </li>
              </ol>
            </section>

            {/* Section 4 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-xl font-semibold leading-snug text-black sm:text-2xl">
                4. Step-by-Step Return Process
              </h2>
              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div className="rounded-xl border border-stone-200 p-4 bg-stone-50/50">
                  <span className="font-bold text-xs text-stone-500 block mb-1">STEP 1</span>
                  <p className="font-semibold text-sm text-black mb-1">Notify Us</p>
                  <p className="text-xs text-zinc-600">
                    Contact our WhatsApp with your Order Reference ID (e.g. OPT-XXXXXX).
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200 p-4 bg-stone-50/50">
                  <span className="font-bold text-xs text-stone-500 block mb-1">STEP 2</span>
                  <p className="font-semibold text-sm text-black mb-1">Pack Securely</p>
                  <p className="text-xs text-zinc-600">
                    Place frames in original hard box with protective wrap and send to our Lahore
                    boutique.
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200 p-4 bg-stone-50/50">
                  <span className="font-bold text-xs text-stone-500 block mb-1">STEP 3</span>
                  <p className="font-semibold text-sm text-black mb-1">Inspection & Exchange</p>
                  <p className="text-xs text-zinc-600">
                    Upon receiving the item, our team inspects it and dispatches your replacement or
                    processes store credit within 48 hours.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold leading-snug text-black sm:text-2xl">
                5. Refund Method & Processing Time
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                Approved refunds are processed via{" "}
                <strong className="text-black">
                  Direct Online Bank Transfer, JazzCash, EasyPaisa, or Nigah Store Credit Voucher
                </strong>{" "}
                within 3 to 5 business days after our quality assurance team verifies the returned
                parcel.
              </p>
            </section>
          </div>

          {/* Help Box */}
          <div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl border border-stone-300 bg-stone-50 p-5 sm:mt-16 sm:flex-row sm:gap-6 sm:p-8">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-display text-lg font-semibold text-black">
                Need assistance with a replacement or return?
              </h4>
              <p className="text-xs text-zinc-600">
                Our customer team is ready to guide you step-by-step.
              </p>
            </div>
            <a
              href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-full bg-[#25D366] px-5 text-center text-xs font-bold uppercase tracking-[0.1em] text-white shadow-md hover:bg-[#20BA5A] sm:w-auto sm:px-6 sm:tracking-[0.16em] shrink-0"
            >
              WhatsApp Support
            </a>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
