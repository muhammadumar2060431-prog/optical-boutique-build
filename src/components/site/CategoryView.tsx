import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { Category } from "@/lib/types";

import { ProductCard } from "./ProductCard";
import { Reveal } from "./Reveal";
import { useFilters } from "./filters";
import { cn } from "@/lib/utils";

type Sort = "newest" | "price-asc" | "price-desc";

export function CategoryView({ category }: { category: Category }) {
  const { getProducts, getCollections } = useStore();
  const [sort, setSort] = useState<Sort>("newest");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  const isFiltered = Boolean((minPrice && minPrice !== "0") || (maxPrice && maxPrice !== "0"));

  const resetPriceFilter = () => {
    setMinPrice("");
    setMaxPrice("");
  };

  // Get collections belonging to this category
  const collections = useMemo(() => getCollections(category.id), [getCollections, category.id]);

  // All filtered products for this category
  const allCategoryProducts = useMemo(() => {
    const minVal = minPrice !== "" ? Number(minPrice) || 0 : 0;
    const maxVal = maxPrice !== "" && Number(maxPrice) > 0 ? Number(maxPrice) : Infinity;

    const list = getProducts({ categoryId: category.id }).filter((p) => {
      const price = p.salePrice ?? p.price;
      return price >= minVal && price <= maxVal;
    });

    return [...list].sort((a, b) => {
      const priceA = a.salePrice ?? a.price;
      const priceB = b.salePrice ?? b.price;
      if (sort === "price-asc") return priceA - priceB;
      if (sort === "price-desc") return priceB - priceA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [getProducts, category.id, minPrice, maxPrice, sort]);

  return (
    <>
      {/* ── 1. Top-Level Category Banner ────────────────────────────── */}
      {category.banner &&
        category.banner.image &&
        (() => {
          const hasText = Boolean(
            category.banner.heading?.trim() || category.banner.subtext?.trim(),
          );
          return (
            <section className="relative isolate overflow-hidden bg-jet">
              <img
                src={category.banner.image}
                alt={category.banner.heading || category.name}
                loading="lazy"
                className={cn(
                  "w-full object-cover transition-all",
                  hasText
                    ? "absolute inset-0 h-full opacity-65"
                    : "h-auto max-h-[440px] opacity-100 block",
                )}
              />
              {hasText && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-jet via-jet/80 to-transparent" />
                  <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
                    <div className="max-w-xl space-y-4">
                      <span className="eyebrow text-gold font-bold tracking-widest">
                        Official Category
                      </span>
                      <h1 className="font-display text-4xl text-cream sm:text-6xl font-normal">
                        {category.banner.heading}
                      </h1>
                      {category.banner.subtext?.trim() && (
                        <p className="text-sm text-cream/80 sm:text-base leading-relaxed">
                          {category.banner.subtext}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </section>
          );
        })()}

      {/* ── 2. Filter & Sort Bar ──────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#666666] p-5 sm:p-7 text-white shadow-lg border border-white/20 ring-1 ring-black/5">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl text-white font-normal">
              {category.name} Range
            </h2>
            <p className="text-xs text-white/80 mt-1">
              Showing {allCategoryProducts.length} curated frames & items across{" "}
              {collections.length} collections
            </p>
          </div>

          <div className="flex flex-wrap shrink-0 items-center gap-3">
            {/* Price Range Filter (Min to Max) */}
            <div className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full border border-white shadow-sm text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-gray-500 mr-1 hidden sm:inline">
                Price Range (Rs.)
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 text-[11px] font-medium">Min</span>
                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-16 h-7 rounded-lg border border-gray-300 bg-gray-50 px-2 text-xs text-black font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="0"
                />
              </div>

              <span className="text-gray-400 font-bold">-</span>

              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 text-[11px] font-medium">Max</span>
                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-20 h-7 rounded-lg border border-gray-300 bg-gray-50 px-2 text-xs text-black font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Max"
                />
              </div>

              {isFiltered && (
                <button
                  type="button"
                  onClick={resetPriceFilter}
                  title="Clear price filter"
                  className="ml-1 text-[11px] font-semibold text-gray-500 hover:text-black underline transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger
                aria-label="Sort products"
                className="min-h-11 w-[180px] rounded-full bg-white text-black border border-white hover:bg-black hover:text-white hover:border-black active:bg-black active:text-white active:border-black data-[state=open]:bg-black data-[state=open]:text-white data-[state=open]:border-black transition-all duration-200 shadow-sm cursor-pointer"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* ── 3. Unified 4-Column Product Grid ─── */}
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 mt-10">
        {allCategoryProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {allCategoryProducts.map((p, i) => (
              <Reveal key={p.id} delay={i * 50}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-stone bg-card px-6 py-20 text-center">
            <p className="font-display text-2xl">No products found</p>
            <p className="mt-2 text-sm text-ink-muted">
              Try adjusting your filters or price range to explore more options.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
