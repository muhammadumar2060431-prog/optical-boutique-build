import { Link } from "@tanstack/react-router";

import { useStore } from "@/lib/store";

export function Footer() {
  const { settings } = useStore();

  return (
    <footer className="bg-jet text-cream/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Col 1: Brand Info (Spans 2 columns on desktop for perfect visual balance) */}
        <div className="space-y-4 lg:col-span-2 pr-0 lg:pr-8">
          <div className="flex items-center">
            <img
              src="/brand-logo.png"
              alt={settings.storeName || "OPTIQUE Eyewear"}
              className="h-16 sm:h-20 w-auto object-contain shrink-0 invert"
            />
          </div>
          <p className="max-w-md text-sm leading-relaxed text-cream/70">
            Bespoke optical boutique curating precision-crafted frames, designer sunglasses, and
            premium lenses - fitted to perfection.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-soft/30 bg-gold-soft/10 px-3.5 py-1 text-[11px] font-medium tracking-[0.14em] uppercase text-gold-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-soft" />
              Certified Ophthalmic Dispensing &bull; Nationwide Delivery
            </span>
          </div>
        </div>

        {/* Col 2: Explore */}
        <div className="space-y-3">
          <p className="eyebrow text-gold-soft tracking-[0.2em]">Explore</p>
          <ul className="space-y-2.5 text-sm">
            {[
              { to: "/", label: "Home" },
              { to: "/glasses", label: "Glasses" },
              { to: "/lenses", label: "Lenses" },
              { to: "/about", label: "About Us" },
              { to: "/blog", label: "Journal" },
              { to: "/faqs", label: "FAQs" },
              { to: "/contact", label: "Contact" },
              { to: "/order-status", label: "Track Order" },
            ].map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="transition-colors hover:text-gold-soft text-cream/80 block py-0.5"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Customer Care */}
        <div className="space-y-3">
          <p className="eyebrow text-gold-soft tracking-[0.2em]">Customer Care</p>
          <ul className="space-y-2.5 text-sm">
            {[
              { to: "/shipping-policy", label: "Shipping & Delivery" },
              { to: "/returns-policy", label: "Returns & Exchanges" },
              { to: "/warranty", label: "1-Year Warranty" },
              { to: "/privacy-policy", label: "Privacy Policy" },
              { to: "/terms", label: "Terms & Conditions" },
            ].map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="transition-colors hover:text-gold-soft text-cream/80 block py-0.5"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer banner image */}
      <div className="w-full overflow-hidden" style={{ lineHeight: 0 }}>
        <img
          src="/footer-banner.png"
          alt="Optical Boutique"
          className="animate-subtle-bounce"
          style={{ display: "block", width: "100%", height: "180px", objectFit: "fill" }}
        />
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 text-xs text-cream/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            &copy; {new Date().getFullYear()} {settings.storeName || "OPTIQUE Eyewear"}. All rights
            reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-cream/50">
            <Link
              to="/privacy-policy"
              className="hover:text-cream/80 underline-offset-4 hover:underline"
            >
              Privacy
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link to="/terms" className="hover:text-cream/80 underline-offset-4 hover:underline">
              Terms
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link
              to="/shipping-policy"
              className="hover:text-cream/80 underline-offset-4 hover:underline"
            >
              Shipping
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link
              to="/returns-policy"
              className="hover:text-cream/80 underline-offset-4 hover:underline"
            >
              Returns
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link to="/warranty" className="hover:text-cream/80 underline-offset-4 hover:underline">
              Warranty
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
