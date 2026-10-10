import { Link, createFileRoute } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageFaqs } from "@/components/site/PageFaqs";
import { ProductImage } from "@/components/site/ProductImage";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatPrice, useStore } from "@/lib/store";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Shopping Bag — Nigah Eyewear" },
      {
        name: "description",
        content:
          "Review your selected frames, prescription sunglasses, and contact lenses before checkout.",
      },
      { property: "og:title", content: "Shopping Bag — Nigah Eyewear" },
      {
        property: "og:description",
        content: "Review your selected frames and lenses before checkout.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: getSiteUrl("/cart") },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, setQty, removeItem, clearCart } = useCart();
  const { getStockFor } = useStore();

  const lines = items.map((item) => {
    const stock = getStockFor(item.productId, item.variantId);
    return {
      item,
      stock,
      outOfStock: stock <= 0,
      exceeds: item.qty > stock,
    };
  });
  const blocked = lines.some((l) => l.outOfStock || l.exceeds);

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-5xl overflow-x-clip px-4 py-10 sm:px-6 sm:py-16">
        <p className="eyebrow text-black">Your selection</p>
        <h1 className="mt-2 font-display text-3xl tracking-normal sm:text-5xl">Shopping Bag</h1>

        {items.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-stone bg-card px-6 py-20 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-black" />
            <p className="mt-4 text-sm text-black">
              Your shopping bag is empty. Explore our collection to select your ideal frames or
              lenses.
            </p>
            <Link
              to="/glasses"
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-xs tracking-[0.18em] uppercase text-primary-foreground"
            >
              Explore Collection
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid min-w-0 gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <ul className="min-w-0 divide-y divide-stone rounded-xl border border-stone bg-card">
              {lines.map(({ item, stock, outOfStock, exceeds }) => (
                <li key={item.key} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="h-20 w-20 shrink-0 rounded-lg bg-jet object-cover sm:h-24 sm:w-24"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium leading-snug text-foreground">
                      {item.name}
                    </p>
                    {item.variantLabel && (
                      <p className="text-xs tracking-[0.14em] uppercase text-black">
                        {item.variantLabel}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-black">
                      {formatPrice(item.price)}
                    </p>
                    {outOfStock ? (
                      <p className="mt-1 text-xs font-semibold text-destructive">
                        Out of stock — remove this item to continue
                      </p>
                    ) : exceeds ? (
                      <p className="mt-1 text-xs font-semibold text-destructive">
                        Only {stock} left — reduce the quantity to continue
                      </p>
                    ) : stock <= 3 ? (
                      <p className="mt-1 text-xs text-black">Only {stock} left in stock</p>
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <div className="flex items-center rounded-full border border-stone">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        onClick={() => setQty(item.key, item.qty - 1)}
                        className="grid h-10 w-10 place-items-center rounded-full sm:h-11 sm:w-11 text-black transition-colors hover:text-black"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold">{item.qty}</span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        disabled={item.qty >= stock}
                        onClick={() => setQty(item.key, item.qty + 1)}
                        className="grid h-10 w-10 place-items-center rounded-full sm:h-11 sm:w-11 text-black transition-colors hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => removeItem(item.key)}
                      className="grid h-10 w-10 place-items-center rounded-full sm:h-11 sm:w-11 border border-stone text-black transition-colors hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit min-w-0 rounded-xl border border-stone bg-mist p-4 sm:p-6">
              <h2 className="font-display text-2xl">Summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex min-w-0 justify-between gap-4">
                  <dt className="text-black">Subtotal</dt>
                  <dd className="font-semibold">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex min-w-0 justify-between gap-4">
                  <dt className="text-black">Delivery</dt>
                  <dd className="text-right text-black">Confirmed at checkout</dd>
                </div>
              </dl>
              {blocked ? (
                <>
                  <Button size="lg" disabled className="mt-6 min-h-12 w-full rounded-full bg-black text-white hover:bg-black">
                    Checkout unavailable
                  </Button>
                  <p className="mt-2 text-xs text-destructive" role="alert">
                    Some items are out of stock or exceed available quantity. Adjust your bag to
                    continue.
                  </p>
                </>
              ) : (
                <Button asChild size="lg" className="mt-6 min-h-12 w-full rounded-full bg-black text-white hover:bg-black">
                  <Link to="/checkout">Proceed to checkout</Link>
                </Button>
              )}
              <button
                type="button"
                onClick={clearCart}
                className="mt-4 w-full text-xs tracking-[0.16em] uppercase text-black transition-colors hover:text-destructive"
              >
                Clear bag
              </button>
            </aside>
          </div>
        )}
        <PageFaqs page="cart" />
      </div>
    </SiteLayout>
  );
}
