import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useStore } from "@/lib/store";
import { sanitizeHref, sanitizeImageSrc } from "@/lib/security";
import { resolveHeroMobileImage } from "@/lib/hero-image";
import { cn } from "@/lib/utils";

const FALLBACK_HERO_IMAGE = "/about-sunglasses.jpg";

export function Hero() {
  const { heroSlides } = useStore();
  const slides = heroSlides.filter((s) => s.enabled);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [visitedSlides, setVisitedSlides] = useState<Set<string>>(() => new Set());

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const activeSlide = slides[index];
  const activeSlideId = activeSlide?.id;

  useEffect(() => {
    if (!activeSlideId) return;
    setVisitedSlides((current) =>
      current.has(activeSlideId) ? current : new Set([...current, activeSlideId]),
    );
  }, [activeSlideId]);

  const go = useCallback(
    (dir: number) =>
      setIndex((i) => (slides.length ? (i + dir + slides.length) % slides.length : 0)),
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

  // Check if active slide has a valid, non-failed mobile banner
  const activeMobileRaw = activeSlide?.mobileImage ? sanitizeImageSrc(activeSlide.mobileImage, "") : "";
  const activeHasMobileImage = Boolean(activeMobileRaw) && !failedImages.has(activeMobileRaw);

  const mobileHeightClass = activeHasMobileImage
    ? "h-[min(75vw,320px)] sm:h-[min(75vw,360px)]"
    : "h-[240px] sm:h-[300px]";

  const handleTouchStart = (e: React.TouchEvent) => {
    setPaused(true);
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setPaused(false);
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const deltaX = touchStartX.current - touchEndX.current;
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) go(1);
        else go(-1);
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <section
      className={cn(
        "relative left-1/2 isolate w-[100dvw] max-w-[100dvw] -translate-x-1/2 overflow-hidden bg-jet transition-[height] duration-300 ease-out",
        mobileHeightClass,
        "md:h-[min(37.5vw,380px)] lg:h-[min(37.5vw,480px,calc(100dvh-180px))] xl:h-[min(37.5vw,520px,calc(100dvh-180px))] 2xl:h-[min(37.5vw,560px,calc(100dvh-180px))]",
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {slides.map((slide, i) => {
        const hasText = Boolean(
          slide.eyebrow?.trim() ||
          slide.headline?.trim() ||
          slide.subtext?.trim() ||
          slide.ctaText?.trim(),
        );

        const originalDesktopImage = sanitizeImageSrc(slide.image, FALLBACK_HERO_IMAGE);
        const desktopImageSrc = failedImages.has(originalDesktopImage)
          ? FALLBACK_HERO_IMAGE
          : originalDesktopImage;

        const rawMobileImage = slide.mobileImage ? sanitizeImageSrc(slide.mobileImage, "") : "";
        const rawMobileFailed = failedImages.has(rawMobileImage);
        const hasValidMobile = Boolean(rawMobileImage) && !rawMobileFailed;

        const { src: mobileSrc, isMobileSpecific } = hasValidMobile
          ? resolveHeroMobileImage(rawMobileImage, desktopImageSrc)
          : { src: desktopImageSrc, isMobileSpecific: false };

        const ctaLink = sanitizeHref(slide.ctaLink, "");

        const imageElement =
          i === index || visitedSlides.has(slide.id) ? (
            <picture className="block h-full w-full">
              {isMobileSpecific && mobileSrc ? (
                <source
                  media="(max-width: 767px)"
                  srcSet={mobileSrc}
                  width={1200}
                  height={900}
                />
              ) : null}
              <img
                src={desktopImageSrc}
                alt={slide.headline || "Store banner"}
                width={1920}
                height={720}
                loading={i === index ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={i === 0 ? "high" : "auto"}
                className="block h-full w-full max-w-none object-cover object-center"
                onError={(e) => {
                  const img = e.currentTarget;
                  // If mobile source failed, drop mobile source and retry desktop
                  if (
                    isMobileSpecific &&
                    rawMobileImage &&
                    (img.currentSrc.includes(rawMobileImage) || !failedImages.has(rawMobileImage))
                  ) {
                    setFailedImages((current) => {
                      if (current.has(rawMobileImage)) return current;
                      const next = new Set(current);
                      next.add(rawMobileImage);
                      return next;
                    });
                    return;
                  }
                  // Otherwise mark desktop failed
                  setFailedImages((current) => {
                    if (current.has(originalDesktopImage)) return current;
                    const next = new Set(current);
                    next.add(originalDesktopImage);
                    return next;
                  });
                }}
              />
            </picture>
          ) : null;

        return (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-out",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            aria-hidden={i !== index}
            inert={i !== index}
          >
            {/* If pure image banner with link, make the image clickable */}
            {!hasText && ctaLink ? (
              <a
                href={ctaLink}
                className="block h-full w-full max-w-none cursor-pointer"
                aria-label={slide.headline || "View banner"}
              >
                {imageElement}
              </a>
            ) : (
              imageElement
            )}

            {/* Text Overlay & Gradient (Only rendered if text is provided) */}
            {hasText && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-jet/90 via-jet/60 to-jet/10" />
                <div className="absolute inset-0 flex items-center">
                  <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
                    <div className="max-w-xl space-y-4 sm:space-y-6">
                      {slide.eyebrow?.trim() && (
                        <p className="eyebrow text-gold-soft">{slide.eyebrow}</p>
                      )}
                      {slide.headline?.trim() && (
                        <h1 className="font-display text-[2.1rem] leading-[1.1] text-cream sm:text-5xl lg:text-6xl">
                          {slide.headline}
                        </h1>
                      )}
                      {slide.subtext?.trim() && (
                        <p className="max-w-md text-sm text-cream/80 sm:text-base">
                          {slide.subtext}
                        </p>
                      )}
                      {(slide.ctaText?.trim() || slide.headline?.trim()) && (
                        <div className="flex flex-wrap items-center gap-4 pt-2">
                          {slide.ctaText?.trim() && ctaLink && (
                            <a
                              href={ctaLink}
                              className="inline-flex min-h-11 items-center rounded-full bg-gold px-7 text-xs tracking-[0.18em] uppercase text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
                            >
                              {slide.ctaText}
                            </a>
                          )}
                          {slide.headline?.trim() && (
                            <a
                              href="/about"
                              className="min-h-11 border-b border-cream/40 pb-1 text-xs tracking-[0.18em] uppercase text-cream/80 transition-colors hover:border-gold hover:text-gold-soft"
                            >
                              Our Story
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}

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

      <div className="absolute bottom-2 sm:bottom-6 left-1/2 flex -translate-x-1/2 gap-1 sm:gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className="flex min-h-11 min-w-11 items-center justify-center p-2"
          >
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full border border-cream/60 transition-colors",
                i === index && "border-gold bg-gold",
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
