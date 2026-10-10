import { Link } from "@tanstack/react-router";

import { useStore } from "@/lib/store";
import { sanitizeImageSrc } from "@/lib/security";
import { categoryNavigation } from "@/lib/category-navigation";

export function Footer() {
  const { settings, categories } = useStore();

  return (
    <footer className="max-w-full overflow-x-clip bg-jet text-cream/80">
      <div className="mx-auto grid max-w-7xl gap-9 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-2 lg:grid-cols-4">
        {/* Col 1: Brand Info (Spans 2 columns on desktop for perfect visual balance) */}
        <div className="space-y-4 lg:col-span-2 pr-0 lg:pr-8">
          <div className="flex max-w-md items-center justify-center">
            <img
              src={sanitizeImageSrc(settings.logo, "/brand-logo.png")}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/brand-logo.png";
              }}
              alt={settings.storeName || "Nigah Eyewear"}
              loading="lazy"
              decoding="async"
              className="h-28 w-auto max-w-full object-contain invert sm:h-32"
            />
          </div>
          <p className="max-w-md text-sm leading-relaxed text-cream/70">
            Bespoke optical boutique curating precision-crafted frames, designer sunglasses, and
            premium lenses - fitted to perfection.
          </p>
        </div>

        {/* Col 2: Explore */}
        <div className="space-y-3">
          <p className="text-sm font-extrabold uppercase tracking-normal text-white">Explore</p>
          <ul className="space-y-2.5 text-sm">
            {[
              { to: "/", label: "Home" },
              ...categoryNavigation(categories).links,
              { to: "/about", label: "About Us" },
              { to: "/blog", label: "Journal" },
              { to: "/faqs", label: "FAQs" },
              { to: "/contact", label: "Contact" },
              { to: "/order-status", label: "Track Order" },
            ].map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  params={"params" in l ? l.params : {}}
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
          <p className="text-sm font-extrabold uppercase tracking-normal text-white">
            Customer Care
          </p>
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
          loading="lazy"
          decoding="async"
          className="animate-subtle-bounce"
          style={{ display: "block", width: "100%", height: "180px", objectFit: "fill" }}
        />
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 py-3 pl-4 pr-20 text-[11px] leading-5 text-cream/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pl-6 sm:pr-24 sm:text-xs">
          <p className="min-w-0 break-words">
            &copy; {new Date().getFullYear()} {settings.storeName || "Nigah Eyewear"}. All rights
            reserved.
          </p>
          <p className="min-w-0 break-words text-left sm:text-right">
            A Project by Devnex Innovation
          </p>
        </div>
      </div>
    </footer>
  );
}
