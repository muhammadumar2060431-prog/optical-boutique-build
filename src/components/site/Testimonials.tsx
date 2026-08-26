import { Star } from "lucide-react";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

import { Reveal } from "./Reveal";

export function Testimonials() {
  const { testimonials } = useStore();
  if (!testimonials.length) return null;

  return (
    <section className="bg-background py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <p className="eyebrow text-gold">Word of mouth</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">What our customers say</h2>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.id} delay={i * 70}>
              <figure className="flex h-full flex-col gap-4 rounded-xl border border-stone bg-card p-7">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      className={cn(
                        "h-4 w-4",
                        s < t.rating ? "fill-gold text-gold" : "text-stone",
                      )}
                    />
                  ))}
                </div>
                <blockquote className="text-sm leading-relaxed text-ink">“{t.quote}”</blockquote>
                <figcaption className="mt-auto flex items-center gap-3 pt-2">
                  {t.photo ? (
                    <img
                      src={t.photo}
                      alt={t.name}
                      loading="lazy"
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/50 text-xs text-gold">
                      {t.name.charAt(0)}
                    </span>
                  )}
                  <span className="truncate text-xs tracking-[0.16em] uppercase text-ink-muted">
                    {t.name}
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
