import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Play, ShoppingBag, Sparkles, X } from "lucide-react";

import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { sanitizeHref } from "@/lib/security";
import { formatPrice, useStore } from "@/lib/store";
import type { SocialPlatform, SocialReel } from "@/lib/types";

// Platform Icon Badges
function PlatformBadge({ platform }: { platform: SocialPlatform }) {
  switch (platform) {
    case "instagram":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
          <span>Insta</span>
        </span>
      );
    case "tiktok":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-black/90 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm border border-white/20">
          <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
          </svg>
          <span>TikTok</span>
        </span>
      );
    case "youtube":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#ff0000] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
          <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          <span>Shorts</span>
        </span>
      );
    case "facebook":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#1877f2] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
          <span>FB Reel</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gold/90 text-primary-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
          <span>Video</span>
        </span>
      );
  }
}

export function SocialProofReels() {
  const { socialReels, products } = useStore();
  const [selectedReel, setSelectedReel] = useState<SocialReel | null>(null);

  const activeReels = socialReels.filter((r) => r.enabled);

  if (activeReels.length === 0) return null;

  // Duplicate reels 4 times for seamless infinite loop (matching customer reviews pattern)
  const items = [...activeReels, ...activeReels, ...activeReels, ...activeReels];

  const taggedProduct = selectedReel?.productId
    ? products.find((p) => p.id === selectedReel.productId)
    : null;

  // Convert video URL to embeddable URL if YouTube/etc
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    const clean = sanitizeHref(url, "");
    const ytMatch = clean.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
    );
    if (ytMatch?.[1]) {
      return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
    }
    return clean;
  };

  const currentIndex = selectedReel ? activeReels.findIndex((r) => r.id === selectedReel.id) : -1;

  return (
    <section className="bg-[#666666] text-white py-16 sm:py-24 border-b border-stone/50 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 mb-10">
        {/* ── Section Header ── */}
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="eyebrow text-gold font-bold tracking-[0.2em] uppercase text-xs sm:text-sm flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>SOCIAL PROOF & REEL REVIEWS</span>
              </p>
              <h2 className="font-display text-3xl sm:text-4xl text-white font-semibold">
                Seen on Creators & Real Customers
              </h2>
            </div>
            <p className="text-sm sm:text-base text-white/80 max-w-md">
              Real unboxings, style breakdowns, and daily wear reviews from our community. Click any
              video to play.
            </p>
          </div>
        </Reveal>
      </div>

      {/* ── Seamless Infinite Scrollable Reels Track (Matching Customer Reviews) ── */}
      <div className="reels-scroll-outer" aria-label="Seen on Creators Reels">
        <div className="reels-track">
          {items.map((reel, index) => {
            const product = reel.productId ? products.find((p) => p.id === reel.productId) : null;

            return (
              <div
                key={`${reel.id}-${index}`}
                onClick={() => setSelectedReel(reel)}
                className="group relative flex-shrink-0 w-[240px] sm:w-[280px] aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer border border-stone/80 bg-jet shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:border-gold/60"
              >
                {/* Thumbnail Image */}
                <img
                  src={reel.thumbnail}
                  alt={reel.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40 group-hover:from-black/95 transition-colors" />

                {/* Top Header: Platform Tag */}
                <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
                  <PlatformBadge platform={reel.platform} />
                  {product && (
                    <span className="flex items-center gap-1 text-[10px] bg-black/60 backdrop-blur-md text-cream/90 px-2 py-0.5 rounded-full border border-white/10 font-medium">
                      <ShoppingBag className="h-2.5 w-2.5 text-gold" />
                      <span>Tagged</span>
                    </span>
                  )}
                </div>

                {/* Center Play Button */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 border-white/80 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-300 group-hover:scale-115 group-hover:bg-gold group-hover:border-gold group-hover:text-jet shadow-xl">
                    <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-current translate-x-0.5" />
                  </div>
                </div>

                {/* Bottom Bar: Creator Info & Duration */}
                <div className="absolute inset-x-0 bottom-0 p-4 space-y-2 z-10">
                  <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {reel.creatorName && (
                        <p className="text-xs sm:text-sm font-semibold text-white truncate drop-shadow-sm">
                          {reel.creatorName}
                        </p>
                      )}
                      {reel.creatorHandle && (
                        <p className="text-[11px] text-gold-soft truncate font-mono">
                          {reel.creatorHandle}
                        </p>
                      )}
                    </div>

                    {reel.duration && (
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-white bg-black/80 px-2 py-0.5 rounded backdrop-blur-xs shrink-0 tracking-wider">
                        {reel.duration}
                      </span>
                    )}
                  </div>

                  {/* Reel Caption/Title */}
                  <p className="text-xs text-white/85 line-clamp-2 leading-snug">{reel.title}</p>

                  {/* Tagged Product Pill */}
                  {product && (
                    <div className="pt-1">
                      <div className="flex items-center gap-2 rounded-lg bg-white/10 backdrop-blur-md p-1.5 border border-white/10 hover:bg-white/20 transition-colors">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-7 w-7 rounded object-cover border border-white/20"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-white truncate">
                            {product.name}
                          </p>
                          <p className="text-[10px] text-gold font-bold">
                            {formatPrice(product.salePrice ?? product.price)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Reel Video Modal Player ── */}
      <Dialog open={selectedReel !== null} onOpenChange={(open) => !open && setSelectedReel(null)}>
        <DialogContent className="max-w-md sm:max-w-lg p-0 bg-jet border-stone overflow-hidden rounded-2xl text-white">
          {selectedReel && (
            <div className="relative flex flex-col h-[80vh] max-h-[750px]">
              {/* Modal Top Bar */}
              <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={selectedReel.platform} />
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {selectedReel.creatorName || "OPTIQUE Community"}
                    </p>
                    <p className="text-[10px] text-gold-soft font-mono">
                      {selectedReel.creatorHandle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white/80 hover:text-white rounded-full bg-black/40"
                    onClick={() => setSelectedReel(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Video Player Frame */}
              <div className="flex-1 w-full bg-black flex items-center justify-center relative overflow-hidden">
                {selectedReel.videoUrl.includes("youtube") ||
                  selectedReel.videoUrl.includes("youtu.be") ? (
                  <iframe
                    src={getEmbedUrl(selectedReel.videoUrl)}
                    title={selectedReel.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : selectedReel.videoUrl.endsWith(".mp4") ||
                  selectedReel.videoUrl.endsWith(".webm") ? (
                  <video
                    src={selectedReel.videoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center">
                    <img
                      src={selectedReel.thumbnail}
                      alt={selectedReel.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                    <div className="relative z-10 space-y-4 max-w-xs">
                      <div className="h-16 w-16 rounded-full bg-gold/20 text-gold border border-gold flex items-center justify-center mx-auto">
                        <Play className="h-8 w-8 fill-current translate-x-0.5" />
                      </div>
                      <p className="text-sm font-semibold">{selectedReel.title}</p>
                      <a
                        href={sanitizeHref(selectedReel.videoUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-jet hover:bg-gold/90"
                      >
                        <span>Watch on {selectedReel.platform}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Bottom: Tagged Product & Navigation */}
              <div className="p-4 bg-black/90 border-t border-stone/40 space-y-3 z-20">
                <p className="text-xs text-white/90 line-clamp-2">{selectedReel.title}</p>

                {taggedProduct && (
                  <div className="flex items-center justify-between gap-3 bg-white/10 rounded-xl p-2.5 border border-white/10">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={taggedProduct.image}
                        alt={taggedProduct.name}
                        className="h-10 w-10 rounded-lg object-cover border border-white/20"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {taggedProduct.name}
                        </p>
                        <p className="text-xs text-gold font-bold">
                          {formatPrice(taggedProduct.salePrice ?? taggedProduct.price)}
                        </p>
                      </div>
                    </div>

                    <Link
                      to="/product/$slug"
                      params={{ slug: taggedProduct.slug }}
                      onClick={() => setSelectedReel(null)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3.5 py-1.5 text-xs font-bold text-jet hover:bg-gold/90 shrink-0"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>Shop Look</span>
                    </Link>
                  </div>
                )}

                {/* Prev/Next inside modal */}
                <div className="flex items-center justify-between text-xs text-ink-muted pt-1">
                  <button
                    type="button"
                    disabled={currentIndex <= 0}
                    onClick={() => {
                      if (currentIndex > 0) setSelectedReel(activeReels[currentIndex - 1] ?? null);
                    }}
                    className="hover:text-gold disabled:opacity-30 disabled:hover:text-ink-muted"
                  >
                    ← Previous Reel
                  </button>
                  <span>
                    {currentIndex + 1} of {activeReels.length}
                  </span>
                  <button
                    type="button"
                    disabled={currentIndex < 0 || currentIndex >= activeReels.length - 1}
                    onClick={() => {
                      if (currentIndex >= 0 && currentIndex < activeReels.length - 1) {
                        setSelectedReel(activeReels[currentIndex + 1] ?? null);
                      }
                    }}
                    className="hover:text-gold disabled:opacity-30 disabled:hover:text-ink-muted"
                  >
                    Next Reel →
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
