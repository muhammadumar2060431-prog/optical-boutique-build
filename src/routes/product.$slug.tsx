import { useMemo, useState } from "react";
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

import { ProductCard } from "@/components/site/ProductCard";
import { Reveal } from "@/components/site/Reveal";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { productEnquiryMessage, whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/product/$slug")({
  head: () => ({
    meta: [
      { title: "Product — OPTIQUE Eyewear" },
      {
        name: "description",
        content: "Frame and lens details, colour options, stock and fitting information.",
      },
      { property: "og:title", content: "Product — OPTIQUE Eyewear" },
      {
        property: "og:description",
        content: "Frame and lens details, colour options and fitting information.",
      },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = useParams({ from: "/product/$slug" });
  const {
    getProductBySlug,
    getCategoryById,
    getRelatedProducts,
    stockStatus,
    productStock,
    addOrder,
    settings,
  } = useStore();

  const product = getProductBySlug(slug);
  const [variantId, setVariantId] = useState<string | null>(product?.variants[0]?.id ?? null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const variant = useMemo(
    () => product?.variants.find((v) => v.id === variantId) ?? null,
    [product, variantId],
  );

  if (!product) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-28 text-center">
          <h1 className="font-display text-3xl">We can't find that product</h1>
          <p className="mt-3 text-sm text-ink-muted">
            It may have been renamed or retired. Browse the current collection instead.
          </p>
          <Link
            to="/glasses"
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-xs tracking-[0.18em] uppercase text-primary-foreground"
          >
            View glasses
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const category = getCategoryById(product.categoryId);
  const gallery = [product.image, ...product.subImages];
  const mainImage = activeImage ?? variant?.image ?? product.image;
  const stock = variant ? variant.stock : productStock(product);
  const status = stockStatus(stock);
  const outOfStock = status === "Out of stock";
  const related = getRelatedProducts(product);

  const url = typeof window === "undefined" ? "" : window.location.href;
  const waHref = whatsappLink(
    settings.whatsapp,
    productEnquiryMessage({
      storeName: settings.storeName,
      productName: product.name,
      variantLabel: variant?.label,
      url,
    }),
  );

  const recordIntent = () => {
    addOrder({
      customerName: "WhatsApp customer",
      contact: "Via WhatsApp",
      productId: product.id,
      productName: product.name,
      variantId: variant?.id ?? null,
      variantLabel: variant?.label ?? null,
      message: "Started a WhatsApp order from the product page.",
      source: "whatsapp",
    });
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="text-xs tracking-[0.14em] uppercase text-ink-muted">
          <Link to="/" className="hover:text-gold">
            Home
          </Link>
          <span className="px-2">/</span>
          <Link
            to={category?.slug === "lenses" ? "/lenses" : "/glasses"}
            className="hover:text-gold"
          >
            {category?.name ?? "Collection"}
          </Link>
          <span className="px-2">/</span>
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="lens-ring overflow-hidden rounded-xl bg-jet">
              <img
                key={mainImage}
                src={mainImage}
                alt={product.name}
                width={1024}
                height={1024}
                className="rise-in aspect-square w-full object-cover"
              />
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-3">
                {gallery.map((img) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    className={cn(
                      "h-20 w-20 overflow-hidden rounded-lg border bg-jet transition-colors",
                      mainImage === img ? "border-gold" : "border-stone hover:border-gold/60",
                    )}
                  >
                    <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="eyebrow text-gold">{category?.name}</p>
              <h1 className="font-display text-4xl leading-tight sm:text-5xl">{product.name}</h1>
              <p className="text-2xl font-semibold text-gold">{formatPrice(product.price)}</p>
            </div>

            <p className="text-[15px] leading-relaxed text-ink-muted">{product.description}</p>

            {product.variants.length > 0 && (
              <div className="space-y-3">
                <p className="eyebrow text-ink-muted">Colour</p>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVariantId(v.id);
                        setActiveImage(null);
                      }}
                      className={cn(
                        "flex min-h-11 items-center gap-2 rounded-full border px-4 text-xs tracking-[0.14em] uppercase transition-colors",
                        v.id === variantId ? "border-gold text-gold" : "border-stone hover:border-gold/60",
                      )}
                    >
                      <img src={v.image} alt="" className="h-6 w-6 rounded-full object-cover" />
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p
              className={cn(
                "text-sm font-semibold",
                status === "Out of stock" ? "text-destructive" : "text-gold",
              )}
            >
              {status === "Low stock" ? `Only ${stock} left` : status}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {outOfStock ? (
                <Button disabled size="lg" className="min-h-12 rounded-full">
                  Currently unavailable
                </Button>
              ) : (
                <Button asChild size="lg" className="min-h-12 rounded-full px-8">
                  <a href={waHref} target="_blank" rel="noreferrer" onClick={recordIntent}>
                    <MessageCircle className="mr-2 h-4 w-4" /> Order on WhatsApp
                  </a>
                </Button>
              )}
              <Link
                to="/contact"
                search={{ product: product.name }}
                className="min-h-11 border-b border-stone pb-1 text-xs tracking-[0.18em] uppercase text-ink transition-colors hover:border-gold hover:text-gold"
              >
                Enquire via form
              </Link>
            </div>

            <Tabs defaultValue="details" className="pt-4">
              <TabsList className="w-full justify-start rounded-full bg-mist">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="lens">Lens info</TabsTrigger>
                <TabsTrigger value="care">Care</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="pt-4 text-sm text-ink-muted">
                {product.details.material || "Details are being finalised for this piece."}
              </TabsContent>
              <TabsContent value="lens" className="pt-4 text-sm text-ink-muted">
                {product.details.lensInfo || "Ask our opticians for lens options."}
              </TabsContent>
              <TabsContent value="care" className="pt-4 text-sm text-ink-muted">
                {product.details.care || "Standard optical care applies."}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-3xl">You may also like</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
