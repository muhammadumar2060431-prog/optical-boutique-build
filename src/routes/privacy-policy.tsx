import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, Eye, Lock, ShieldCheck, UserCheck } from "lucide-react";

import { Reveal } from "@/components/site/Reveal";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useStore } from "@/lib/store";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy & Prescription Data Security — OPTIQUE Eyewear" },
      {
        name: "description",
        content:
          "Read how OPTIQUE Optical Boutique protects your personal information, optical prescriptions, doctor slips, and payment details under strict privacy standards.",
      },
      { property: "og:title", content: "Privacy Policy — OPTIQUE Eyewear" },
      {
        property: "og:description",
        content:
          "Our commitment to data protection, medical optical confidentiality, and customer privacy.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: getSiteUrl("/privacy-policy") },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/privacy-policy") }],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  const { settings } = useStore();

  return (
    <SiteLayout>
      <div className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-block px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] bg-stone-100 text-stone-800 border border-stone-200 mb-4">
                Data Protection & Medical Confidentiality
              </span>
              <h1 className="font-display text-3xl sm:text-5xl font-semibold text-black tracking-tight">
                Privacy Policy
              </h1>
              <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed">
                At OPTIQUE, we consider your personal privacy and optical prescription data sacred.
                This document outlines how we collect, safeguard, and responsibly use your data.
              </p>
            </div>
          </Reveal>

          {/* Quick Pillars Grid */}
          <Reveal delay={100}>
            <div className="grid gap-6 sm:grid-cols-3 mb-16">
              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <Lock className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">
                  SSL 256-bit Encryption
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  All website transactions and prescription uploads are protected with enterprise
                  encryption.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <Eye className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">
                  Prescription Confidentiality
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Doctor slips and eye power parameters are viewed solely by licensed optical
                  laboratory technicians.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <ShieldCheck className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">
                  Zero Third-Party Selling
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  We never sell, rent, or trade your contact information, phone numbers, or health
                  data to marketers.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Policy Sections */}
          <div className="space-y-12 text-zinc-800 leading-relaxed">
            {/* Section 1 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-2xl font-semibold text-black">
                1. Information We Collect
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                When you browse our online boutique, place an order, or submit an optical enquiry,
                we collect:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-700">
                <li>
                  <strong className="text-black">Contact & Delivery Information:</strong> Full name,
                  shipping destination address, mobile phone number, and email address.
                </li>
                <li>
                  <strong className="text-black">Optical Prescription Data:</strong> SPH (Sphere),
                  CYL (Cylinder), Axis, Add power, Pupillary Distance (PD), doctor name, and
                  uploaded prescription slip images.
                </li>
                <li>
                  <strong className="text-black">Order & Transaction History:</strong> Selected
                  eyewear frames, lens coatings, transaction references, and courier tracking
                  details.
                </li>
                <li>
                  <strong className="text-black">Technical Log Data:</strong> Anonymized IP
                  addresses, browser cookies, and page interaction metrics to optimize website speed
                  and mobile usability.
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-2xl font-semibold text-black">
                2. How We Utilize Your Information
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                Your data is utilized strictly for legitimate optical dispensing and store
                operations:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-700">
                <li>
                  Processing and manufacturing customized prescription lenses to exact refractive
                  specifications.
                </li>
                <li>
                  Dispatching orders via certified courier partners (TCS, Leopard Courier, Trax) and
                  sending live SMS/WhatsApp dispatch alerts.
                </li>
                <li>
                  Providing after-sales optical support, frame fitting adjustments, and warranty
                  claims.
                </li>
                <li>
                  Sending optional newsletter updates regarding seasonal optical collections
                  (customers can unsubscribe at any time).
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-2xl font-semibold text-black">
                3. Authorized Service Partner Disclosures
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                We only share limited, essential information with trusted operational partners:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-700">
                <li>
                  <strong className="text-black">Logistics Providers:</strong> Name, recipient
                  address, and phone number are shared solely for delivering your parcel.
                </li>
                <li>
                  <strong className="text-black">Communication Platforms:</strong> Official WhatsApp
                  Business and email gateways for order confirmations and customer service
                  notifications.
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-2xl font-semibold text-black">
                4. Cookies & Website Analytics
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                Our website uses functional cookies to remember your shopping cart selection and
                measure aggregated site performance. You may disable cookies in your browser
                settings, though doing so may affect cart checkout functionality.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-4">
              <h2 className="font-display text-2xl font-semibold text-black">
                5. Your Data Rights & Contact
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                You have the right to request a copy of your stored optical prescription records,
                update your shipping details, or request account data deletion. Contact our privacy
                officer at{" "}
                <a href={`mailto:${settings.email}`} className="font-semibold text-black underline">
                  {settings.email}
                </a>
                .
              </p>
            </section>
          </div>

          {/* Contact Box */}
          <div className="mt-16 rounded-2xl border border-stone-300 bg-stone-50 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-display text-lg font-semibold text-black">
                Have questions about our data security?
              </h4>
              <p className="text-xs text-zinc-600">
                Our optical data team is available to assist you with any inquiries.
              </p>
            </div>
            <Link
              to="/contact"
              search={{ product: undefined }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-6 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-zinc-800 shadow-md shrink-0"
            >
              Contact Privacy Desk
            </Link>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
