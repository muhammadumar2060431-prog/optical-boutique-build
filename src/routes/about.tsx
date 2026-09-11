import { createFileRoute } from "@tanstack/react-router";

import { Reveal } from "@/components/site/Reveal";
import { SiteLayout } from "@/components/site/SiteLayout";
import { VideoSection } from "@/components/site/VideoSection";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About OPTIQUE — Handcrafted Eyewear & Precision Optics" },
      {
        name: "description",
        content:
          "Discover OPTIQUE's heritage: over three decades of optical craftsmanship, precision lens fitting, and custom Italian acetate frames.",
      },
      { property: "og:title", content: "About OPTIQUE — Handcrafted Eyewear & Precision Optics" },
      {
        property: "og:description",
        content: "Discover our heritage of optical craftsmanship and precision lens fitting.",
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
                  Designing and crafting high-precision, beautifully finished frames for over three decades.
                </h1>
                <p className="mt-6 text-[15px] leading-relaxed text-zinc-500">
                  With our frames featured across leading optical boutiques worldwide, we combine traditional optical craftsmanship with modern precision to deliver eyewear of unmatched comfort and enduring style.
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
              High-quality, beautifully designed frames at accessible pricing
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
                  Three decades of expertise in crafting eyewear with premium materials
                </h2>
                <p className="mt-6 text-[15px] leading-relaxed text-zinc-500">
                  We have dedicated years to perfecting our craft, tailoring frames to harmonize with diverse facial profiles and personal styles.
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-zinc-500">
                  From ergonomic temple contouring to hand-polished acetate and Japanese titanium hardware, every pair reflects our commitment to optical excellence.
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
                  Everyone deserves well-fitted, durable eyewear. Regardless of your prescription complexity or style preference, we deliver precision lenses paired with exquisite frames at honest, transparent prices.
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-zinc-500">
                  We believe that premium craftsmanship and clear, comfortable vision should be accessible to all.
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

      {/* ── VIDEO SECTION ── */}
      <VideoSection heading="Inside our workshop" />
    </SiteLayout>
  );
}
