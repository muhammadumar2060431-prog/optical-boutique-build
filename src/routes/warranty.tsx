import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, CheckCircle2, Shield, ShieldCheck, Sparkles, Wrench, XCircle } from "lucide-react";

import { Reveal } from "@/components/site/Reveal";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useStore } from "@/lib/store";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/warranty")({
  head: () => ({
    meta: [
      { title: "Optical Warranty & Authenticity Guarantee — OPTIQUE Eyewear" },
      {
        name: "description",
        content:
          "Our 1-year frame warranty, optical lens coating guarantee, free lifetime adjustments, and 100% authenticity promise at OPTIQUE Optical Boutique.",
      },
      { property: "og:title", content: "Warranty & Authenticity Guarantee — OPTIQUE Eyewear" },
      {
        property: "og:description",
        content:
          "Discover our 1-year optical frame warranty and complimentary lifetime boutique maintenance.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: getSiteUrl("/warranty") },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/warranty") }],
  }),
  component: WarrantyPage,
});

function WarrantyPage() {
  const { settings } = useStore();

  return (
    <SiteLayout>
      <div className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-block px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] bg-stone-100 text-stone-800 border border-stone-200 mb-4">
                Boutique Craftsmanship Guarantee
              </span>
              <h1 className="font-display text-3xl sm:text-5xl font-semibold text-black tracking-tight">
                Warranty & Authenticity Promise
              </h1>
              <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed">
                Every frame and lens dispensed by OPTIQUE reflects precision engineering and premium
                optical standards. Here is how we protect your investment.
              </p>
            </div>
          </Reveal>

          {/* Quick Pillars Grid */}
          <Reveal delay={100}>
            <div className="grid gap-6 sm:grid-cols-3 mb-16">
              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <ShieldCheck className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">
                  1-Year Frame Warranty
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Covers all structural manufacturing defects, spring hinges, and solder weld
                  points.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <Award className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">
                  100% Genuine Materials
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Certified block-cut Italian acetate, aerospace titanium, and optical-grade
                  polycarbonates.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <Wrench className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">
                  Lifetime Maintenance
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Complimentary ultrasonic cleaning, nose pad swaps, and screw tightening anytime.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Policy Sections */}
          <div className="space-y-12 text-zinc-800 leading-relaxed">
            {/* Section 1 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-2xl font-semibold text-black">
                1. 1-Year Comprehensive Frame Warranty
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                All eyeglasses and sunglasses frames purchased from OPTIQUE carry a full{" "}
                <strong className="text-black">12-month manufacturing warranty</strong> covering:
              </p>
              <ul className="space-y-2 text-sm text-zinc-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Defects in frame material structure or unexpected cracking under normal optical
                    wear.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Faulty spring hinge mechanisms, joint loosening, and internal core wire
                    failures.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Nose pad arm weld breakages and bridge solder joint separations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Spontaneous plating discoloration or coating peeling not caused by chemical
                    exposure.
                  </span>
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-2xl font-semibold text-black">
                2. Optical Lens Coating Guarantee
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                Our multi-coated prescription lenses (Blue-cut, Anti-reflective, UV400, Hydrophobic)
                are backed by a <strong className="text-black">6-month coating guarantee</strong>{" "}
                against premature coating crazing or film peeling under standard optical care.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-2xl font-semibold text-black">
                3. Complimentary Lifetime Boutique Care
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                Regardless of when you purchased your eyewear, every OPTIQUE client enjoys free
                lifetime aftercare at our Lahore boutique or via WhatsApp concierge:
              </p>
              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div className="rounded-xl border border-stone-200 p-4 bg-stone-50/50">
                  <p className="font-semibold text-sm text-black mb-1">Ultrasonic Deep Clean</p>
                  <p className="text-xs text-zinc-600">
                    Removes oils, dust, and micro-particles from lens grooves and hinge joints.
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200 p-4 bg-stone-50/50">
                  <p className="font-semibold text-sm text-black mb-1">Anatomical Alignment</p>
                  <p className="text-xs text-zinc-600">
                    Custom fitting adjustment to ensure frames sit straight and balanced on your
                    nose.
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200 p-4 bg-stone-50/50">
                  <p className="font-semibold text-sm text-black mb-1">Screw & Pad Renewal</p>
                  <p className="text-xs text-zinc-600">
                    Free replacement of loose hinge screws and silicone nose pads.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-2xl font-semibold text-black">
                4. What is Not Covered (Exclusions)
              </h2>
              <ul className="space-y-2 text-sm text-zinc-700">
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>
                    Accidental physical damage (sitting on frames, dropping on hard asphalt,
                    crushing).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>
                    Lens scratches caused by dry wiping with paper towels, abrasive fabrics, or
                    sharp objects.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>
                    Exposure to harsh chemicals (bleach, perfumes, solvents) or extreme sauna heat.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>
                    Modification, soldering, or glue repair attempts performed by unauthorized third
                    parties.
                  </span>
                </li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-4">
              <h2 className="font-display text-2xl font-semibold text-black">
                5. How to File a Warranty Claim
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                To initiate a warranty review, simply message our optical concierge on WhatsApp at{" "}
                <a href={`tel:${settings.phone}`} className="font-semibold text-black underline">
                  {settings.phone}
                </a>{" "}
                with your <strong className="text-black">Order Reference ID</strong> and clear
                photos showing the defect. Our lab team will guide you through immediate repair or
                replacement.
              </p>
            </section>
          </div>

          {/* Contact Box */}
          <div className="mt-16 rounded-2xl border border-stone-300 bg-stone-50 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-display text-lg font-semibold text-black">
                Need a frame adjustment or warranty check?
              </h4>
              <p className="text-xs text-zinc-600">
                Our optical lab technicians are happy to inspect and tune your frames.
              </p>
            </div>
            <Link
              to="/contact"
              search={{ product: undefined }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-6 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-zinc-800 shadow-md shrink-0"
            >
              Contact Warranty Desk
            </Link>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
