import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, PackageCheck, Truck } from "lucide-react";

import { Reveal } from "@/components/site/Reveal";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useStore } from "@/lib/store";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/shipping-policy")({
  head: () => ({
    meta: [
      { title: "Shipping & Delivery Policy — OPTIQUE Eyewear Pakistan" },
      {
        name: "description",
        content:
          "Nationwide express courier delivery details, transit timelines, free shipping thresholds, Cash on Delivery (COD), and optical prescription turnaround times at OPTIQUE.",
      },
      { property: "og:title", content: "Shipping & Delivery Policy — OPTIQUE Eyewear" },
      {
        property: "og:description",
        content:
          "Complete nationwide delivery guide, timelines, and tracking information across Pakistan.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: getSiteUrl("/shipping-policy") },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/shipping-policy") }],
  }),
  component: ShippingPolicyPage,
});

function ShippingPolicyPage() {
  const { settings } = useStore();

  return (
    <SiteLayout>
      <div className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-block px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] bg-stone-100 text-stone-800 border border-stone-200 mb-4">
                Nationwide Delivery
              </span>
              <h1 className="font-display text-3xl sm:text-5xl font-semibold text-black tracking-tight">
                Shipping & Delivery Policy
              </h1>
              <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed">
                We safely deliver precision-crafted eyewear, designer sunglasses, and custom
                prescription lenses to every city and town across Pakistan.
              </p>
            </div>
          </Reveal>

          {/* Quick Highlights Grid */}
          <Reveal delay={100}>
            <div className="grid gap-6 sm:grid-cols-3 mb-16">
              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <Truck className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">Express Dispatch</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Fast delivery via TCS, Leopard Courier, and Trax Logistics with live tracking.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <Clock className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">2–4 Working Days</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  1–2 days in Lahore; 2–3 days for major metro hubs (Karachi, Islamabad,
                  Rawalpindi).
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-center space-y-2">
                <PackageCheck className="h-7 w-7 text-stone-800 mx-auto" />
                <h3 className="font-display text-lg font-semibold text-black">Secure Hard Case</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Every order includes a protective velvet-lined hard box, micro-fiber cloth, and
                  bubble safety wrap.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Policy Sections */}
          <div className="space-y-12 text-zinc-800 leading-relaxed">
            {/* Section 1 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-2xl font-semibold text-black">
                1. Order Processing & Verification Timeline
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                Each eyewear order undergoes stringent quality control and optical inspection before
                dispatch:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-700">
                <li>
                  <strong className="text-black">
                    Ready-to-Wear Frames & Non-Prescription Sunglasses:
                  </strong>{" "}
                  Processed and packed within{" "}
                  <span className="font-semibold text-black">24 to 48 hours</span> of order
                  confirmation.
                </li>
                <li>
                  <strong className="text-black">Custom Prescription Lenses:</strong> Requires{" "}
                  <span className="font-semibold text-black">2 to 3 business days</span> for optical
                  laboratory surfacing, computerized robotic edging, blue-cut/anti-reflective
                  coating application, and dual-axis alignment verification by our licensed
                  optometrist.
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-2xl font-semibold text-black">
                2. Nationwide Delivery Timelines & Coverage
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                We partner with Pakistan's premier courier services (TCS, Leopard Courier, Call
                Courier, and Trax) to ensure reliable doorstep delivery:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border border-stone-200 rounded-xl overflow-hidden">
                  <thead className="bg-stone-100 text-black font-semibold">
                    <tr>
                      <th className="p-3.5 border-b border-stone-200">Destination Region</th>
                      <th className="p-3.5 border-b border-stone-200">Estimated Transit Time</th>
                      <th className="p-3.5 border-b border-stone-200">Delivery Service</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-zinc-700">
                    <tr>
                      <td className="p-3.5 font-medium text-black">Lahore (Local Boutique Zone)</td>
                      <td className="p-3.5">1–2 Business Days</td>
                      <td className="p-3.5">Local Express Courier / Boutique Concierge</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-black">
                        Karachi, Islamabad, Rawalpindi, Faisalabad, Multan
                      </td>
                      <td className="p-3.5">2–3 Business Days</td>
                      <td className="p-3.5">Air Express Courier (TCS / Leopard)</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-black">
                        Peshawar, Quetta, Sialkot, Gujranwala, Hyderabad
                      </td>
                      <td className="p-3.5">2–4 Business Days</td>
                      <td className="p-3.5">Overnight / Express Overland</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-black">
                        Other Cities, Districts & Rural Areas
                      </td>
                      <td className="p-3.5">3–5 Business Days</td>
                      <td className="p-3.5">Standard Courier Network</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-2xl font-semibold text-black">
                3. Shipping Rates & Free Delivery
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-700">
                <li>
                  <strong className="text-black">Standard Shipping Rate:</strong> A flat rate of{" "}
                  <span className="font-semibold text-black">Rs. 200</span> applies to standard
                  retail orders within Pakistan.
                </li>
                <li>
                  <strong className="text-black">Special Promotional Free Delivery:</strong> Free
                  shipping is automatically unlocked on eligible promotional carts or orders
                  confirmed via WhatsApp boutique assistance.
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-4 border-b border-stone-200 pb-10">
              <h2 className="font-display text-2xl font-semibold text-black">
                4. Cash on Delivery (COD) & Tracking Updates
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                We offer convenient Cash on Delivery (COD) across 250+ cities in Pakistan. Once your
                parcel is handed over to the courier, you will receive an automatic tracking code
                via SMS and WhatsApp.
              </p>
              <p className="text-sm sm:text-base text-zinc-600">
                You can also track your shipment live at any time using our dedicated{" "}
                <Link
                  to="/order-status"
                  search={{ ref: undefined }}
                  className="font-semibold text-black underline hover:text-stone-700"
                >
                  Track Order Portal
                </Link>{" "}
                with your order reference number.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-4">
              <h2 className="font-display text-2xl font-semibold text-black">
                5. Damaged Parcel or Missing Items
              </h2>
              <p className="text-sm sm:text-base text-zinc-600">
                If the outer shipping flyer or parcel appears physically crushed, torn, or tampered
                with at the time of delivery, please do not accept it or take immediate unboxing
                photos/videos. Contact our WhatsApp support team at{" "}
                <a href={`tel:${settings.phone}`} className="font-semibold text-black underline">
                  {settings.phone}
                </a>{" "}
                within 24 hours for immediate resolution.
              </p>
            </section>
          </div>

          {/* Help Callout */}
          <div className="mt-16 rounded-2xl border border-stone-300 bg-stone-50 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-display text-lg font-semibold text-black">
                Have a question about your shipment?
              </h4>
              <p className="text-xs text-zinc-600">
                Our optical support concierge is available Mon–Sat from 11:00 AM to 9:00 PM.
              </p>
            </div>
            <Link
              to="/contact"
              search={{ product: undefined }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-6 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-zinc-800 shadow-md shrink-0"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
