import { Link } from "@tanstack/react-router";

import { formatPrice, useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { getCategoryById, getCollectionById, productStock, stockStatus } = useStore();
  const category = getCategoryById(product.categoryId);
  const collection = product.collectionId ? getCollectionById(product.collectionId) : null;
  const stock = productStock(product);
  const status = stockStatus(stock);

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-xl border border-stone bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lens)]"
    >
      <div className="lens-ring relative aspect-square overflow-hidden bg-jet">
        {/* Primary Image */}
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={1024}
          height={1024}
          className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.03] ${
            product.hoverImage ? "group-hover:opacity-0" : ""
          }`}
        />

        {/* Hover Image — crossfade on hover/touch */}
        {product.hoverImage && (
          <img
            src={product.hoverImage}
            alt={`${product.name} – alternate view`}
            loading="lazy"
            width={1024}
            height={1024}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:scale-[1.03]"
          />
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.salePrice && (
            <span className="rounded-full bg-destructive px-2.5 py-0.5 text-[10px] font-bold tracking-[0.14em] uppercase text-white shadow-sm">
              Sale
            </span>
          )}
          {product.isNewArrival && (
            <span className="rounded-full bg-[#E0E0E0] px-2.5 py-0.5 text-[10px] font-bold tracking-[0.14em] uppercase text-ink shadow-sm">
              New
            </span>
          )}
          {status !== "In stock" && (
            <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] tracking-[0.14em] uppercase text-white shadow-sm">
              {status === "Out of stock" ? "Sold out" : "Low stock"}
            </span>
          )}
        </div>

        <span className="absolute inset-x-0 bottom-0 translate-y-full bg-jet/85 py-3 text-center text-[11px] tracking-[0.2em] uppercase text-cream transition-transform duration-300 group-hover:translate-y-0">
          View product
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span className="eyebrow">{collection?.name || category?.name || "Optics"}</span>
          {product.sku && <span className="font-mono text-[10px]">{product.sku}</span>}
        </div>

        <h3 className="font-display text-xl leading-tight group-hover:text-gold transition-colors">
          {product.name}
        </h3>

        {/* Colour Swatches (if any variants) */}
        {product.variants && product.variants.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            {product.variants.slice(0, 5).map((v) => (
              <span
                key={v.id}
                title={v.label}
                className="h-5 w-5 rounded-full border border-stone/80 shadow-xs inline-block"
                style={{ backgroundColor: v.swatchColourHex || "#141416" }}
              />
            ))}
            {product.variants.length > 5 && (
              <span className="text-[10px] text-ink-muted">+{product.variants.length - 5}</span>
            )}
          </div>
        )}

        {/* Pricing */}
        <div className="mt-auto pt-3 flex items-baseline gap-2">
          {product.salePrice ? (
            <>
              <p className="text-base font-bold text-black">{formatPrice(product.salePrice)}</p>
              <p className="text-xs text-red-600 line-through font-medium">
                {formatPrice(product.price)}
              </p>
            </>
          ) : (
            <p className="text-base font-bold text-black">{formatPrice(product.price)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
