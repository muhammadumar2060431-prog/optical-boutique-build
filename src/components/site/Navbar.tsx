import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag, X } from "lucide-react";

import { useCart } from "@/lib/cart";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";

import { FilterSheet } from "./FilterSheet";
import { WhatsAppIcon } from "./WhatsAppIcon";

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

  const wa = whatsappLink(settings.whatsapp, `Hello ${settings.storeName}, I have a question.`);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-cream/95 backdrop-blur-sm text-ink transition-all duration-300 border-b border-ink/8",
        scrolled && "shadow-[0_4px_24px_-8px_rgba(0,0,0,0.12)] border-ink/12",
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
                activeProps={{ className: "text-[#666666] border-b border-[#666666]", "aria-current": "page" }}
                className="group relative pb-0.5 text-[11px] font-medium tracking-[0.2em] uppercase text-ink/70 transition-colors duration-200 hover:text-ink"
              >
                <span className="block">
                  {l.label}
                </span>
                <span className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-[#666666] transition-all duration-300 group-hover:w-full" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Right-side actions */}
        <div className="flex items-center gap-2 ml-auto lg:ml-0">
          {/* Filter — hidden on mobile */}
          <div className="hidden sm:block">
            <FilterSheet />
          </div>

          {/* WhatsApp */}
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat on WhatsApp"
            className="grid h-9 w-9 place-items-center rounded-full bg-[#25D366] text-white shadow-sm transition-all duration-200 hover:bg-[#20BA5A] hover:scale-105 hover:shadow-md"
          >
            <WhatsAppIcon className="h-4 w-4 text-white" />
          </a>

          {/* Cart */}
          <Link
            to="/cart"
            aria-label={`Shopping bag, ${count} item${count === 1 ? "" : "s"}`}
            className="relative grid h-9 w-9 place-items-center rounded-full border border-ink/15 text-ink/70 transition-all duration-200 hover:border-ink/40 hover:text-ink hover:bg-ink/5"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#666666] px-1 text-[9px] font-bold text-white">
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
            className="grid h-9 w-9 place-items-center rounded-full border border-ink/15 text-ink/70 transition-all duration-200 hover:border-ink/40 hover:text-ink hover:bg-ink/5 lg:hidden"
          >
            {openMenu ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {openMenu && (
        <div
          id="mobile-nav"
          className="border-t border-ink/8 bg-cream/98 lg:hidden"
        >
          <ul className="mx-auto max-w-7xl divide-y divide-ink/5 px-4 sm:px-6">
            {links.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  onClick={() => setOpenMenu(false)}
                  activeOptions={{ exact: l.to === "/" }}
                  activeProps={{ className: "text-[#666666]", "aria-current": "page" }}
                  className="flex min-h-[48px] items-center text-[11px] font-medium tracking-[0.2em] uppercase text-ink/60 transition-colors hover:text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-3 py-3 sm:hidden">
              <FilterSheet />
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20BA5A] px-5 py-2.5 text-[11px] font-bold tracking-[0.16em] uppercase text-white shadow-sm"
              >
                <WhatsAppIcon className="h-4 w-4 text-white" /> WhatsApp
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
