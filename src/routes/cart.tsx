import { Link, createFileRoute } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your bag — OPTIQUE Eyewear" },
      {
        name: "description",
        content: "Review the frames and lenses in your bag before placing your OPTIQUE order.",
      },
      { property: "og:title", content: "Your bag — OPTIQUE Eyewear" },
      {
        property: "og:description",
        content: "Review your selected frames and lenses before checkout.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://optical-boutique-build.lovable.app/cart" },
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
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="eyebrow text-gold">Your selection</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Shopping bag</h1>

        {items.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-stone bg-card px-6 py-20 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-ink-muted" />
            <p className="mt-4 text-sm text-ink-muted">
              Your bag is empty — explore the collection and add a frame or lens to begin.
            </p>
            <Link
              to="/glasses"
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-xs tracking-[0.18em] uppercase text-primary-foreground"
            >
              Browse glasses
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
            <ul className="divide-y divide-stone rounded-xl border border-stone bg-card">
              {lines.map(({ item, stock, outOfStock, exceeds }) => (
                <li key={item.key} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="h-24 w-24 shrink-0 rounded-lg bg-jet object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl leading-tight">{item.name}</h2>
                    {item.variantLabel && (
                      <p className="text-xs tracking-[0.14em] uppercase text-ink-muted">
                        {item.variantLabel}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-gold">
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
                      <p className="mt-1 text-xs text-ink-muted">Only {stock} left in stock</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-full border border-stone">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        onClick={() => setQty(item.key, item.qty - 1)}
                        className="grid h-11 w-11 place-items-center rounded-full text-ink-muted transition-colors hover:text-gold"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold">{item.qty}</span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        disabled={item.qty >= stock}
                        onClick={() => setQty(item.key, item.qty + 1)}
                        className="grid h-11 w-11 place-items-center rounded-full text-ink-muted transition-colors hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => removeItem(item.key)}
                      className="grid h-11 w-11 place-items-center rounded-full border border-stone text-ink-muted transition-colors hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit rounded-xl border border-stone bg-mist p-6">
              <h2 className="font-display text-2xl">Summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Subtotal</dt>
                  <dd className="font-semibold">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Delivery</dt>
                  <dd className="text-ink-muted">Confirmed at checkout</dd>
                </div>
              </dl>
              <Button asChild size="lg" className="mt-6 min-h-12 w-full rounded-full">
                <Link to="/checkout">Proceed to checkout</Link>
              </Button>
              <button
                type="button"
                onClick={clearCart}
                className="mt-4 w-full text-xs tracking-[0.16em] uppercase text-ink-muted transition-colors hover:text-destructive"
              >
                Clear bag
              </button>
            </aside>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
