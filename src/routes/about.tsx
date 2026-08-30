import { createFileRoute } from "@tanstack/react-router";
import { Award, Eye, ShieldCheck, Truck } from "lucide-react";

import { Reveal } from "@/components/site/Reveal";
import { SiteLayout } from "@/components/site/SiteLayout";
import { VideoSection } from "@/components/site/VideoSection";
import { useStore } from "@/lib/store";

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

const trust = [
  { icon: Award, label: "Hand-finished frames" },
  { icon: Eye, label: "Optician-fitted" },
  { icon: ShieldCheck, label: "Warranty included" },
  { icon: Truck, label: "Fast local delivery" },
];

function AboutPage() {
  const { settings } = useStore();

  return (
    <SiteLayout>
      <section className="lens-halo bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <p className="eyebrow text-gold">Our story</p>
            <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
              {settings.aboutHeadline}
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-ink-muted">
              {settings.aboutBody.split("\n\n").map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-mist py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 sm:px-6 lg:grid-cols-4">
          {trust.map((t, i) => (
            <Reveal key={t.label} delay={i * 60}>
              <div className="flex h-full flex-col items-start gap-3 rounded-xl border border-stone bg-card p-6">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-gold/40 text-gold">
                  <t.icon className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold">{t.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <VideoSection heading="Inside our workshop" />
    </SiteLayout>
  );
}
