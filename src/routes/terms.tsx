import { createFileRoute, Link } from "@tanstack/react-router";
import { FileCheck2, Gavel, Scale } from "lucide-react";

import { Reveal } from "@/components/site/Reveal";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions of Service - Nigah Eyewear" },
      {
        name: "description",
        content:
          "Official terms of service, optical prescription dispensing conditions, product warranties, pricing policies, and customer agreements for Nigah Optical Boutique.",
      },
      { property: "og:title", content: "Terms & Conditions - Nigah Eyewear" },
      {
        property: "og:description",
        content: "Complete terms of service and optical dispensing conditions.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: getSiteUrl("/terms") },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/terms") }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <div className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-block max-w-full rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-800 sm:px-3.5 sm:text-[11px] sm:tracking-[0.2em] mb-4">
                User Agreement & Legal Terms
              </span>
              <h1 className="font-display text-3xl font-semibold leading-tight tracking-normal text-black sm:text-5xl sm:tracking-tight">
                Terms & Conditions
              </h1>
              <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed">
                Welcome to Nigah. By browsing our digital catalog, placing an optical order, or
                submitting a prescription, you agree to the following terms and optical dispensing
                conditions.
              </p>
            </div>
          </Reveal>

          {/* Quick Pillars Grid */}
          <Reveal delay={100}>
            <div className="grid gap-6 sm:grid-cols-3 mb-16">
              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <FileCheck2 className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">
                  Prescription Accuracy
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Lenses are manufactured strictly to customer-provided doctor prescriptions.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <Scale className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">
                  Fair Pricing in PKR
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  All listed prices represent genuine retail prices in Pakistani Rupees (PKR).
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <Gavel className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">Governing Law</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Governed under the commercial and optical dispensing laws of Pakistan.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Policy Sections */}
          <div className="space-y-12 text-zinc-800 leading-relaxed">
            {/* Section 1 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-xl font-semibold leading-snug text-black sm:text-2xl">
                1. Store Ownership & Boutique Operations
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                This website is operated by Nigah Optical Boutique, located in Gulberg III, Lahore,
                Pakistan. Throughout the site, the terms "we", "us", and "our" refer to Nigah.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-xl font-semibold leading-snug text-black sm:text-2xl">
                2. Optical Prescriptions & Customer Responsibility
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-700">
                <li>
                  By submitting an eye prescription (via text parameters or doctor slip photo), the
                  customer warrants that the prescription is valid, unexpired (less than 2 years
                  old), and issued by a certified optometrist or ophthalmologist.
                </li>
                <li>
                  Nigah is not liable for visual discomfort resulting from incorrect or outdated
                  prescription values supplied by the customer.
                </li>
                <li>
                  Our dispensing opticians reserve the right to contact the customer or recommend an
                  updated eye examination if the provided parameters appear inconsistent or
                  incomplete.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-xl font-semibold leading-snug text-black sm:text-2xl">
                3. Product Imagery & Handcrafted Acetate Variations
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                We make every effort to display the colors and dimensions of our eyewear accurately.
                However, because premium eyewear utilizes handcrafted Italian acetate, natural
                patterns (such as Havana tortoiseshell, horn textures, and translucent gradients)
                may possess subtle unique variations in pattern distribution.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-xl font-semibold leading-snug text-black sm:text-2xl">
                4. Order Confirmation & Cancellation
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                An order is considered accepted once verified via WhatsApp, SMS, or automated order
                confirmation. We reserve the right to cancel or limit quantities on any order
                suspected of commercial reselling, fraudulent activities, or pricing typographical
                errors.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold leading-snug text-black sm:text-2xl">
                5. Limitation of Liability
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                Nigah shall not be liable for any direct, indirect, incidental, or consequential
                damages resulting from the misuse of eyewear products, failure to follow lens care
                instructions, or wear during prohibited high-impact industrial activities without
                certified safety shields.
              </p>
            </section>
          </div>

          {/* Contact Box */}
          <div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl border border-stone-300 bg-stone-50 p-5 sm:mt-16 sm:flex-row sm:gap-6 sm:p-8">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-display text-lg font-semibold text-black">
                Questions regarding our terms of service?
              </h4>
              <p className="text-xs text-zinc-600">
                Reach out to our legal and customer service team anytime.
              </p>
            </div>
            <Link
              to="/contact"
              search={{ product: undefined }}
              className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-full bg-black px-5 text-center text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-md hover:bg-zinc-800 sm:w-auto sm:px-6 sm:tracking-[0.16em] shrink-0"
            >
              Contact Boutique
            </Link>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
