import { createFileRoute } from "@tanstack/react-router";

import { Reveal } from "@/components/site/Reveal";
import { SiteLayout } from "@/components/site/SiteLayout";
import { VideoSection } from "@/components/site/VideoSection";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About OPTIQUE — Optics Made Deliberately Slow" },
      {
        name: "description",
        content:
          "How OPTIQUE cuts, polishes and fits every frame in-house, and why our opticians measure each eye individually.",
      },
      { property: "og:title", content: "About OPTIQUE — Optics Made Deliberately Slow" },
      {
        property: "og:description",
        content: "A small optical house with a workshop, not a warehouse.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://optical-boutique-build.lovable.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://optical-boutique-build.lovable.app/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      {/* ── SECTION A: ABOUT US ── */}
      <section className="relative overflow-hidden bg-white py-20 sm:py-32">
        {/* Giant decorative letter */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-6 top-0 select-none font-display text-[22vw] font-black leading-none text-zinc-100 sm:text-[18vw]"
        >
          A
        </span>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-10">
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Text column */}
            <Reveal>
              <div className="pt-10 lg:pt-24">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  About Us
                </p>
                <h1 className="font-display text-3xl font-bold leading-tight text-zinc-900 sm:text-4xl lg:text-5xl">
                  We've been in the business of designing and manufacturing high-quality,
                  beautifully designed frames for over three decades.
                </h1>
                <p className="mt-6 text-[15px] leading-relaxed text-zinc-500">
                  Having our frames all over major optical chain stores all over Europe, Canada,
                  Israel and South Africa, we encapsulate the ideal blend of experience and
                  expertise when it comes to perfecting eyewear.
                </p>

                {/* Floating black glasses image inside text column for small screens */}
                <div className="relative mt-10 hidden lg:block">
                  <img
                    src="/about-glasses-black.jpg"
                    alt="Premium black aviator frames"
                    className="w-72 object-contain drop-shadow-xl"
                  />
                </div>
              </div>
            </Reveal>

            {/* Portrait + product stack */}
            <Reveal delay={80}>
              <div className="relative flex flex-col gap-6">
                {/* Tortoise glasses – top right */}
                <div className="ml-auto w-56 sm:w-72">
                  <img
                    src="/about-glasses-tortoise.jpg"
                    alt="Tortoiseshell acetate frames"
                    className="rounded-lg object-cover shadow-lg"
                  />
                </div>
                {/* Portrait */}
                <div className="relative -mt-10 ml-4">
                  <img
                    src="/about-man.jpg"
                    alt="Man wearing OPTIQUE eyeglasses"
                    className="h-[420px] w-full rounded-xl object-cover shadow-2xl sm:h-[520px]"
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── QUOTE BLOCK ── */}
      <section className="relative overflow-hidden bg-zinc-50 py-20 sm:py-28">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 top-0 select-none font-display text-[22vw] font-black leading-none text-zinc-100 sm:text-[18vw]"
        >
          B
        </span>
        <Reveal>
          <div className="relative mx-auto max-w-4xl px-6 text-center sm:px-10">
            <p className="mb-6 text-5xl leading-none text-zinc-300 sm:text-7xl">"</p>
            <blockquote className="font-display text-2xl font-bold uppercase leading-snug tracking-wide text-zinc-800 sm:text-3xl lg:text-4xl">
              High-quality, beautifully designed frames at an affordable pricing
            </blockquote>
            <p className="mt-8 text-5xl leading-none text-zinc-300 sm:text-7xl">"</p>
          </div>
        </Reveal>
      </section>

      {/* ── SECTION C: THREE DECADES + EXPERTISE ── */}
      <section className="relative overflow-hidden bg-white py-20 sm:py-32">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 top-4 select-none font-display text-[22vw] font-black leading-none text-zinc-100 sm:text-[18vw]"
        >
          C
        </span>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-10">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
            {/* Left: woman portrait */}
            <Reveal>
              <div className="relative">
                <img
                  src="/about-woman.jpg"
                  alt="Woman wearing OPTIQUE eyeglasses"
                  className="h-[420px] w-full rounded-xl object-cover shadow-2xl sm:h-[540px]"
                />
              </div>
            </Reveal>

            {/* Right: headline + text */}
            <Reveal delay={80}>
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  Our legacy
                </p>
                <h2 className="font-display text-3xl font-bold uppercase leading-tight text-zinc-900 sm:text-4xl lg:text-5xl">
                  Three decades of expertise in crafting eyewear using the best quality materials
                </h2>
                <p className="mt-6 text-[15px] leading-relaxed text-zinc-500">
                  We have had the privilege of honing our craft while making frames for every facial
                  shape and bone structure in the world.
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-zinc-500">
                  This includes refining our designs, operating efficient manufacturing lines and
                  sourcing the best quality materials.
                </p>
                {/* Tortoise glasses floating */}
                <div className="mt-10">
                  <img
                    src="/about-glasses-tortoise.jpg"
                    alt="Premium tortoiseshell frames"
                    className="w-64 object-contain drop-shadow-xl"
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── SECTION D: OUR PHILOSOPHY ── */}
      <section className="relative overflow-hidden bg-zinc-50 py-20 sm:py-32">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-4 bottom-0 top-auto select-none font-display text-[22vw] font-black leading-none text-zinc-100 sm:text-[18vw]"
        >
          B
        </span>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-10">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
            {/* Left: sunglasses product */}
            <Reveal>
              <div className="order-2 lg:order-1">
                <img
                  src="/about-sunglasses.jpg"
                  alt="Sunglasses on ceramic plate"
                  className="h-[340px] w-full rounded-xl object-cover shadow-2xl sm:h-[440px]"
                />
              </div>
            </Reveal>

            {/* Right: philosophy text */}
            <Reveal delay={80}>
              <div className="order-1 lg:order-2">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  Our Philosophy
                </p>
                <h2 className="font-display text-3xl font-bold leading-tight text-zinc-900 sm:text-4xl lg:text-5xl">
                  Quality eyewear, accessible to everyone.
                </h2>
                <p className="mt-6 text-[15px] leading-relaxed text-zinc-500">
                  Despite regular at-least two pairs of well-fitted glasses, regardless of age or
                  prescription, for any eyewear that need with exquisite frames at affordable
                  prices.
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-zinc-500">
                  We truly believe that high quality eyewear and access to proper eyecare should be
                  readily available to everyone who needs them.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── SECTION E: BOTTOM EXPERTISE QUOTE ── */}
      <section className="relative overflow-hidden bg-white py-20 sm:py-28">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 top-0 select-none font-display text-[22vw] font-black leading-none text-zinc-100 sm:text-[18vw]"
        >
          E
        </span>
        <Reveal>
          <div className="relative mx-auto max-w-4xl px-6 text-center sm:px-10">
            <p className="mb-6 text-5xl leading-none text-zinc-300 sm:text-7xl">"</p>
            <blockquote className="font-display text-2xl font-bold uppercase leading-snug tracking-wide text-zinc-800 sm:text-3xl lg:text-4xl">
              Over three decades of expertise in crafting eyewear using the best quality materials
            </blockquote>
            <p className="mt-8 text-5xl leading-none text-zinc-300 sm:text-7xl">"</p>
          </div>
        </Reveal>
      </section>

      {/* ── VIDEO SECTION (unchanged) ── */}
      <VideoSection heading="Inside our workshop" />
    </SiteLayout>
  );
}
