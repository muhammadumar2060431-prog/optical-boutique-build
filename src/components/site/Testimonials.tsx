import { useState } from "react";
import { CheckCircle2, Maximize2, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import type { Testimonial } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Reveal } from "./Reveal";

export function Testimonials() {
  const { testimonials } = useStore();
  const manualTestimonials = testimonials.filter(
    (testimonial) => testimonial.source !== "customer",
  );
  const [selectedReview, setSelectedReview] = useState<Testimonial | null>(null);

  if (!manualTestimonials.length) return null;

  // Build a single block with enough items to span wide viewports
  let singleBlock = [...manualTestimonials];
  while (singleBlock.length < 10) {
    singleBlock = [...singleBlock, ...manualTestimonials];
  }
  const items = [...singleBlock, ...singleBlock];

  return (
    <section className="overflow-hidden border-b border-stone/40 bg-background py-12 sm:py-24">
      <div className="mx-auto mb-8 max-w-7xl px-4 text-center sm:mb-10 sm:px-6 sm:text-left">
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-gold font-bold tracking-[0.2em] uppercase text-xs sm:text-sm">
                Word of mouth
              </p>
              <h2 className="mx-auto mt-2 max-w-[11ch] font-display text-[2.35rem] font-semibold leading-tight tracking-normal text-foreground sm:mx-0 sm:max-w-none sm:text-4xl">
                Customer Reviews & Proofs
              </h2>
            </div>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-ink-muted sm:mx-0">
              Real screenshots from WhatsApp chats, Facebook reviews, and happy customer photos.
              Click to enlarge.
            </p>
          </div>
        </Reveal>
      </div>

      {/* ── Infinite Scrollable Reviews Track (Supporting Screenshot Proofs) ── */}
      <div className="testimonials-scroll-outer" aria-label="Customer Reviews">
        <div className="testimonials-track">
          {items.map((t, i) => {
            const hasImage = Boolean(t.reviewImage);

            if (hasImage) {
              return (
                <div
                  key={`${t.id}-${i}`}
                  onClick={() => setSelectedReview(t)}
                  className="group relative aspect-[9/16] w-[190px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-stone/80 bg-jet shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:border-gold/70 hover:shadow-xl sm:w-[260px]"
                >
                  {/* Review Screenshot Image (Matching Reference Image) */}
                  <img
                    src={t.reviewImage!}
                    alt={`Review by ${t.name}`}
                    loading="lazy"
                    className="w-full h-full object-contain object-center"
                  />

                  {/* Gradient Overlay for Readable Badges */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40 group-hover:from-black/90 transition-colors" />

                  {/* Top: Rating Stars & Zoom Icon */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
                    <div className="flex gap-0.5 bg-black/60 backdrop-blur-xs px-2 py-1 rounded-full border border-white/10">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          className={cn(
                            "h-3 w-3",
                            s < t.rating ? "fill-amber-400 text-amber-400" : "text-zinc-500/60",
                          )}
                        />
                      ))}
                    </div>

                    <span className="h-7 w-7 rounded-full bg-black/60 backdrop-blur-xs text-white flex items-center justify-center border border-white/10 opacity-80 group-hover:opacity-100 group-hover:bg-gold group-hover:text-jet transition-all">
                      <Maximize2 className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  {/* Bottom: Customer Info & Quote Snippet */}
                  <div className="absolute inset-x-0 bottom-0 p-3.5 space-y-1.5 z-10">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white truncate drop-shadow-sm">
                        {t.name}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full backdrop-blur-xs">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        <span>Verified</span>
                      </span>
                    </div>

                    {t.quote && (
                      <p className="text-[11px] text-white/85 line-clamp-2 leading-snug">
                        “{t.quote}”
                      </p>
                    )}
                  </div>
                </div>
              );
            }

            // Fallback for text-only review cards
            return (
              <figure
                key={`${t.id}-${i}`}
                className="flex w-[260px] shrink-0 flex-col gap-4 rounded-2xl border border-stone bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-md sm:w-[360px] sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={cn(
                          "h-4 w-4",
                          s < t.rating ? "fill-amber-400 text-amber-400" : "text-zinc-400/60",
                        )}
                      />
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Verified</span>
                  </span>
                </div>

                <blockquote className="text-sm leading-relaxed text-foreground font-normal line-clamp-4">
                  “{t.quote}”
                </blockquote>

                <figcaption className="mt-auto flex items-center gap-3 pt-3 border-t border-stone/40">
                  {t.photo ? (
                    <img
                      src={t.photo}
                      alt={t.name}
                      loading="lazy"
                      className="h-10 w-10 shrink-0 rounded-full object-cover border border-gold/40"
                    />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/15 border border-gold/60 text-xs font-bold text-gold">
                      {t.name.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold tracking-wider uppercase text-foreground">
                      {t.name}
                    </p>
                    <p className="text-[10px] text-ink-muted">Verified Customer</p>
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>

      {/* ── Review Screenshot Lightbox Modal ── */}
      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="max-w-md sm:max-w-lg p-0 bg-jet border-stone overflow-hidden rounded-2xl text-white">
          {selectedReview && (
            <div className="flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-stone/40 bg-black/60">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{selectedReview.name}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Verified Review</span>
                    </span>
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={cn(
                          "h-3 w-3",
                          s < selectedReview.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-zinc-500/60",
                        )}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white/80 hover:text-white rounded-full bg-black/40"
                  onClick={() => setSelectedReview(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Full Screenshot View */}
              <div className="flex-1 overflow-y-auto bg-black flex items-center justify-center p-2">
                {selectedReview.reviewImage && (
                  <img
                    src={selectedReview.reviewImage}
                    alt={`Screenshot review by ${selectedReview.name}`}
                    className="max-h-[65vh] w-auto object-contain rounded-lg"
                  />
                )}
              </div>

              {/* Footer Quote */}
              {selectedReview.quote && (
                <div className="p-4 bg-black/90 border-t border-stone/40">
                  <p className="text-xs text-white/90 leading-relaxed italic">
                    “{selectedReview.quote}”
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
