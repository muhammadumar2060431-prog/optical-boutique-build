import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";

import { useStore } from "@/lib/store";
export function Footer() {
  const { settings } = useStore();

  return (
    <footer className="bg-jet text-cream/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center">
            <img
              src="/brand-logo.png"
              alt={settings.storeName}
              className="h-20 sm:h-24 md:h-28 w-auto object-contain shrink-0 invert"
            />
          </div>
          <p className="max-w-sm text-sm leading-relaxed">
            A small optical house making a short, considered range of frames and lenses — cut,
            polished and fitted by hand.
          </p>
        </div>

        <div className="space-y-3">
          <p className="eyebrow text-gold-soft">Explore</p>
          <ul className="space-y-2 text-sm">
            {[
              { to: "/", label: "Home" },
              { to: "/glasses", label: "Glasses" },
              { to: "/lenses", label: "Lenses" },
              { to: "/about", label: "About" },
              { to: "/contact", label: "Contact" },
              { to: "/order-status", label: "Track order" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="transition-colors hover:text-gold-soft">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <p className="eyebrow text-gold-soft">Visit</p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-soft" />
              <span>{settings.address}</span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-soft" />
              <a href={`tel:${settings.phone}`}>{settings.phone}</a>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-soft" />
              <a href={`mailto:${settings.email}`} className="break-all">
                {settings.email}
              </a>
            </li>
            <li className="text-cream/60">{settings.hours}</li>
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
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 text-xs text-cream/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
          </p>
          <p>Prescriptions dispensed by registered nigah.</p>
        </div>
      </div>
    </footer>
  );
}
