import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/frame-size-guide")({
  head: () => ({
    meta: [
      { title: "Eyeglass Frame Size Guide - Nigah Eyewear" },
      {
        name: "description",
        content:
          "Find your ideal eyeglass frame size using lens width, bridge width, temple length, and face-shape guidance.",
      },
      { property: "og:title", content: "Eyeglass Frame Size Guide - Nigah Eyewear" },
      { property: "og:type", content: "article" },
      { property: "og:url", content: getSiteUrl("/frame-size-guide") },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/frame-size-guide") }],
  }),
  component: FrameSizeGuidePage,
});

function FrameSizeGuidePage() {
  const measurements = [
    {
      label: "Lens Width",
      range: "40�62 mm",
      desc: "The horizontal width of a single lens. Most adults fall between 48�54 mm.",
    },
    {
      label: "Bridge Width",
      range: "14�24 mm",
      desc: "The distance between the two lenses. A proper fit sits snug � not pinching or sliding.",
    },
    {
      label: "Temple Length",
      range: "120�150 mm",
      desc: "The arm from hinge to tip. Most adults need 140�145 mm for a secure, comfortable fit.",
    },
    {
      label: "Frame Width",
      range: "120�150 mm",
      desc: "Total width of the frame front. Should roughly match the width of your face.",
    },
    {
      label: "Lens Height",
      range: "28�50 mm",
      desc: "Vertical height of the lens. Progressive lens wearers need at least 35 mm for reading zones.",
    },
  ];

  const sizingTips = [
    {
      face: "Oval",
      tip: "Most frame shapes work. Try geometric or bold frames to add definition.",
      icon: "O",
    },
    {
      face: "Round",
      tip: "Angular and rectangular frames add structure. Avoid small round frames.",
      icon: "C",
    },
    {
      face: "Square",
      tip: "Round and oval frames soften angular jawlines. Rimless also works great.",
      icon: "S",
    },
    {
      face: "Heart",
      tip: "Bottom-heavy frames balance a wider forehead. Avoid top-heavy or cat-eye.",
      icon: "H",
    },
    {
      face: "Diamond",
      tip: "Oval and rimless frames complement your high cheekbones naturally.",
      icon: "D",
    },
    {
      face: "Oblong",
      tip: "Tall frames with decorative temples add width and break up face length.",
      icon: "L",
    },
  ];

  const steps = [
    {
      n: "01",
      title: "Measure Your Face Width",
      desc: "Place a ruler across your forehead from temple to temple. This gives your total face width.",
    },
    {
      n: "02",
      title: "Find Your Temple Length",
      desc: "Measure from your temple to just behind your ear. This determines the arm/temple length you need.",
    },
    {
      n: "03",
      title: "Check Existing Frames",
      desc: "Look inside your current glasses � the numbers are printed on the temple arm (e.g., 52-18-140).",
    },
    {
      n: "04",
      title: "Match to Frame Numbers",
      desc: "The three numbers are Lens Width � Bridge Width � Temple Length. Match these to find your size.",
    },
  ];

  return (
    <SiteLayout>
      <section
        style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #0d1a12 50%, #0f0f0f 100%)" }}
        className="relative overflow-hidden py-16 sm:py-24 md:py-32"
      >
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[320px] w-[320px] rounded-full sm:h-[500px] sm:w-[500px] opacity-15"
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
            Find Your Perfect{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #c9a96e, #f0d58c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Frame Size
            </span>
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-cream/60 sm:text-base md:text-lg">
            The right fit is just as important as the right style. Use this guide to measure
            yourself accurately and never order the wrong size again.
          </p>
        </div>
      </section>

      <section className="bg-jet py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <p className="eyebrow mb-3 text-center text-[11px] tracking-[0.2em] text-[#c9a96e] uppercase">
            Step-by-Step
          </p>
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-cream sm:mb-12 sm:text-3xl">
            How to Measure at Home
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {steps.map((s) => (
              <div
                key={s.n}
                className="flex gap-5 rounded-xl border p-6"
                style={{
                  borderColor: "rgba(201,169,110,0.15)",
                  background: "rgba(201,169,110,0.04)",
                }}
              >
                <div className="shrink-0 font-mono text-3xl font-bold text-[#c9a96e]/30">{s.n}</div>
                <div>
                  <p className="mb-1.5 font-semibold text-cream">{s.title}</p>
                  <p className="text-sm leading-relaxed text-cream/60">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0d0d0d] py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="eyebrow mb-3 text-center text-[11px] tracking-[0.2em] text-[#c9a96e] uppercase">
            Frame Dimensions
          </p>
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-cream sm:mb-12 sm:text-3xl">
            Understanding Frame Measurements
          </h2>
          <div className="space-y-3">
            {measurements.map((m) => (
              <div
                key={m.label}
                className="flex flex-col gap-2 rounded-xl border p-5 sm:flex-row sm:items-center sm:gap-6"
                style={{
                  borderColor: "rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div className="shrink-0 w-36">
                  <p className="font-semibold text-[#c9a96e]">{m.label}</p>
                  <p className="font-mono text-xs text-cream/40">{m.range}</p>
                </div>
                <p className="text-sm leading-relaxed text-cream/65">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-jet py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="eyebrow mb-3 text-center text-[11px] tracking-[0.2em] text-[#c9a96e] uppercase">
            Style by Face Shape
          </p>
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-cream sm:mb-12 sm:text-3xl">
            Which Frame Suits You?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sizingTips.map((s) => (
              <div
                key={s.face}
                className="rounded-xl border p-5 transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  borderColor: "rgba(201,169,110,0.15)",
                  background: "rgba(201,169,110,0.04)",
                }}
              >
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-full font-mono font-bold text-jet"
                  style={{ background: "linear-gradient(135deg, #c9a96e, #f0d58c)" }}
                >
                  {s.icon}
                </div>
                <p className="mb-1.5 font-semibold text-cream">{s.face} Face</p>
                <p className="text-sm leading-relaxed text-cream/60">{s.tip}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0d0d0d] py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="mb-4 font-serif text-2xl font-bold text-cream md:text-3xl">
            Still Not Sure?
          </h2>
          <p className="mb-8 text-cream/60">
            Our opticians are happy to help you find your perfect fit. Contact us or browse our full
            collection below.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/glasses"
              className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-full px-6 text-sm font-semibold text-jet transition-all hover:opacity-90 sm:w-auto sm:px-8"
              style={{ background: "linear-gradient(135deg, #c9a96e, #f0d58c)" }}
            >
              Browse Frames
            </Link>
            <Link
              to="/contact"
              search={{ product: undefined }}
              className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-full border px-6 text-sm font-semibold text-cream/80 transition-all hover:border-[#c9a96e] hover:text-[#c9a96e] sm:w-auto sm:px-8"
              style={{ borderColor: "rgba(255,255,255,0.2)" }}
            >
              Get Expert Help
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
