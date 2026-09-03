import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { Category } from "@/lib/types";

import { FilterSheet } from "./FilterSheet";
import { ProductCard } from "./ProductCard";
import { Reveal } from "./Reveal";
import { useFilters } from "./filters";

type Sort = "newest" | "price-asc" | "price-desc";

export function CategoryView({ category }: { category: Category }) {
  const { getProducts, getCollections } = useStore();
  const { filters } = useFilters();
  const [sort, setSort] = useState<Sort>("newest");

  // Get collections belonging to this category
  const collections = useMemo(
    () => getCollections(category.id),
    [getCollections, category.id],
  );

  // All filtered products for this category
  const allCategoryProducts = useMemo(() => {
    let list = getProducts({ categoryId: category.id }).filter(
      (p) => p.price >= filters.min && p.price <= filters.max,
    );
    if (filters.variantLabels.length) {
      list = list.filter((p) => p.variants.some((v) => filters.variantLabels.includes(v.label)));
    }
    return [...list].sort((a, b) => {
      const priceA = a.salePrice ?? a.price;
      const priceB = b.salePrice ?? b.price;
      if (sort === "price-asc") return priceA - priceB;
      if (sort === "price-desc") return priceB - priceA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [getProducts, category.id, filters, sort]);

  return (
    <>
      {/* ── 1. Top-Level Category Banner ────────────────────────────── */}
      {category.banner && (
        <section className="relative isolate overflow-hidden bg-jet">
          <img
            src={category.banner.image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-65"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-jet via-jet/80 to-transparent" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-xl space-y-4">
              <span className="eyebrow text-gold font-bold tracking-widest">
                Official Category
              </span>
              <h1 className="font-display text-4xl text-cream sm:text-6xl font-normal">
                {category.banner.heading || category.name}
              </h1>
              <p className="text-sm text-cream/80 sm:text-base leading-relaxed">
                {category.banner.subtext}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── 2. Filter & Sort Bar ──────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone pb-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl">{category.name} Range</h2>
            <p className="text-xs text-ink-muted mt-1">
              Showing {allCategoryProducts.length} curated frames & items across {collections.length} collections
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <FilterSheet />
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger aria-label="Sort products" className="min-h-11 w-[180px] rounded-full">
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

      {/* ── 3. Sequential Collection Sections with Static 4-Col Grid ─── */}
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 space-y-16 mt-10">
        {collections.length > 0 ? (
          collections.map((col) => {
            const colProducts = allCategoryProducts.filter((p) => p.collectionId === col.id);
            if (colProducts.length === 0) return null;

            return (
              <section key={col.id} className="space-y-8 scroll-mt-20" id={col.slug}>
                {/* Collection Dedicated Banner */}
                {col.banner && (
                  <div className="relative isolate overflow-hidden rounded-2xl bg-jet shadow-md border border-stone">
                    <img
                      src={col.banner.image}
                      alt={col.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-50 transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-jet via-jet/80 to-transparent" />
                    <div className="relative px-6 py-12 sm:px-10 sm:py-16 max-w-xl space-y-2.5">
                      <span className="eyebrow text-gold font-bold uppercase tracking-widest">
                        {category.name} Collection
                      </span>
                      <h3 className="font-display text-2xl text-cream sm:text-4xl font-normal">
                        {col.banner.heading || col.name}
                      </h3>
                      {col.banner.subtext && (
                        <p className="text-xs sm:text-sm text-cream/80 leading-relaxed">
                          {col.banner.subtext}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* If no banner, show clear heading */}
                {!col.banner && (
                  <div className="border-l-2 border-gold pl-4">
                    <h3 className="font-display text-2xl sm:text-3xl">{col.name}</h3>
                    {col.description && <p className="text-xs text-ink-muted">{col.description}</p>}
                  </div>
                )}

                {/* 4 Products per row static vertical grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {colProducts.map((p, i) => (
                    <Reveal key={p.id} delay={i * 50}>
                      <ProductCard product={p} />
                    </Reveal>
                  ))}
                </div>
              </section>
            );
          })
        ) : null}

        {/* Fallback for products without an assigned collection */}
        {allCategoryProducts.some((p) => !p.collectionId) && (
          <section className="space-y-6 pt-6">
            <div className="border-l-2 border-gold pl-4">
              <h3 className="font-display text-2xl">Other {category.name} Pieces</h3>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {allCategoryProducts
                .filter((p) => !p.collectionId)
                .map((p, i) => (
                  <Reveal key={p.id} delay={i * 50}>
                    <ProductCard product={p} />
                  </Reveal>
                ))}
            </div>
          </section>
        )}

        {allCategoryProducts.length === 0 && (
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
