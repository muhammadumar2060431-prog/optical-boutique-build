import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createFileRoute, notFound, useNavigate, useParams } from "@tanstack/react-router";
import { Check, CheckCircle2, Play, Plus, ShoppingBag, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/admin/ImageUpload";
import { useImageUploads } from "@/lib/use-image-uploads";
import { ProductCard } from "@/components/site/ProductCard";
import { ProductImage } from "@/components/site/ProductImage";
import { Reveal } from "@/components/site/Reveal";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useWhatsAppModal } from "@/components/site/WhatsAppModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import { mapDbProductToStore } from "@/lib/supabaseSync";
import { useProductSelection } from "@/lib/product-selection";
import { getProductSubImages } from "@/lib/product-images";
import { trackMetaEvent } from "@/lib/meta-events";
import { breadcrumbSchema, jsonLdScript, productSchema } from "@/lib/schema";
import type { Product } from "@/lib/types";
import { formatPrice, useStore } from "@/lib/store";
import { cn, getDiscountPercent, getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    // 1. Fetch real product from Supabase by slug
    let databaseConfirmedMissing = false;
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", params.slug)
        .maybeSingle();

      if (data && !error) {
        return { product: mapDbProductToStore(data) };
      }
      databaseConfirmedMissing = !error;
    } catch {
      // Fall back to cached data when the network is unavailable.
    }

    if (databaseConfirmedMissing) throw notFound();

    // 2. Fallback to client localStorage if available
    if (typeof window !== "undefined") {
      try {
        const raw =
          localStorage.getItem("optique_v1_products") ?? localStorage.getItem("nigah_v1_products");
        if (raw) {
          const prods: Product[] = JSON.parse(raw);
          const found = prods.find((p) => p.slug === params.slug);
          if (found) return { product: found };
        }
      } catch {
        // Fall back to cached data when the network is unavailable.
      }
    }

    return { product: null };
  },
  head: ({ loaderData, params }) => {
    const product = loaderData?.product;
    const url = getSiteUrl(`/product/${params.slug}`);
    const title = product ? `${product.name} - Nigah Eyewear` : "Product - Nigah Eyewear";
    const description = product?.description
      ? product.description.slice(0, 155)
      : "Frame and lens details, colour options, stock and fitting information.";
    const rawImage =
      product?.image && product.image !== "/placeholder.svg" ? product.image : "/brand-logo.png";
    const ogImageUrl = rawImage.startsWith("http") ? rawImage : getSiteUrl(rawImage);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImageUrl },
        { property: "og:image:secure_url", content: ogImageUrl },
        { property: "og:image:alt", content: title },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImageUrl },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: product
        ? [
            jsonLdScript([
              productSchema(product, `/product/${params.slug}`),
              breadcrumbSchema([
                { name: "Home", url: getSiteUrl("/") },
                { name: "Products", url: getSiteUrl("/glasses") },
                { name: product.name, url },
              ]),
            ]),
          ]
        : [],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = useParams({ from: "/product/$slug" });
  const { product: loadedProduct } = Route.useLoaderData();
  const {
    getProductBySlug,
    getCategoryById,
    getCollectionById,
    products,
    stockStatus,
    productStock,
    testimonials,
    addCustomerReview,
    socialReels,
  } = useStore();

  const { addItem } = useCart();
  const { openWhatsAppModal } = useWhatsAppModal();
  const navigate = useNavigate();
  const product = getProductBySlug(slug) ?? loadedProduct;
  const relatedSelection = useProductSelection(
    {
      categoryId: product?.categoryId,
      excludeId: product?.id,
      enabled: Boolean(product),
      limit: 4,
    },
    products,
  );
  const trackedViewRef = useRef<string | null>(null);

  const [variantId, setVariantId] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Review Form state
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [revEmail, setRevEmail] = useState("");
  const [revName, setRevName] = useState("");
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState("");
  const [revQuote, setRevQuote] = useState("");
  const [revImage, setRevImage] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const { isUploading: reviewImageUploading, onUploadingChange: onReviewImageUploading } =
    useImageUploads();
  const [sortBy, setSortBy] = useState<"newest" | "highest" | "lowest">("newest");

  useEffect(() => {
    if (!product || trackedViewRef.current === product.id) return;
    trackedViewRef.current = product.id;
    trackMetaEvent({
      eventName: "ViewContent",
      customData: {
        value: product.salePrice ?? product.price,
        currency: "PKR",
        contentIds: [product.id],
        contentType: "product",
        contentName: product.name,
        numItems: 1,
      },
    });
  }, [product]);

  const variant = useMemo(
    () => product?.variants.find((v) => v.id === variantId) ?? null,
    [product, variantId],
  );

  // Product social reels - ONLY show reels tagged to this specific product
  // All reels are shown on the homepage; here we show only product-specific ones
  const productReels = useMemo(() => {
    if (!product) return [];
    return socialReels.filter((r) => r.enabled && r.productId === product.id);
  }, [socialReels, product]);

  // Product reviews - ONLY show reviews linked to this specific product
  // General "site" testimonials (no productId) are only shown on the homepage
  const productReviews = useMemo(() => {
    if (!product) return [];
    return testimonials.filter(
      (t) =>
        t.source === "customer" && (t.productId === product.id || t.productName === product.name),
    );
  }, [testimonials, product]);

  const sortedReviews = useMemo(() => {
    return [...productReviews].sort((a, b) => {
      if (sortBy === "highest") return b.rating - a.rating;
      if (sortBy === "lowest") return a.rating - b.rating;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [productReviews, sortBy]);

  // Rating stats calculation
  const totalReviewsCount = productReviews.length;
  const avgRating = useMemo(() => {
    if (totalReviewsCount === 0) return 5.0;
    const sum = productReviews.reduce((acc, r) => acc + r.rating, 0);
    return Number((sum / totalReviewsCount).toFixed(1));
  }, [productReviews, totalReviewsCount]);

  const starCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    productReviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [productReviews]);

  if (!product) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-28 text-center">
          <h1 className="font-display text-3xl">Product temporarily unavailable</h1>
          <p className="mt-3 text-sm text-ink-muted">
            We could not reach the catalogue. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-xs tracking-[0.18em] uppercase text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </SiteLayout>
    );
  }

  const category = getCategoryById(product.categoryId);
  const collection = product.collectionId ? getCollectionById(product.collectionId) : null;

  // Build full gallery including primary image, sub images and variant images
  const subImagesList = getProductSubImages(product);

  const variantImagesList: string[] = Array.isArray(product.variants)
    ? product.variants
        .map((v) => v.image)
        .filter((img): img is string => typeof img === "string" && img.trim().length > 0)
    : [];

  const galleryItems = [
    { src: product.image, id: "main-0", label: "Primary View" },
    ...subImagesList.map((img, i) => ({ src: img, id: `angle-${i}`, label: `Angle ${i + 1}` })),
    ...variantImagesList.map((img, i) => ({
      src: img,
      id: `variant-${i}`,
      label: `Option ${i + 1}`,
    })),
  ].filter(
    (item): item is { src: string; id: string; label: string } =>
      typeof item.src === "string" && item.src.trim().length > 0,
  );

  const mainImage =
    (activeImage && activeImage.trim().length > 0 ? activeImage : null) ??
    (variant?.image && variant.image.trim().length > 0 ? variant.image : null) ??
    (product.image && product.image !== "/placeholder.svg" && product.image.trim().length > 0
      ? product.image
      : subImagesList[0] || product.image || "/placeholder.svg");
  const currentPrice = variant?.price ?? product.salePrice ?? product.price;
  const isDiscounted = !!product.salePrice && !variant?.price;
  const discountPercent = getDiscountPercent(product.price, currentPrice);
  const stock = variant ? variant.stock : productStock(product);
  const status = stockStatus(stock);
  const outOfStock = status === "Out of stock";
  const related = relatedSelection.items;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewSubmitting || reviewImageUploading) return;
    if (!revEmail.trim() || !revEmail.includes("@")) {
      toast.error("Valid customer email is required to submit a review.");
      return;
    }
    if (!revName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!revQuote.trim()) {
      toast.error("Please write a review comment.");
      return;
    }

    setReviewSubmitting(true);
    const result = await addCustomerReview({
      name: revName.trim(),
      email: revEmail.trim(),
      productId: product.id,
      productName: product.name,
      title: revTitle.trim() || "Customer Review",
      quote: revQuote.trim(),
      rating: revRating,
      reviewImage: revImage,
    });
    setReviewSubmitting(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success("Thank you! Your review has been submitted successfully.", {
      description: "Your feedback is now visible under this product.",
    });

    setRevEmail("");
    setRevName("");
    setRevTitle("");
    setRevQuote("");
    setRevImage(null);
    setReviewFormOpen(false);
  };

  return (
    <SiteLayout>
      <div className="mx-auto min-w-0 max-w-7xl px-4 py-7 sm:px-6 sm:py-14">
        {/* Breadcrumb */}
        <nav className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] tracking-[0.16em] uppercase text-ink-muted sm:text-xs sm:tracking-[0.14em]">
          <Link to="/" className="hover:text-gold">
            Home
          </Link>
          <span>/</span>
          <Link
            to={category?.slug === "lenses" ? "/lenses" : "/glasses"}
            className="hover:text-gold"
          >
            {category?.name ?? "Collection"}
          </Link>
          {collection && (
            <>
              <span>/</span>
              <span className="text-gold">{collection.name}</span>
            </>
          )}
          <span>/</span>
          <span className="hidden min-w-0 break-words font-semibold text-ink sm:inline">
            {product.name}
          </span>
        </nav>

        <div className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7 sm:mt-8 sm:gap-10 lg:grid-cols-2">
          {/* Gallery / Images */}
          <div className="min-w-0 space-y-4">
            <div className="lens-ring relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-stone bg-jet">
              <ProductImage
                key={mainImage}
                src={mainImage}
                alt={product.name}
                width={1024}
                height={1024}
                className="rise-in aspect-[1/0.98] w-full max-w-full object-cover sm:aspect-square"
              />

              {/* Floating Badges */}
              <div className="absolute left-3 top-3 z-10 flex flex-col gap-2 sm:left-4 sm:top-4">
                {discountPercent !== null && (
                  <Badge
                    variant="destructive"
                    aria-label={`${discountPercent}% off`}
                    className="rounded-sm bg-red-600 px-2.5 py-1 text-[11px] font-bold tracking-normal shadow-sm sm:px-3 sm:text-xs"
                  >
                    -{discountPercent}%
                  </Badge>
                )}
                {product.isNewArrival && (
                  <Badge className="bg-[#E0E0E0] text-ink px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-sm">
                    New Arrival
                  </Badge>
                )}
                {product.isBestseller && (
                  <Badge className="bg-gold text-white px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-sm">
                    Best Seller
                  </Badge>
                )}
              </div>
            </div>

            {galleryItems.length > 1 && (
              <div className="flex min-w-0 max-w-full gap-3 overflow-x-auto pb-2">
                {galleryItems.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveImage(item.src);
                      if (item.src === product.image) setVariantId(null);
                    }}
                    className={cn(
                      "h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-jet transition-all duration-200 cursor-pointer",
                      mainImage === item.src || (!activeImage && idx === 0)
                        ? "border-gold ring-2 ring-gold/30 scale-95"
                        : "border-stone hover:border-gold/60 opacity-80 hover:opacity-100",
                    )}
                  >
                    <ProductImage
                      src={item.src}
                      alt={`${product.name} - ${item.label}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details & Purchase Actions */}
          <div className="min-w-0 space-y-6">
            <div className="space-y-2.5">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <span className="eyebrow min-w-0 text-gold font-bold">
                  {collection?.name || category?.name}
                </span>
                {product.sku && (
                  <span className="shrink-0 rounded-md border border-stone px-2 py-0.5 font-mono text-[11px] text-ink-muted sm:text-xs">
                    SKU: {product.sku}
                  </span>
                )}
              </div>

              <p className="min-w-0 break-words pr-10 text-[1.35rem] font-medium leading-tight tracking-normal text-foreground sm:pr-0 sm:text-3xl sm:leading-tight">
                {product.name}
              </p>

              {/* Rating summary subheader */}
              <div className="flex min-w-0 flex-wrap items-center gap-2 pt-1 pr-12 sm:pr-0">
                <div className="flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < Math.round(avgRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-stone-300",
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-ink">{avgRating}</span>
                <span className="text-xs text-ink-muted">({totalReviewsCount} Reviews)</span>
              </div>

              {/* Pricing Display */}
              <div className="flex flex-wrap items-baseline gap-3 pt-1 lg:flex-nowrap">
                {isDiscounted ? (
                  <>
                    <p className="text-2xl font-bold text-black sm:text-3xl">
                      {formatPrice(currentPrice)}
                    </p>
                    <p className="text-base text-red-600 line-through font-medium sm:text-lg">
                      {formatPrice(product.price)}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold text-emerald-600 border-emerald-500/40 bg-white shadow-xs"
                    >
                      Save {formatPrice(product.price - currentPrice)}
                    </Badge>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-black sm:text-3xl">
                    {formatPrice(currentPrice)}
                  </p>
                )}
              </div>
            </div>

            {(() => {
              // Use character count as a reliable proxy for "long" description
              // ~60 chars per visual line x 10 lines = 600 chars threshold
              const desc = product.description || "";
              const LINE_HEIGHT_PX = 22; // matches the mobile description line height
              const MAX_LINES = 8;
              const maxHeightCollapsed = `${LINE_HEIGHT_PX * MAX_LINES}px`;

              return (
                <div className="space-y-1">
                  <div
                    style={{
                      maxHeight: isDescExpanded ? "none" : maxHeightCollapsed,
                      overflow: "hidden",
                      transition: "max-height 0.3s ease",
                    }}
                  >
                    <p className="text-sm leading-[1.55] text-black font-medium whitespace-pre-line sm:text-[15px] sm:leading-relaxed">
                      {desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                    className="text-xs font-bold text-gold hover:underline cursor-pointer focus:outline-none inline-block pt-1"
                  >
                    {isDescExpanded ? "Show less" : "... Read more"}
                  </button>
                </div>
              );
            })()}

            {/* Interactive Colour Swatches */}
            {product.variants.length > 0 && (
              <div className="space-y-3 rounded-xl border border-stone-200 bg-[#F5F5F5] p-4">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <p className="eyebrow text-ink">
                    Select Colour:{" "}
                    <span className="text-ink font-semibold normal-case">
                      {variant?.label || "Choose colour"}
                    </span>
                  </p>
                  {variant && variant.stock > 0 && (
                    <span className="text-xs text-ink/60">
                      {variant.stock} available in this colour
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {product.variants.map((v) => {
                    const isSelected = v.id === variantId;
                    const hex = v.swatchColourHex || "#141416";
                    return (
                      <button
                        key={v.id}
                        type="button"
                        title={v.label}
                        onClick={() => {
                          const nextVariantId = isSelected ? null : v.id;
                          setVariantId(nextVariantId);
                          setActiveImage(null);
                        }}
                        className="group relative flex flex-col items-center gap-1"
                      >
                        {/* Swatch Circle */}
                        <span
                          className={cn(
                            "relative h-9 w-9 rounded-full border-2 shadow-sm shrink-0 flex items-center justify-center transition-all duration-200",
                            isSelected
                              ? "border-stone-900 ring-2 ring-stone-900/20 scale-110"
                              : "border-stone-300 hover:border-stone-500 hover:scale-105",
                          )}
                          style={{ backgroundColor: hex }}
                        >
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-white drop-shadow-md" />
                          )}
                        </span>
                        {v.price && v.price !== product.price && (
                          <span className="text-[10px] text-ink/60 font-semibold">
                            {formatPrice(v.price)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock indicator */}
            <p
              className={cn(
                "text-sm font-semibold flex items-center gap-1.5",
                status === "Out of stock" ? "text-destructive" : "text-gold",
              )}
            >
              <span className="h-2 w-2 rounded-full bg-current inline-block" />
              {status === "Low stock" ? `Only ${stock} left in stock - order soon` : status}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {outOfStock ? (
                <Button disabled size="lg" className="min-h-12 rounded-full">
                  Currently Out of Stock
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="min-h-12 rounded-full px-8 font-semibold shadow-md"
                    onClick={() => {
                      addItem(product, variant);
                      toast.success(`${product.name} added to your shopping bag`, {
                        action: {
                          label: "View bag",
                          onClick: () => void navigate({ to: "/cart" }),
                        },
                      });
                    }}
                  >
                    <ShoppingBag className="mr-2 h-4 w-4" /> Add to bag
                  </Button>
                </>
              )}
              <button
                type="button"
                onClick={() =>
                  openWhatsAppModal({
                    productName: product.name,
                    productId: product.id,
                    variantId: variant?.id ?? null,
                    variantLabel: variant?.label ?? null,
                  })
                }
                className="min-h-11 border-b border-stone pb-1 text-xs tracking-[0.18em] uppercase text-ink transition-colors hover:border-gold hover:text-gold cursor-pointer bg-transparent border-0"
              >
                Enquire via form
              </button>
            </div>
          </div>
        </div>

        {/* -- Customer Reviews Section -- */}
        <div className="mt-16 sm:mt-24 border-t border-stone/60 pt-10">
          {/* 1. Overall Rating Breakdown Box (Matching Image 2 layout) */}
          <div className="grid gap-8 md:grid-cols-[280px_1fr] items-center rounded-2xl border border-stone-400 bg-[#666666] text-white p-6 sm:p-8">
            {/* Big Score Box */}
            <div className="flex flex-col items-center justify-center border-b border-stone-400/60 pb-6 md:border-b-0 md:border-r md:pr-8 md:pb-0 text-center">
              <div className="font-display text-5xl sm:text-6xl font-bold text-white">
                {avgRating}{" "}
                <span className="text-lg font-sans text-stone-200 font-normal">out of 5</span>
              </div>
              <div className="flex text-amber-400 my-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-5 w-5",
                      i < Math.round(avgRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-stone-400",
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-stone-200">({totalReviewsCount} Verified Reviews)</p>

              <Button
                type="button"
                onClick={() => setReviewFormOpen((prev) => !prev)}
                className="mt-4 rounded-full min-h-10 px-5 text-xs font-bold bg-white text-stone-900 hover:bg-stone-100 shadow-md border-0"
              >
                <Plus className="mr-1.5 h-4 w-4 text-stone-900" />{" "}
                {reviewFormOpen ? "Close Review Form" : "Write a Review"}
              </Button>
            </div>

            {/* 5-Star to 1-Star Progress Bars */}
            <div className="space-y-2.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = starCounts[star as 1 | 2 | 3 | 4 | 5];
                const percent =
                  totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-10 font-semibold text-white shrink-0">{star} Star</span>
                    <div className="h-2.5 flex-1 rounded-full bg-white overflow-hidden border border-white/20">
                      <div
                        className="h-full bg-amber-400 transition-all duration-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-stone-200 text-[11px] shrink-0">
                      {percent}% ({count})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Review Submission Form (Mandatory Email check) */}
          {reviewFormOpen && (
            <form
              onSubmit={handleReviewSubmit}
              className="rounded-2xl border border-gold/40 bg-gold/5 p-6 sm:p-8 space-y-5 animate-in fade-in slide-in-from-top-4 duration-300"
            >
              <div className="flex items-center justify-between border-b border-gold/20 pb-4">
                <h3 className="font-display text-xl sm:text-2xl">Submit Your Product Review</h3>
                <span className="text-xs text-amber-700 font-semibold bg-amber-100 px-3 py-1 rounded-full">
                  * Email Required
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rev-email" className="font-semibold">
                    Your Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="rev-email"
                    type="email"
                    required
                    value={revEmail}
                    onChange={(e) => setRevEmail(e.target.value)}
                    placeholder="e.g. customer@example.com"
                    className="bg-card min-h-11"
                  />
                  <p className="text-[11px] text-ink-muted">
                    Required for verification. Your email will be recorded in our admin panel.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rev-name" className="font-semibold">
                    Your Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="rev-name"
                    required
                    value={revName}
                    onChange={(e) => setRevName(e.target.value)}
                    placeholder="e.g. Kristin Watson"
                    className="bg-card min-h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Your Rating (Click stars)</Label>
                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRevRating(star)}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={cn(
                          "h-7 w-7 transition-colors",
                          star <= revRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-stone-300 hover:text-amber-300",
                        )}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-bold text-ink">{revRating} / 5 Stars</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rev-title">Review Headline / Summary</Label>
                <Input
                  id="rev-title"
                  value={revTitle}
                  onChange={(e) => setRevTitle(e.target.value)}
                  placeholder="e.g. Love It: My Recent Eyewear Purchase"
                  className="bg-card min-h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rev-quote" className="font-semibold">
                  Review Message <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="rev-quote"
                  required
                  rows={4}
                  value={revQuote}
                  onChange={(e) => setRevQuote(e.target.value)}
                  placeholder="Write your honest opinion about the comfort, clarity, fit, and frame quality..."
                  className="bg-card"
                />
              </div>

              <div className="space-y-2">
                <ImageUpload
                  label="Attach a Photo or Screenshot (Optional)"
                  localOnly
                  disabled={reviewSubmitting}
                  onUploadingChange={onReviewImageUploading}
                  allowAdjustment={false}
                  optional
                  value={revImage}
                  onChange={(img) => setRevImage(img)}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 rounded-full"
                  onClick={() => setReviewFormOpen(false)}
                  disabled={reviewSubmitting || reviewImageUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={reviewSubmitting || reviewImageUploading}
                  className="min-h-11 rounded-full px-8 font-semibold"
                >
                  {reviewSubmitting ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </form>
          )}

          {/* 3. Review List Header & Controls */}
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone/50 pb-4">
              <div>
                <h3 className="font-display text-2xl">Review List</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Showing {sortedReviews.length} customer reviews for {product.name}
                </p>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-muted font-medium">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "newest" | "highest" | "lowest")}
                  className="rounded-lg border border-stone bg-card px-3 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-gold"
                >
                  <option value="newest">Newest First</option>
                  <option value="highest">Highest Rating</option>
                  <option value="lowest">Lowest Rating</option>
                </select>
              </div>
            </div>

            {/* Review List Entries (Image 2 style) */}
            {sortedReviews.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink-muted rounded-xl border border-dashed border-stone bg-card">
                No reviews yet for this product. Be the first to submit a review!
              </p>
            ) : (
              <div className="space-y-6 divide-y divide-stone/40">
                {sortedReviews.map((rev) => (
                  <div key={rev.id} className="pt-6 first:pt-0 space-y-3">
                    {/* Reviewer Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center font-bold text-gold shrink-0">
                          {rev.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground text-sm">{rev.name}</h4>
                            {rev.verified !== false && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" /> Verified
                              </span>
                            )}
                          </div>
                          {rev.createdAt && (
                            <p className="text-[11px] text-ink-muted">
                              {new Date(rev.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Rating Stars */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-3.5 w-3.5",
                                i < rev.rating ? "fill-amber-400 text-amber-400" : "text-stone-300",
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-ink">{rev.rating}.0</span>
                      </div>
                    </div>

                    {/* Title & Comment */}
                    {rev.title && (
                      <h5 className="font-semibold text-base text-foreground pt-1">{rev.title}</h5>
                    )}
                    <p className="text-sm text-ink-muted leading-relaxed">{rev.quote}</p>

                    {/* Customer Uploaded Images */}
                    {rev.reviewImage && (
                      <div className="pt-2 flex gap-3">
                        <div className="h-24 w-24 rounded-xl overflow-hidden border border-stone bg-jet shrink-0 shadow-xs">
                          <img
                            src={rev.reviewImage}
                            alt="Customer review media"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* -- 1. Product Social Proof Video Reels Section - only shown when reels are tagged -- */}
        {productReels.length > 0 && (
          <section className="mt-20 border-t border-stone/60 pt-14">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="eyebrow text-gold font-bold tracking-[0.2em] uppercase text-xs sm:text-sm flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>VIDEO REELS &amp; CREATOR REVIEWS</span>
                </p>
                <h2 className="mt-1.5 font-display text-3xl sm:text-4xl text-foreground font-semibold">
                  Seen on Creators &amp; Real Wearers
                </h2>
                <p className="text-xs sm:text-sm text-ink-muted mt-1">
                  Watch real unboxings, style breakdowns, and optical fitting reviews for{" "}
                  {product.name}.
                </p>
              </div>
            </div>

            {/* Video Cards Grid / Carousel */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {productReels.map((reel) => (
                <div
                  key={reel.id}
                  onClick={() => setSelectedVideoUrl(reel.videoUrl)}
                  className="group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer border border-stone/80 bg-jet shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:border-gold/60"
                >
                  {/* Thumbnail Image */}
                  <img
                    src={reel.thumbnail}
                    alt={reel.title}
                    loading="lazy"
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40 group-hover:from-black/95 transition-colors" />

                  {/* Platform Tag & Tagged Badge (Image 2 style) */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm",
                        reel.platform === "instagram" &&
                          "bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045]",
                        reel.platform === "tiktok" && "bg-black/90 border border-white/20",
                        reel.platform === "youtube" && "bg-[#ff0000]",
                        reel.platform === "facebook" && "bg-[#1877f2]",
                        !["instagram", "tiktok", "youtube", "facebook"].includes(reel.platform) &&
                          "bg-black/70 border border-white/20",
                      )}
                    >
                      {reel.platform === "instagram"
                        ? "Insta"
                        : reel.platform === "tiktok"
                          ? "TikTok"
                          : reel.platform === "youtube"
                            ? "Shorts"
                            : reel.platform}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] bg-black/60 backdrop-blur-md text-cream/90 px-2 py-0.5 rounded-full border border-white/10 font-medium">
                      <ShoppingBag className="h-2.5 w-2.5 text-gold" />
                      <span>Tagged</span>
                    </span>
                  </div>

                  {/* Center Play Button (Matching Image 2) */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 border-white/80 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-300 group-hover:scale-110 group-hover:bg-gold group-hover:border-gold group-hover:text-jet shadow-xl">
                      <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Bottom Details */}
                  <div className="absolute inset-x-0 bottom-0 p-3.5 space-y-1 z-10">
                    {reel.creatorHandle && (
                      <p className="text-[11px] font-semibold text-gold truncate">
                        {reel.creatorHandle}
                      </p>
                    )}
                    <p className="text-xs font-semibold text-white line-clamp-2 leading-snug drop-shadow-sm">
                      {reel.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* -- 2. Product Verified Testimonial Cards Section (Matching Image 3) -- */}
        <section className="mt-16 sm:mt-20 border-t border-stone/60 pt-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="mt-1.5 font-display text-3xl sm:text-4xl text-foreground font-semibold">
                Customer Testimonials & Proof Cards
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted mt-1">
                Real customer feedback cards with verified purchase badges.
              </p>
            </div>
          </div>

          {/* Testimonial Cards Grid (Exact match with Image 3) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {productReviews.slice(0, 4).map((t) => {
              const bgImg = t.reviewImage || product.image;
              return (
                <div
                  key={t.id}
                  className="group relative aspect-[9/16] rounded-2xl overflow-hidden border border-stone/80 bg-jet shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:border-gold/60"
                >
                  {/* Background Image */}
                  <img
                    src={bgImg}
                    alt={t.name}
                    loading="lazy"
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Dark Gradient Overlay for Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/30 group-hover:from-black/95 transition-colors" />

                  {/* Top Rating Stars */}
                  <div className="absolute top-3 left-3 z-10 flex gap-0.5 bg-black/60 backdrop-blur-xs px-2 py-1 rounded-full border border-white/10">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={cn(
                          "h-3 w-3",
                          s < t.rating ? "fill-amber-400 text-amber-400" : "text-stone-500",
                        )}
                      />
                    ))}
                  </div>

                  {/* Bottom Info & Quote (Matching Image 3) */}
                  <div className="absolute inset-x-0 bottom-0 p-4 space-y-2 z-10">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold text-white truncate drop-shadow-sm">
                        {t.name}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 backdrop-blur-xs">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        <span>Verified</span>
                      </span>
                    </div>

                    <p className="text-xs text-white/90 line-clamp-3 leading-snug font-medium italic">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Video Player Modal */}
        <Dialog open={!!selectedVideoUrl} onOpenChange={(v) => !v && setSelectedVideoUrl(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-stone/80">
            {selectedVideoUrl && (
              <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                <iframe
                  src={
                    selectedVideoUrl.includes("youtube.com") ||
                    selectedVideoUrl.includes("youtu.be")
                      ? `https://www.youtube.com/embed/${
                          selectedVideoUrl.match(
                            /(?:shorts\/|watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/,
                          )?.[1] || ""
                        }?autoplay=1`
                      : selectedVideoUrl
                  }
                  title="Social proof reel video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-20 border-t border-stone/60 pt-14">
            <h2 className="font-display text-3xl">You may also like</h2>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {related.map((p, i) => (
                <Reveal key={p.id} delay={i * 60}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
