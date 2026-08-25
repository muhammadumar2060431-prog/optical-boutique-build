import { Link } from "@tanstack/react-router";

import { formatPrice, useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { getCategoryById, productStock, stockStatus } = useStore();
  const category = getCategoryById(product.categoryId);
  const stock = productStock(product);
  const status = stockStatus(stock);

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-xl border border-stone bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lens)]"
    >
      <div className="lens-ring relative aspect-square overflow-hidden bg-jet">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={1024}
          height={1024}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {status !== "In stock" && (
          <span className="absolute top-3 left-3 rounded-full bg-gold px-3 py-1 text-[10px] tracking-[0.16em] uppercase text-primary-foreground">
            {status === "Out of stock" ? "Sold out" : "Low stock"}
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 translate-y-full bg-jet/85 py-3 text-center text-[11px] tracking-[0.2em] uppercase text-cream transition-transform duration-300 group-hover:translate-y-0">
          View product
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-5">
        <span className="eyebrow text-ink-muted">{category?.name ?? "Optics"}</span>
        <h3 className="font-display text-xl leading-tight">{product.name}</h3>
        <p className="mt-auto pt-3 text-sm font-semibold text-gold">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}
