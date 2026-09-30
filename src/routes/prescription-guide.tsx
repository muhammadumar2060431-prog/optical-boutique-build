import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/prescription-guide")({
  head: () => ({
    meta: [
      { title: "Eyeglass Prescription Guide - OPTIQUE Eyewear" },
      {
        name: "description",
        content:
          "Understand SPH, CYL, AXIS, ADD, and PD values before ordering your prescription eyewear.",
      },
      { property: "og:title", content: "Eyeglass Prescription Guide - OPTIQUE Eyewear" },
      { property: "og:type", content: "article" },
      { property: "og:url", content: getSiteUrl("/prescription-guide") },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/prescription-guide") }],
  }),
  component: PrescriptionGuidePage,
});

function PrescriptionGuidePage() {
  const terms = [
    {
      abbr: "OD",
      full: "Oculus Dexter",
      desc: "Your RIGHT eye. Always listed first on a prescription.",
    },
    {
      abbr: "OS",
      full: "Oculus Sinister",
      desc: "Your LEFT eye. Listed second on a prescription.",
    },
    {
      abbr: "OU",
      full: "Oculus Uterque",
      desc: "Both eyes together. Used when both eyes share the same value.",
    },
    {
      abbr: "SPH",
      full: "Sphere",
      desc: "Lens power needed to correct nearsightedness (−) or farsightedness (+). Measured in diopters.",
    },
    {
      abbr: "CYL",
      full: "Cylinder",
      desc: "Amount of lens power for astigmatism. If blank, you have no astigmatism.",
    },
    {
      abbr: "AXIS",
      full: "Axis",
      desc: "Orientation of the cylinder correction (1–180 degrees). Required only when CYL is present.",
    },
    {
      abbr: "ADD",
      full: "Addition",
      desc: "Extra magnification for bifocal/progressive lenses. Used for reading correction.",
    },
    {
      abbr: "PD",
      full: "Pupillary Distance",
      desc: "Distance in mm between your pupils. Critical for accurate lens centration.",
    },
    {
      abbr: "PRISM",
      full: "Prism",
      desc: "Corrects eye alignment issues. Not common — only when medically necessary.",
    },
  ];

  const faqs = [
    {
      q: "How long is a prescription valid?",
      a: "Eyeglass prescriptions are typically valid for 1–2 years. Always use an up-to-date prescription when ordering.",
    },
    {
      q: "Can I use my contact lens prescription for glasses?",
      a: "No. Contact lens prescriptions include extra measurements and differ from spectacle prescriptions.",
    },
    {
      q: "What does a minus (−) sign mean?",
      a: "A negative sphere value means you are nearsighted (myopic). A positive value means you are farsighted (hyperopic).",
    },
    {
      q: "What if my CYL/AXIS fields are blank?",
      a: "Blank CYL and AXIS fields simply mean you do not have astigmatism — completely normal.",
    },
    {
      q: "What PD should I provide?",
      a: "Ask your optometrist to include your PD on the prescription. Typical adult PD ranges from 54 mm to 74 mm.",
    },
  ];

  return (
    <SiteLayout>
      <section
        style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #1a1208 50%, #0f0f0f 100%)" }}
        className="relative overflow-hidden py-24 md:py-32"
      >
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #c9a96e 0%, transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="eyebrow mb-4 inline-block text-[11px] tracking-[0.25em] text-[#c9a96e] uppercase">
            Educational Guide
          </span>
          <h1
            className="mb-6 font-serif text-4xl font-bold text-cream sm:text-5xl md:text-6xl"
            style={{ lineHeight: 1.15 }}
          >
            How to Read Your{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #c9a96e, #f0d58c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Eye Prescription
            </span>
          </h1>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-cream/60 md:text-lg">
            Prescriptions look complicated, but they follow a simple system. This guide explains
            every abbreviation so you can order with complete confidence.
          </p>
        </div>
      </section>

      <section className="bg-jet py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <p className="eyebrow mb-6 text-center text-[11px] tracking-[0.2em] text-[#c9a96e] uppercase">
            Sample Prescription
          </p>
          <div
            className="overflow-hidden rounded-2xl border"
            style={{ borderColor: "rgba(201,169,110,0.2)" }}
          >
            <div
              className="grid grid-cols-6 gap-0 border-b px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-cream/40"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "#111" }}
            >
              {["Eye", "SPH", "CYL", "AXIS", "ADD", "PD"].map((h) => (
                <div key={h} className="text-center first:text-left">
                  {h}
                </div>
              ))}
            </div>
            <div
              className="grid grid-cols-6 gap-0 border-b px-6 py-4 text-sm"
              style={{ borderColor: "rgba(255,255,255,0.05)", background: "#0d0d0d" }}
            >
              <div className="font-semibold text-[#c9a96e]">OD (R)</div>
              {["-2.50", "-0.75", "180", "+2.00"].map((v, i) => (
                <div key={i} className="text-center font-mono text-cream/80">
                  {v}
                </div>
              ))}
              <div className="text-center font-mono text-cream/80">63</div>
            </div>
            <div
              className="grid grid-cols-6 gap-0 px-6 py-4 text-sm"
              style={{ background: "#0a0a0a" }}
            >
              <div className="font-semibold text-[#c9a96e]">OS (L)</div>
              {["-2.00", "-0.50", "170", "+2.00"].map((v, i) => (
                <div key={i} className="text-center font-mono text-cream/80">
                  {v}
                </div>
              ))}
              <div className="text-center font-mono text-cream/80">63</div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-cream/40">
            * Sample only — not a real prescription
          </p>
        </div>
      </section>

      <section className="bg-[#0d0d0d] py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="eyebrow mb-3 text-center text-[11px] tracking-[0.2em] text-[#c9a96e] uppercase">
            Key Terms Explained
          </p>
          <h2 className="mb-12 text-center font-serif text-3xl font-bold text-cream">
            Prescription Terminology
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {terms.map((t) => (
              <div
                key={t.abbr}
                className="rounded-xl border p-5 transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  borderColor: "rgba(201,169,110,0.15)",
                  background: "rgba(201,169,110,0.04)",
                }}
              >
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="font-mono text-xl font-bold text-[#c9a96e]">{t.abbr}</span>
                  <span className="text-[11px] text-cream/40 italic">{t.full}</span>
                </div>
                <p className="text-sm leading-relaxed text-cream/65">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-jet py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="eyebrow mb-3 text-center text-[11px] tracking-[0.2em] text-[#c9a96e] uppercase">
            Common Questions
          </p>
          <h2 className="mb-10 text-center font-serif text-3xl font-bold text-cream">
            Prescription FAQs
          </h2>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <div
                key={i}
                className="rounded-xl border p-5"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <p className="mb-2 font-semibold text-cream">{f.q}</p>
                <p className="text-sm leading-relaxed text-cream/60">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0d0d0d] py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="mb-4 font-serif text-2xl font-bold text-cream md:text-3xl">
            Ready to Order?
          </h2>
          <p className="mb-8 text-cream/60">
            Browse our curated collection and enter your prescription at checkout — our team will
            fit every lens to perfection.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/glasses"
              className="inline-flex h-12 items-center rounded-full px-8 text-sm font-semibold text-jet transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #c9a96e, #f0d58c)" }}
            >
              Shop Frames
            </Link>
            <Link
              to="/contact"
              search={{ product: undefined }}
              className="inline-flex h-12 items-center rounded-full border px-8 text-sm font-semibold text-cream/80 transition-all hover:border-[#c9a96e] hover:text-[#c9a96e]"
              style={{ borderColor: "rgba(255,255,255,0.2)" }}
            >
              Ask Our Optician
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
