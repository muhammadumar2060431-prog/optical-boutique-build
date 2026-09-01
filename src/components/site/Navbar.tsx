import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, MessageCircle, ShoppingBag, X } from "lucide-react";

import { useCart } from "@/lib/cart";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";

import { FilterSheet } from "./FilterSheet";

const links = [
  { to: "/", label: "Home" },
  { to: "/glasses", label: "Glasses" },
  { to: "/lenses", label: "Lenses" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/order-status", label: "Track order" },
] as const;

export function Navbar() {
  const { settings } = useStore();
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const wa = whatsappLink(settings.whatsapp, `Hello ${settings.storeName}, I have a question.`);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-jet text-cream transition-shadow duration-300",
        scrolled && "shadow-[0_10px_30px_-20px_rgba(0,0,0,0.9)]",
      )}
    >
      <nav aria-label="Primary" className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[auto_1fr_auto]">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/70">
            <span className="h-3 w-3 rounded-full bg-gold" />
          </span>
          <span className="truncate font-display text-2xl tracking-[0.22em] text-cream">
            {settings.storeName}
          </span>
        </Link>

        <ul className="hidden items-center justify-center gap-8 lg:flex">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                activeProps={{ className: "text-gold-soft border-gold", "aria-current": "page" }}
                className="border-b border-transparent pb-1 text-xs tracking-[0.18em] uppercase text-cream/80 transition-colors hover:text-gold-soft"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <FilterSheet dark />
          </div>
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat on WhatsApp"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-cream transition-colors hover:border-gold hover:text-gold-soft"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          </a>
          <Link
            to="/cart"
            aria-label={`Shopping bag, ${count} item${count === 1 ? "" : "s"}`}
            className="relative grid h-11 w-11 place-items-center rounded-full border border-white/15 text-cream transition-colors hover:border-gold hover:text-gold-soft"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[10px] font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            aria-label={openMenu ? "Close menu" : "Open menu"}
            aria-expanded={openMenu}
            aria-controls="mobile-nav"
            onClick={() => setOpenMenu((v) => !v)}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-cream lg:hidden"
          >
            {openMenu ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {openMenu && (
        <div id="mobile-nav" className="border-t border-white/10 lg:hidden">
          <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
            {links.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  onClick={() => setOpenMenu(false)}
                  activeOptions={{ exact: l.to === "/" }}
                  activeProps={{ className: "text-gold-soft", "aria-current": "page" }}
                  className="flex min-h-12 items-center border-b border-white/5 text-sm tracking-[0.16em] uppercase text-cream/85"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-3 py-4 sm:hidden">
              <FilterSheet dark />
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-xs tracking-[0.16em] uppercase"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
