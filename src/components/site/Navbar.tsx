import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag, X } from "lucide-react";

import { useCart } from "@/lib/cart";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

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
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-white backdrop-blur-sm text-black transition-all duration-300 border-b border-black/8",
        scrolled && "shadow-[0_4px_24px_-8px_rgba(0,0,0,0.12)] border-black/12",
      )}
    >
      {/* Main nav row */}
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8"
        style={{ minHeight: "64px" }}
      >
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center mr-6" aria-label={settings.storeName}>
          <img
            src="/brand-logo.png"
            alt={settings.storeName}
            className="h-9 w-auto object-contain"
          />
        </Link>

        {/* Desktop nav links — centred */}
        <ul className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                activeProps={{
                  className: "text-black border-b border-black",
                  "aria-current": "page",
                }}
                className="group relative pb-0.5 text-[11px] font-medium tracking-[0.2em] uppercase text-black transition-colors duration-200 hover:text-black"
              >
                <span className="block">{l.label}</span>
                <span className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-black transition-all duration-300 group-hover:w-full" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Right-side actions */}
        <div className="flex items-center gap-2 ml-auto lg:ml-0">
          {/* Cart */}
          <Link
            to="/cart"
            aria-label={`Shopping bag, ${count} item${count === 1 ? "" : "s"}`}
            className="relative grid h-9 w-9 place-items-center rounded-full border border-black/15 text-black transition-all duration-200 hover:border-black/40 hover:text-black hover:bg-black/5"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-black px-1 text-[9px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label={openMenu ? "Close menu" : "Open menu"}
            aria-expanded={openMenu}
            aria-controls="mobile-nav"
            onClick={() => setOpenMenu((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full border border-black/15 text-black transition-all duration-200 hover:border-black/40 hover:text-black hover:bg-black/5 lg:hidden"
          >
            {openMenu ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {openMenu && (
        <div id="mobile-nav" className="border-t border-black/8 bg-white lg:hidden">
          <ul className="mx-auto max-w-7xl divide-y divide-black/5 px-4 sm:px-6">
            {links.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  onClick={() => setOpenMenu(false)}
                  activeOptions={{ exact: l.to === "/" }}
                  activeProps={{ className: "text-black", "aria-current": "page" }}
                  className="flex min-h-[48px] items-center text-[11px] font-medium tracking-[0.2em] uppercase text-black/80 transition-colors hover:text-black"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
