import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/lens-guide")({
  head: () => ({
    meta: [
      { title: "Eyeglass Lens Guide - Nigah Eyewear" },
      {
        name: "description",
        content:
          "Compare single-vision, bifocal, progressive, reading, and occupational lenses plus essential lens coatings.",
      },
      { property: "og:title", content: "Eyeglass Lens Guide - Nigah Eyewear" },
      { property: "og:type", content: "article" },
      { property: "og:url", content: getSiteUrl("/lens-guide") },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/lens-guide") }],
  }),
  component: LensGuidePage,
});

function LensGuidePage() {
  const lensTypes = [
    {
      name: "Single Vision",
      badge: "Most Common",
      desc: "Corrects one field of vision � either distance or near. Ideal for myopia, hyperopia, or astigmatism.",
      price: "Standard",
    },
    {
      name: "Bifocal",
      badge: "Two Zones",
      desc: "Two distinct optical zones: top for distance, bottom for reading. A visible line separates the zones.",
      price: "Mid-range",
    },
    {
      name: "Progressive",
      badge: "No-Line Bifocal",
      desc: "Seamless transition between distance, intermediate, and near vision. No visible dividing line.",
      price: "Premium",
    },
    {
      name: "Reading",
      badge: "Near Vision",
      desc: "Magnifies close-up text for those who only need help reading. Not for driving.",
      price: "Standard",
    },
    {
      name: "Occupational",
      badge: "Specialised",
      desc: "Optimised for specific tasks like computer work or driving. Reduces eye strain in focused environments.",
      price: "Mid-range",
    },
  ];

  const coatings = [
    {
      name: "Anti-Reflection (AR)",
      desc: "Eliminates glare from screens, headlights, and artificial lighting. Recommended for almost everyone.",
    },
    {
      name: "UV Protection",
      desc: "Blocks 100% of UVA and UVB rays. Essential for outdoor use and available on all our lenses.",
    },
    {
      name: "Blue Light Filter",
      desc: "Reduces high-energy visible blue light from screens. Helps reduce digital eye strain.",
    },
    {
      name: "Scratch-Resistant",
      desc: "Hard coating that protects lens surfaces from minor scratches. Standard on all our premium lenses.",
    },
    {
      name: "Photochromic (Transitions)",
      desc: "Lenses that automatically darken outdoors and clear indoors. A 2-in-1 glasses and sunglasses solution.",
    },
    {
      name: "Polarised",
      desc: "For sunglasses � reduces glare reflected from flat surfaces like water and roads.",
    },
  ];

  const materials = [
    {
      name: "CR-39 Plastic",
      idx: "1.50",
      pros: "Affordable, excellent optics",
      cons: "Thicker at high prescriptions",
    },
    {
      name: "Polycarbonate",
      idx: "1.59",
      pros: "Impact-resistant, lightweight",
      cons: "Slightly lower optical clarity",
    },
    {
      name: "High-Index 1.60",
      idx: "1.60",
      pros: "Thinner & lighter",
      cons: "Costs more than standard",
    },
    {
      name: "High-Index 1.67",
      idx: "1.67",
      pros: "Very thin, great for strong Rx",
      cons: "Premium price point",
    },
    {
      name: "High-Index 1.74",
      idx: "1.74",
      pros: "Thinnest lens available",
      cons: "Most expensive option",
    },
  ];

  return (
    <SiteLayout>
      <section
        style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #0d1020 50%, #0f0f0f 100%)" }}
        className="relative overflow-hidden py-16 sm:py-24 md:py-32"
      >
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[320px] w-[320px] rounded-full opacity-15 sm:h-[500px] sm:w-[500px]"
          style={{ background: "radial-gradient(circle, #c9a96e 0%, transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="eyebrow mb-4 inline-block text-[10px] tracking-[0.18em] sm:text-[11px] sm:tracking-[0.25em] text-[#c9a96e] uppercase">
            Educational Guide
          </span>
          <h1
            className="mb-5 break-words font-serif text-3xl font-bold text-cream sm:text-5xl md:text-6xl"
            style={{ lineHeight: 1.15 }}
          >
            Complete{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #c9a96e, #f0d58c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Lens Guide
            </span>
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-cream/60 sm:text-base md:text-lg">
            Everything you need to know about lens types, materials, and coatings � so you can make
            the smartest choice for your eyes and lifestyle.
          </p>
        </div>
      </section>

      <section className="bg-jet py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="eyebrow mb-3 text-center text-[11px] tracking-[0.2em] text-[#c9a96e] uppercase">
            Lens Types
          </p>
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-cream sm:mb-12 sm:text-3xl">
            Which Lens Type Do You Need?
          </h2>
          <div className="space-y-4">
            {lensTypes.map((l) => (
              <div
                key={l.name}
                className="flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-start sm:gap-6"
                style={{
                  borderColor: "rgba(201,169,110,0.15)",
                  background: "rgba(201,169,110,0.04)",
                }}
              >
                <div className="shrink-0">
                  <p className="font-semibold text-cream">{l.name}</p>
                  <span
                    className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: "rgba(201,169,110,0.15)", color: "#c9a96e" }}
                  >
                    {l.badge}
                  </span>
                </div>
                <p className="flex-1 text-sm leading-relaxed text-cream/65">{l.desc}</p>
                <div className="shrink-0 text-right">
                  <span className="text-xs text-cream/40">{l.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0d0d0d] py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="eyebrow mb-3 text-center text-[11px] tracking-[0.2em] text-[#c9a96e] uppercase">
            Lens Materials
          </p>
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-cream sm:mb-12 sm:text-3xl">
            Choosing the Right Material
          </h2>
          <div
            className="overflow-hidden rounded-2xl border"
            style={{ borderColor: "rgba(201,169,110,0.2)" }}
          >
            <div
              className="hidden border-b px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-cream/40 sm:grid sm:grid-cols-4"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "#111" }}
            >
              {["Material", "Refractive Index", "Pros", "Cons"].map((h) => (
                <div key={h}>{h}</div>
              ))}
            </div>
            {materials.map((m, i) => (
              <div
                key={m.name}
                className="grid gap-2 border-b px-4 py-4 text-sm last:border-0 sm:grid-cols-4 sm:gap-4 sm:px-6"
                style={{
                  borderColor: "rgba(255,255,255,0.05)",
                  background: i % 2 === 0 ? "#0d0d0d" : "#0a0a0a",
                }}
              >
                <div className="font-semibold text-cream">{m.name}</div>
                <div className="font-mono text-[#c9a96e]">{m.idx}</div>
                <div className="text-cream/60">{m.pros}</div>
                <div className="text-cream/40">{m.cons}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-cream/40">
            * Higher refractive index = thinner lens. Recommended for prescriptions above �4.00 SPH.
          </p>
        </div>
      </section>

      <section className="bg-jet py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="eyebrow mb-3 text-center text-[11px] tracking-[0.2em] text-[#c9a96e] uppercase">
            Lens Coatings
          </p>
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-cream sm:mb-12 sm:text-3xl">
            Coatings & Enhancements
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coatings.map((c) => (
              <div
                key={c.name}
                className="rounded-xl border p-5 transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  borderColor: "rgba(201,169,110,0.15)",
                  background: "rgba(201,169,110,0.04)",
                }}
              >
                <p className="mb-2 font-semibold text-cream">{c.name}</p>
                <p className="text-sm leading-relaxed text-cream/60">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0d0d0d] py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="mb-4 font-serif text-2xl font-bold text-cream md:text-3xl">
            Need Help Choosing?
          </h2>
          <p className="mb-8 text-cream/60">
            Our certified opticians will recommend the perfect lens type, material, and coatings for
            your prescription and lifestyle.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/lenses"
              className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-full px-6 text-sm font-semibold text-jet transition-all hover:opacity-90 sm:w-auto sm:px-8"
              style={{ background: "linear-gradient(135deg, #c9a96e, #f0d58c)" }}
            >
              Shop Lenses
            </Link>
            <Link
              to="/contact"
              search={{ product: undefined }}
              className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-full border px-6 text-sm font-semibold text-cream/80 transition-all hover:border-[#c9a96e] hover:text-[#c9a96e] sm:w-auto sm:px-8"
              style={{ borderColor: "rgba(255,255,255,0.2)" }}
            >
              Talk to an Optician
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
