import { Link } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { useStore } from "@/lib/store";
import { whatsappLink } from "@/lib/whatsapp";

export function Footer() {
  const { settings } = useStore();
  const wa = whatsappLink(settings.whatsapp, `Hello ${settings.storeName}, I'd like some advice.`);

  return (
    <footer className="bg-jet text-cream/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/70">
              <span className="h-3 w-3 rounded-full bg-gold" />
            </span>
            <span className="font-display text-2xl tracking-[0.22em] text-cream">
              {settings.storeName}
            </span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed">
            A small optical house making a short, considered range of frames and lenses — cut,
            polished and fitted by hand.
          </p>
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gold px-5 text-xs tracking-[0.18em] uppercase text-primary-foreground transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> Order on WhatsApp
          </a>
        </div>

        <div className="space-y-3">
          <p className="eyebrow text-gold">Explore</p>
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
                <Link to={l.to} className="transition-colors hover:text-gold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <p className="eyebrow text-gold">Visit</p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>{settings.address}</span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <a href={`tel:${settings.phone}`}>{settings.phone}</a>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <a href={`mailto:${settings.email}`} className="break-all">
                {settings.email}
              </a>
            </li>
            <li className="text-cream/60">{settings.hours}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-cream/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
          </p>
          <p>Prescriptions dispensed by registered opticians.</p>
        </div>
      </div>
    </footer>
  );
}
