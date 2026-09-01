import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Hero() {
  const { heroSlides } = useStore();
  const slides = heroSlides.filter((s) => s.enabled);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (dir: number) => setIndex((i) => (slides.length ? (i + dir + slides.length) % slides.length : 0)),
    [slides.length],
  );

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setInterval(() => go(1), 5000);
    return () => clearInterval(t);
  }, [paused, go, slides.length]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  if (!slides.length) return null;

  return (
    <section
      className="relative isolate h-[62vh] min-h-[380px] overflow-hidden bg-jet sm:h-[70vh] lg:h-[78vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-out",
            i === index ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={i !== index}
          inert={i !== index}
        >
          <img
            src={slide.image}
            alt={slide.headline}
            width={1920}
            height={1080}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-jet/90 via-jet/60 to-jet/10" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
              <div className="max-w-xl space-y-4 sm:space-y-6">
                <p className="eyebrow text-gold-soft">{slide.eyebrow}</p>
                <h1 className="font-display text-[2.1rem] leading-[1.1] text-cream sm:text-5xl lg:text-6xl">
                  {slide.headline}
                </h1>
                <p className="max-w-md text-sm text-cream/80 sm:text-base">{slide.subtext}</p>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href={slide.ctaLink}
                    className="inline-flex min-h-11 items-center rounded-full bg-gold px-7 text-xs tracking-[0.18em] uppercase text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
                  >
                    {slide.ctaText}
                  </a>
                  <a
                    href="/about"
                    className="min-h-11 border-b border-cream/40 pb-1 text-xs tracking-[0.18em] uppercase text-cream/80 transition-colors hover:border-gold hover:text-gold-soft"
                  >
                    Our story
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        aria-label="Previous slide"
        onClick={() => go(-1)}
        className="absolute top-1/2 left-3 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-cream/25 text-cream transition-colors hover:border-gold hover:text-gold-soft sm:left-6"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next slide"
        onClick={() => go(1)}
        className="absolute top-1/2 right-3 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-cream/25 text-cream transition-colors hover:border-gold hover:text-gold-soft sm:right-6"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn(
              "h-2.5 w-2.5 rounded-full border border-cream/60 transition-colors",
              i === index && "border-gold bg-gold",
            )}
          />
        ))}
      </div>
    </section>
  );
}
