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
  const { getProducts } = useStore();
  const { filters } = useFilters();
  const [sort, setSort] = useState<Sort>("newest");

  const products = useMemo(() => {
    let list = getProducts({ categoryId: category.id }).filter(
      (p) => p.price >= filters.min && p.price <= filters.max,
    );
    if (filters.variantLabels.length) {
      list = list.filter((p) => p.variants.some((v) => filters.variantLabels.includes(v.label)));
    }
    return [...list].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [getProducts, category.id, filters, sort]);

  return (
    <>
      {category.banner && (
        <section className="relative isolate overflow-hidden bg-jet">
          <img
            src={category.banner.image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-jet via-jet/70 to-transparent" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-xl space-y-4">
              <h1 className="font-display text-3xl text-cream sm:text-5xl">
                {category.banner.heading}
              </h1>
              <p className="text-sm text-cream/75 sm:text-base">{category.banner.subtext}</p>
              <a
                href={category.banner.ctaLink}
                className="inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-xs tracking-[0.18em] uppercase text-primary-foreground transition-opacity hover:opacity-90"
              >
                {category.banner.ctaText}
              </a>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-stone pb-6 sm:flex sm:justify-between">
          <div className="min-w-0">
            {!category.banner && <p className="eyebrow text-gold">Collection</p>}
            <h2 className="truncate font-display text-3xl sm:text-4xl">{category.name}</h2>
            <p className="text-sm text-ink-muted">
              {products.length} {products.length === 1 ? "product" : "products"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <FilterSheet />
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger aria-label="Sort products" className="min-h-11 w-[170px] rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone bg-card px-6 py-20 text-center">
            <p className="font-display text-2xl">Nothing here just yet</p>
            <p className="mt-2 text-sm text-ink-muted">
              No products match this view — try clearing the filters, or check back soon.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={i * 60}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
