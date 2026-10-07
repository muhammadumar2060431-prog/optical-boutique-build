import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, RefreshCw } from "lucide-react";

import { ProductCard } from "@/components/site/ProductCard";
import { Reveal } from "@/components/site/Reveal";
import { useStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useFeaturedProductCounts, useInfiniteFeaturedProducts } from "@/lib/product-selection";
import { cn } from "@/lib/utils";

export function CategoryBestsellersShowcase() {
  const { categories, collections, products } = useStore();
  const sectionRef = useRef<HTMLElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [categories.length]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [categories]);

  const [selectedCatId, setSelectedCatId] = useState<string>(
    () => sortedCategories[0]?.id ?? "cat-glasses",
  );

  // Keep selected category valid if categories change
  const activeCategory = useMemo(() => {
    return sortedCategories.find((c) => c.id === selectedCatId) || sortedCategories[0];
  }, [sortedCategories, selectedCatId]);

  // Collections belonging to this category
  const activeCategoryCollections = useMemo(() => {
    if (!activeCategory) return [];
    return collections
      .filter((col) => col.categoryId === activeCategory.id)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [collections, activeCategory]);

  // Only published products for active category that are marked as featured OR bestseller
  const selection = useInfiniteFeaturedProducts(activeCategory?.id, visible, products);
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = selection;
  const catProducts = selection.items;
  useEffect(() => {
    const target = loadMoreRef.current;
    if (
      !target ||
      !hasNextPage ||
      isFetchingNextPage ||
      isFetchNextPageError ||
      !("IntersectionObserver" in window)
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void fetchNextPage({ cancelRefetch: false });
      },
      { rootMargin: "200px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    catProducts.length,
    activeCategory?.id,
  ]);
  const counts = useFeaturedProductCounts(sortedCategories.map((category) => category.id));

  // Featured collection banner for the active category (if any)
  const categoryBannerCollection = useMemo(() => {
    return activeCategoryCollections.find((c) => c.banner && (c.banner.image || c.banner.heading));
  }, [activeCategoryCollections]);

  if (!categories || categories.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="bg-background py-16 sm:py-24 border-b border-stone/50 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* ── Section Title ── */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <Reveal>
            <p className="eyebrow text-gold font-bold tracking-[0.2em] uppercase text-xs sm:text-sm">
              Curated Collections
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl text-foreground font-semibold">
              Shop by Category
            </h2>
            <p className="mt-3 text-sm sm:text-base text-ink-muted">
              Select a category to explore our top-rated best sellers and signature collection
              banners
            </p>
          </Reveal>
        </div>

        {/* ── Category Circular Avatars Bar (Glasses & Lenses) ── */}
        <Reveal delay={100}>
          <div className="flex items-center justify-center gap-8 sm:gap-16 md:gap-20 flex-wrap pb-4">
            {sortedCategories.map((cat) => {
              const isSelected = activeCategory?.id === cat.id;
              const productCount = isSupabaseConfigured
                ? counts.data?.[cat.id]
                : products.filter(
                    (p) =>
                      p.categoryId === cat.id &&
                      p.status === "Published" &&
                      Boolean(p.featured || p.isBestseller),
                  ).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCatId(cat.id)}
                  className="group flex flex-col items-center cursor-pointer transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-full"
                  aria-pressed={isSelected}
                  aria-label={`Show ${cat.name} collections and best sellers`}
                >
                  {/* Circular Image Frame */}
                  <div
                    className={cn(
                      "relative w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full overflow-hidden transition-all duration-300 transform",
                      isSelected
                        ? "ring-4 ring-gold ring-offset-4 ring-offset-background scale-105 shadow-xl shadow-gold/15"
                        : "ring-2 ring-stone/60 hover:ring-gold/60 hover:scale-105 opacity-85 hover:opacity-100 shadow-md",
                    )}
                  >
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        loading="lazy"
                        decoding="async"
                        width={208}
                        height={208}
                        className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-jet flex flex-col items-center justify-center text-cream p-4 text-center">
                        <span className="font-display text-2xl sm:text-3xl text-gold">
                          {cat.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-[11px] text-cream/70 mt-1 uppercase tracking-widest font-semibold">
                          {cat.name}
                        </span>
                      </div>
                    )}

                    {/* Subtle Overlay on Inactive */}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                    )}

                    {/* Active Glow Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 h-4 w-4 rounded-full bg-gold ring-2 ring-background animate-pulse" />
                    )}
                  </div>

                  {/* Category Title */}
                  <div className="mt-4 text-center">
                    <span
                      className={cn(
                        "font-display text-lg sm:text-xl md:text-2xl transition-colors tracking-wide capitalize",
                        isSelected
                          ? "text-gold font-bold"
                          : "text-foreground group-hover:text-gold font-medium",
                      )}
                    >
                      {cat.name}
                    </span>
                    <p className="text-[11px] text-ink-muted uppercase tracking-wider mt-0.5">
                      {productCount === undefined ? "..." : productCount}{" "}
                      {productCount === 1 ? "Featured Piece" : "Featured Pieces"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* ── Dynamic Collection Banners + Best Selling Products Grid ── */}
        <div className="mt-14 sm:mt-20 pt-10 border-t border-stone/40 space-y-12">
          {!visible || selection.isLoading ? (
            <p role="status" className="text-center text-sm text-ink-muted">
              Loading products...
            </p>
          ) : selection.isError && catProducts.length === 0 ? (
            <div role="alert" className="text-center text-sm text-ink-muted">
              <p>Products could not be loaded.</p>
              <button
                type="button"
                className="mt-2 underline"
                onClick={() => void selection.refetch()}
              >
                Retry
              </button>
            </div>
          ) : catProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone p-12 text-center bg-card/40">
              <p className="font-display text-lg text-foreground">
                No featured or best seller products in {activeCategory?.name} yet
              </p>
            </div>
          ) : (
            <>
              {/* Optional Collection Banner if available */}
              {categoryBannerCollection?.banner && (
                <div>
                  {(() => {
                    const col = categoryBannerCollection;
                    const hasImage = Boolean(col.banner?.image);
                    const hasText = Boolean(
                      col.banner?.heading?.trim() || col.banner?.subtext?.trim(),
                    );

                    if (hasImage && !hasText) {
                      return (
                        <div className="relative isolate overflow-hidden rounded-2xl bg-transparent">
                          <img
                            src={col.banner!.image}
                            alt={col.name}
                            loading="lazy"
                            width={1200}
                            height={500}
                            className="block h-auto w-full max-w-full object-fill sm:max-h-[460px] sm:min-h-[340px]"
                          />
                        </div>
                      );
                    }

                    return (
                      <div className="relative isolate overflow-hidden rounded-2xl bg-transparent min-h-[240px] sm:min-h-[320px] flex items-center">
                        {col.banner?.image ? (
                          <img
                            src={col.banner.image}
                            alt={col.name}
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover opacity-50"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-radial from-jet via-zinc-950 to-black" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-transparent" />

                        <div className="relative px-6 py-14 sm:px-12 sm:py-20 max-w-2xl space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="eyebrow text-gold font-bold uppercase tracking-[0.2em] text-xs">
                              {activeCategory?.name} Collection
                            </span>
                            <span className="text-zinc-500">•</span>
                            <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                              {selection.total} {selection.total === 1 ? "Item" : "Items"}
                            </span>
                          </div>

                          <h3 className="font-display text-2xl sm:text-4xl text-cream font-medium tracking-tight">
                            {col.banner?.heading || col.name}
                          </h3>

                          {col.banner?.subtext && (
                            <p className="text-xs sm:text-sm text-cream/80 leading-relaxed font-light pt-0.5">
                              {col.banner.subtext}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 4-Column Grid for ALL Products */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {catProducts.map((product, pIdx) => (
                  <Reveal key={product.id} delay={(pIdx % 12) * 60}>
                    <ProductCard product={product} />
                  </Reveal>
                ))}
              </div>

              {hasNextPage && (
                <div
                  ref={loadMoreRef}
                  className="flex min-h-12 items-center justify-center"
                  aria-live="polite"
                >
                  {isFetchingNextPage ? (
                    <p role="status" className="text-sm text-ink-muted">
                      Loading products...
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-sm underline"
                      onClick={() => void fetchNextPage()}
                    >
                      {isFetchNextPageError ? (
                        <RefreshCw className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {isFetchNextPageError ? "Retry" : "Load more"}
                    </button>
                  )}
                </div>
              )}

              {/* Explore All Category Link */}
              <div className="text-center pt-6">
                <Link
                  to={
                    activeCategory?.slug === "lenses"
                      ? "/lenses"
                      : activeCategory?.slug === "glasses"
                        ? "/glasses"
                        : "/glasses"
                  }
                  className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full border border-gold/40 bg-jet px-5 py-3.5 text-center text-xs font-bold uppercase tracking-[0.13em] text-cream shadow-md transition-all hover:scale-105 hover:bg-jet/90 sm:w-auto sm:max-w-none sm:px-8 sm:tracking-[0.16em] group"
                >
                  <span className="min-w-0 leading-snug">
                    Explore Full {activeCategory?.name} Boutique
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gold transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
