import { useEffect, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";

type Sort = "newest" | "price-asc" | "price-desc";

const PRODUCTS_PER_PAGE = 12;

function visiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages, currentPage]);
  if (currentPage > 2) pages.add(currentPage - 1);
  if (currentPage < totalPages - 1) pages.add(currentPage + 1);
  return Array.from(pages).sort((a, b) => a - b);
}

export function CategoryView({ category }: { category: Category }) {
  const { getProductsPage, getCollections } = useStore();
  const [sort, setSort] = useState<Sort>("newest");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [page, setPage] = useState(1);

  const isFiltered = Boolean((minPrice && minPrice !== "0") || (maxPrice && maxPrice !== "0"));

  const resetPriceFilter = () => {
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [category.id, minPrice, maxPrice, sort]);

  // Get collections belonging to this category
  const collections = useMemo(() => getCollections(category.id), [getCollections, category.id]);

  const pageResult = useMemo(() => {
    const minVal = minPrice !== "" ? Number(minPrice) || 0 : undefined;
    const maxVal = maxPrice !== "" && Number(maxPrice) > 0 ? Number(maxPrice) : undefined;

    return getProductsPage({
      categoryId: category.id,
      ...(minVal !== undefined ? { minPrice: minVal } : {}),
      ...(maxVal !== undefined ? { maxPrice: maxVal } : {}),
      sort,
      page,
      pageSize: PRODUCTS_PER_PAGE,
    });
  }, [getProductsPage, category.id, minPrice, maxPrice, sort, page]);

  const shownFrom = pageResult.total === 0 ? 0 : (pageResult.page - 1) * pageResult.pageSize + 1;
  const shownTo = Math.min(pageResult.page * pageResult.pageSize, pageResult.total);
  const pages = visiblePages(pageResult.page, pageResult.totalPages);

  return (
    <>
      {/* 1. Top-Level Category Banner */}
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
                    : "h-auto max-h-none object-contain opacity-100 block sm:max-h-[440px] sm:object-cover",
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

      {/* 2. Filter & Sort Bar */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#666666] p-5 sm:p-7 text-white shadow-lg border border-white/20 ring-1 ring-black/5">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl text-white font-normal">
              {category.name} Range
            </h2>
            <p className="text-xs text-white/80 mt-1">
              Showing {shownFrom}-{shownTo} of {pageResult.total} curated frames & items across{" "}
              {collections.length} collections
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto sm:shrink-0">
            <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-1.5 gap-y-1 rounded-full border border-white bg-white px-2.5 py-2 text-xs text-black shadow-sm sm:w-auto sm:flex-nowrap sm:justify-start sm:gap-2 sm:px-4">
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
                  className="h-7 w-14 rounded-lg border border-gray-300 bg-gray-50 px-2 text-xs font-semibold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black sm:w-16"
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
                  className="h-7 w-16 rounded-lg border border-gray-300 bg-gray-50 px-2 text-xs font-semibold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black sm:w-20"
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

            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger
                aria-label="Sort products"
                className="min-h-11 w-full rounded-full bg-white text-black border border-white hover:bg-black hover:text-white hover:border-black active:bg-black active:text-white active:border-black data-[state=open]:bg-black data-[state=open]:text-white data-[state=open]:border-black transition-all duration-200 shadow-sm cursor-pointer sm:w-[180px]"
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

      {/* 3. Paginated Product Grid */}
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 mt-10">
        {pageResult.items.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {pageResult.items.map((p, i) => (
                <Reveal key={p.id} delay={i * 50}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>

            {pageResult.totalPages > 1 && (
              <Pagination className="mt-10">
                <PaginationContent className="flex-wrap justify-center gap-2">
                  <PaginationItem>
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={pageResult.page === 1}
                      className="min-h-11 rounded-full border border-stone bg-card px-4 text-sm font-semibold text-ink transition hover:border-gold hover:text-gold disabled:pointer-events-none disabled:opacity-40"
                    >
                      Previous
                    </button>
                  </PaginationItem>

                  {pages.map((pageNumber, index) => (
                    <PaginationItem key={pageNumber} className="flex items-center gap-2">
                      {index > 0 && pageNumber - pages[index - 1]! > 1 && <PaginationEllipsis />}
                      <button
                        type="button"
                        aria-current={pageNumber === pageResult.page ? "page" : undefined}
                        onClick={() => setPage(pageNumber)}
                        className={cn(
                          "flex h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm font-semibold transition",
                          pageNumber === pageResult.page
                            ? "border-jet bg-jet text-cream"
                            : "border-stone bg-card text-ink hover:border-gold hover:text-gold",
                        )}
                      >
                        {pageNumber}
                      </button>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((current) => Math.min(pageResult.totalPages, current + 1))
                      }
                      disabled={pageResult.page === pageResult.totalPages}
                      className="min-h-11 rounded-full border border-stone bg-card px-4 text-sm font-semibold text-ink transition hover:border-gold hover:text-gold disabled:pointer-events-none disabled:opacity-40"
                    >
                      Next
                    </button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
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
