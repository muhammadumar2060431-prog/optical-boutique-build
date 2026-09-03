import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export function NewArrivalsShowcase() {
  const { products } = useStore();

  // Pick new arrivals or fallback to featured/all products
  const items = useMemo(() => {
    const list = products.filter((p) => p.isNewArrival);
    if (list.length >= 3) return list;
    // If fewer than 3 marked as new arrival, include bestsellers/featured to maintain the 3-item 3D stage
    return Array.from(new Set([...list, ...products.filter((p) => p.featured), ...products])).slice(0, 7);
  }, [products]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance every 6 seconds if not hovered
  const [isHovered, setIsHovered] = useState(false);
  useEffect(() => {
    if (isHovered || items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isHovered, items.length]);

  if (items.length === 0) return null;

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const currentProduct = items[currentIndex];

  // Helper to get item at relative offset (-1, 0, +1)
  const getItemAt = (offset: number): Product => {
    const idx = (currentIndex + offset + items.length) % items.length;
    return items[idx];
  };

  const leftItem = getItemAt(-1);
  const centerItem = currentProduct;
  const rightItem = getItemAt(1);

  return (
    <section
      className="relative w-full overflow-hidden bg-white py-14 sm:py-24 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="New Arrivals 3D Showcase"
    >
      {/* ── Left Navigation Arrow at the extreme left edge of the page ── */}
      <button
        type="button"
        onClick={prev}
        aria-label="Previous frame"
        className="absolute left-2 sm:left-6 md:left-8 top-1/2 -translate-y-16 sm:-translate-y-20 z-30 h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-neutral-300/70 hover:bg-neutral-800 hover:text-white backdrop-blur-md text-neutral-800 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-md cursor-pointer"
      >
        <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
      </button>

      {/* ── Right Navigation Arrow at the extreme right edge of the page ── */}
      <button
        type="button"
        onClick={next}
        aria-label="Next frame"
        className="absolute right-2 sm:right-6 md:right-8 top-1/2 -translate-y-16 sm:-translate-y-20 z-30 h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-neutral-300/70 hover:bg-neutral-800 hover:text-white backdrop-blur-md text-neutral-800 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-md cursor-pointer"
      >
        <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
      </button>

      <div className="w-full max-w-[1600px] mx-auto px-2 sm:px-6 md:px-12">
        {/* Stage Container with extra height for huge 3D frames */}
        <div className="relative flex items-center justify-center min-h-[440px] sm:min-h-[540px] md:min-h-[640px] w-full mx-auto">
          {/* 3D Products Stage */}
          <div className="relative w-full flex items-center justify-center">
            {/* Left Product (Extra large, angled, spread to far left with massive gap) */}
            {items.length > 1 && (
              <div
                onClick={prev}
                className="absolute left-1 sm:left-4 md:left-10 lg:left-16 z-10 w-48 sm:w-76 md:w-96 lg:w-[420px] opacity-30 hover:opacity-70 transition-all duration-500 cursor-pointer scale-75 lg:scale-80 blur-[0.2px]"
              >
                <div className="relative flex flex-col items-center">
                  <img
                    src={leftItem.newArrivalImage || leftItem.image}
                    alt={leftItem.name}
                    className="w-full h-44 sm:h-60 md:h-76 lg:h-88 object-contain mix-blend-multiply drop-shadow-lg"
                  />
                  {/* Floor Shadow */}
                  <div className="w-4/5 h-4 sm:h-6 bg-black/15 rounded-[50%] blur-[5px] mt-1" />
                </div>
              </div>
            )}

            {/* Center Active Product (Massive Eye-Catching 3D Frame) */}
            <div className="relative z-20 w-84 sm:w-[580px] md:w-[740px] lg:w-[900px] flex flex-col items-center">
              <Link
                to="/product/$slug"
                params={{ slug: centerItem.slug }}
                className="group relative flex flex-col items-center w-full"
              >
                {/* Huge Floating Eyewear */}
                <div className="relative w-full h-60 sm:h-80 md:h-[400px] lg:h-[460px] flex items-center justify-center float-bounce-active">
                  <img
                    key={centerItem.id}
                    src={centerItem.newArrivalImage || centerItem.image}
                    alt={centerItem.name}
                    className="w-full h-full object-contain mix-blend-multiply filter drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Wide Dynamic Soft Floor Shadow */}
                <div className="relative w-full h-12 flex items-center justify-center -mt-4">
                  <div className="w-4/5 sm:w-2/3 h-6 sm:h-8 bg-black/40 rounded-[50%] blur-[8px] sm:blur-[10px] floor-shadow-active" />
                </div>
              </Link>
            </div>

            {/* Right Product (Extra large, angled, spread to far right with massive gap) */}
            {items.length > 2 && (
              <div
                onClick={next}
                className="absolute right-1 sm:right-4 md:right-10 lg:right-16 z-10 w-48 sm:w-76 md:w-96 lg:w-[420px] opacity-30 hover:opacity-70 transition-all duration-500 cursor-pointer scale-75 lg:scale-80 blur-[0.2px]"
              >
                <div className="relative flex flex-col items-center">
                  <img
                    src={rightItem.newArrivalImage || rightItem.image}
                    alt={rightItem.name}
                    className="w-full h-44 sm:h-60 md:h-76 lg:h-88 object-contain mix-blend-multiply drop-shadow-lg"
                  />
                  {/* Floor Shadow */}
                  <div className="w-4/5 h-4 sm:h-6 bg-black/15 rounded-[50%] blur-[5px] mt-1" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Details Below Stage */}
        <div className="text-center mt-6 space-y-4">
          <Link
            to="/product/$slug"
            params={{ slug: centerItem.slug }}
            className="inline-block group"
          >
            <h3 className="font-sans text-base sm:text-lg font-medium text-neutral-800 tracking-wide group-hover:text-gold transition-colors">
              {centerItem.name}
            </h3>
          </Link>

          {/* SHOP NOW Black Pill Button */}
          <div>
            <Link
              to="/product/$slug"
              params={{ slug: centerItem.slug }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-neutral-900 hover:bg-black text-white px-8 py-2.5 text-xs font-bold tracking-[0.14em] uppercase transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
            >
              SHOP NOW
            </Link>
          </div>

          {/* Segmented Line Pagination (Exact match with Image 2) */}
          <div className="flex items-center justify-center gap-2 pt-6">
            {items.map((item, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className="h-6 flex items-center px-1 group cursor-pointer"
                >
                  <span
                    className={`h-[2px] transition-all duration-300 rounded-full ${
                      isActive
                        ? "w-8 sm:w-10 bg-neutral-900"
                        : "w-6 sm:w-8 bg-neutral-300 group-hover:bg-neutral-400"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
