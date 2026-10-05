import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";

import { formatPrice, useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getProductSubImages } from "@/lib/product-images";

export function ProductCard({ product }: { product: Product }) {
  const { getCategoryById, getCollectionById, productStock, stockStatus, testimonials } =
    useStore();
  const category = getCategoryById(product.categoryId);
  const collection = product.collectionId ? getCollectionById(product.collectionId) : null;
  const stock = productStock(product);
  const status = stockStatus(stock);

  const productReviews = useMemo(() => {
    if (!Array.isArray(testimonials)) return [];
    return testimonials.filter(
      (t) =>
        t.source === "customer" && (t.productId === product.id || t.productId === product.slug),
    );
  }, [testimonials, product.id, product.slug]);

  const ratingCount = productReviews.length;
  const avgRatingNum =
    ratingCount > 0
      ? productReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / ratingCount
      : 5;
  const subImagesList = getProductSubImages(product);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [loadedHoverImage, setLoadedHoverImage] = useState<string | null>(null);
  const [requestedHoverImage, setRequestedHoverImage] = useState<string | null>(null);
  const imageCandidates = [
    product.image,
    ...subImagesList,
    ...(Array.isArray(product.variants) ? product.variants.map((variant) => variant.image) : []),
    product.hoverImage,
  ].filter((image): image is string => Boolean(image?.trim()) && image !== "/placeholder.svg");
  const displayImage = imageCandidates.find((image) => !failedImages.includes(image)) ?? null;
  const hoverImg = [product.hoverImage, ...subImagesList, ...imageCandidates].find(
    (image) => image && image !== displayImage && !failedImages.includes(image),
  );
  const canShowHover = Boolean(hoverImg && loadedHoverImage === hoverImg);
  const markImageFailed = (image: string) => {
    setFailedImages((current) => (current.includes(image) ? current : [...current, image]));
  };

  useEffect(() => {
    const retryImages = () => {
      setFailedImages([]);
      setLoadedHoverImage(null);
    };
    window.addEventListener("online", retryImages);
    return () => window.removeEventListener("online", retryImages);
  }, []);

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-stone bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lens)]"
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch" && hoverImg) setRequestedHoverImage(hoverImg);
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible") && hoverImg)
          setRequestedHoverImage(hoverImg);
      }}
    >
      <div className="relative aspect-square overflow-hidden bg-card">
        {/* Primary Image */}
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={() => markImageFailed(displayImage)}
            width={1024}
            height={1024}
            className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.03] ${
              canShowHover ? "group-hover:opacity-0" : ""
            }`}
          />
        ) : (
          <img
            src="/placeholder.svg"
            alt=""
            width={800}
            height={800}
            className="h-full w-full object-cover"
          />
        )}

        {/* Hover image - crossfade on hover/touch */}
        {hoverImg && requestedHoverImage === hoverImg ? (
          <img
            src={hoverImg}
            alt={`${product.name} - alternate view`}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoadedHoverImage(hoverImg)}
            onError={() => markImageFailed(hoverImg)}
            width={1024}
            height={1024}
            className={`absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 group-hover:scale-[1.03] ${canShowHover ? "group-hover:opacity-100" : ""}`}
          />
        ) : null}

        {/* Top Badges */}
        <div className="absolute inset-x-1.5 top-1.5 z-10 flex flex-wrap gap-1 sm:inset-x-auto sm:top-3 sm:left-3 sm:flex-col sm:gap-1.5">
          {product.salePrice && (
            <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[8px] font-bold uppercase text-white shadow-sm sm:px-2.5 sm:text-[10px] sm:tracking-[0.14em]">
              Sale
            </span>
          )}
          {product.isNewArrival && (
            <span className="rounded-full bg-[#E0E0E0] px-1.5 py-0.5 text-[8px] font-bold uppercase text-ink shadow-sm sm:px-2.5 sm:text-[10px] sm:tracking-[0.14em]">
              New
            </span>
          )}
          {product.isBestseller && (
            <span className="rounded-full bg-gold px-1.5 py-0.5 text-[8px] font-bold uppercase text-white shadow-sm sm:px-2.5 sm:text-[10px] sm:tracking-[0.14em]">
              Best Seller
            </span>
          )}
          {status !== "In stock" && (
            <span className="rounded-full border border-stone-300/60 bg-[#E5E5E5] px-1.5 py-0.5 text-[8px] font-bold uppercase text-stone-800 shadow-xs sm:hidden">
              {status === "Out of stock" ? "Sold out" : "Low stock"}
            </span>
          )}
        </div>

        {/* Top Right Stock Badge */}
        {status !== "In stock" && (
          <div className="absolute top-3 right-3 z-10 hidden sm:block">
            <span className="rounded-full bg-[#E5E5E5] border border-stone-300/60 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.14em] uppercase text-stone-800 shadow-xs">
              {status === "Out of stock" ? "Sold out" : "Low stock"}
            </span>
          </div>
        )}

        <span className="absolute inset-x-0 bottom-0 translate-y-full bg-jet/85 py-3 text-center text-[11px] tracking-[0.2em] uppercase text-cream transition-transform duration-300 group-hover:translate-y-0">
          View product
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2.5 sm:p-5">
        <div className="flex min-w-0 items-center justify-between gap-1 text-xs text-ink-muted">
          <span className="eyebrow block min-w-0 flex-1 truncate sm:flex-none sm:overflow-visible sm:whitespace-normal">
            {collection?.name || category?.name || "Optics"}
          </span>
          {product.sku && (
            <span className="max-w-[38%] shrink-0 truncate font-mono text-[8px] sm:max-w-none sm:text-[10px]">
              {product.sku}
            </span>
          )}
        </div>

        <p className="line-clamp-2 h-[2rem] min-w-0 break-words text-xs font-medium leading-tight text-foreground transition-colors group-hover:text-gold sm:line-clamp-none sm:h-auto sm:text-sm sm:leading-snug">
          {product.name}
        </p>

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

        {/* Pricing & Rating Row */}
        <div className="mt-auto flex flex-col items-start gap-1 pt-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:pt-3 sm:flex-wrap">
          {/* Left: Pricing */}
          <div className="flex max-w-full items-baseline gap-1 whitespace-nowrap sm:gap-2">
            {product.salePrice ? (
              <>
                <p className="shrink-0 text-[11px] font-bold text-black sm:text-base">
                  {formatPrice(product.salePrice)}
                </p>
                <p className="min-w-0 truncate text-[9px] font-medium text-red-600 line-through sm:text-xs">
                  {formatPrice(product.price)}
                </p>
              </>
            ) : (
              <p className="text-[11px] font-bold text-black sm:text-base">
                {formatPrice(product.price)}
              </p>
            )}
          </div>

          {/* Right: Only Rating Stars */}
          <div className="flex items-center gap-0.5 shrink-0">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn(
                  "h-2.5 w-2.5 sm:h-3.5 sm:w-3.5",
                  s <= Math.round(avgRatingNum)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-stone-200 text-stone-300",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
