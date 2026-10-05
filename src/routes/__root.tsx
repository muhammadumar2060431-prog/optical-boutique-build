import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/tanstackstart-react";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { StoreProvider } from "@/lib/store";
import { CartProvider } from "@/lib/cart";
import { WhatsAppModalProvider } from "@/components/site/WhatsAppModal";
import { Toaster } from "@/components/ui/sonner";
import {
  jsonLdScript,
  opticianBusinessSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/schema";

function NotFoundComponent() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ backgroundColor: "#f6f4ef" }}
    >
      {/* ── Decorative background ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* Ghost "404" watermark */}
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[22vw] font-bold leading-none tracking-tighter"
          style={{ color: "rgba(27,27,29,0.04)", fontFamily: "'Poppins',sans-serif" }}
        >
          404
        </span>
        {/* Decorative circles */}
        <div
          className="absolute -left-20 -top-20 h-80 w-80 rounded-full"
          style={{ border: "1px solid rgba(102,102,102,0.12)" }}
        />
        <div
          className="absolute -left-10 -top-10 h-56 w-56 rounded-full"
          style={{ border: "1px solid rgba(102,102,102,0.08)" }}
        />
        <div
          className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full"
          style={{ border: "1px solid rgba(102,102,102,0.12)" }}
        />
        <div
          className="absolute -bottom-12 -right-12 h-64 w-64 rounded-full"
          style={{ border: "1px solid rgba(102,102,102,0.08)" }}
        />
      </div>

      {/* ── Main card ── */}
      <div className="relative z-10 mx-auto max-w-lg py-16 text-center">
        {/* Eyeglass icon */}
        <div className="mb-8 flex justify-center">
          <svg
            width="72"
            height="40"
            viewBox="0 0 72 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="18" cy="20" r="14" stroke="#666666" strokeWidth="2.5" fill="none" />
            <circle cx="54" cy="20" r="14" stroke="#666666" strokeWidth="2.5" fill="none" />
            <path
              d="M32 20 C34 16, 38 16, 40 20"
              stroke="#666666"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M4 20 L4 12" stroke="#666666" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M68 20 L68 12" stroke="#666666" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Error label */}
        <p
          className="mb-2 text-xs font-semibold uppercase"
          style={{ letterSpacing: "0.22em", color: "#666666", fontFamily: "'Inter',sans-serif" }}
        >
          Error 404
        </p>

        {/* Headline */}
        <h1
          className="mb-4 text-3xl font-bold leading-tight sm:text-4xl"
          style={{ color: "#1b1b1d", fontFamily: "'Poppins',sans-serif" }}
        >
          Lost Your Frames?
        </h1>

        {/* Description */}
        <p
          className="mb-3 text-base"
          style={{ color: "#6b6a65", fontFamily: "'Inter',sans-serif" }}
        >
          The page you're looking for seems to have slipped off the shelf.
        </p>
        <p
          className="mb-10 text-sm"
          style={{ color: "rgba(107,106,101,0.8)", fontFamily: "'Inter',sans-serif" }}
        >
          It may have been moved, renamed, or never existed.
          <br />
          Let's get you back to finding your perfect pair.
        </p>

        {/* Divider */}
        <div
          className="mx-auto mb-10 h-px w-16"
          style={{ backgroundColor: "rgba(102,102,102,0.3)" }}
        />

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            id="not-found-back-home"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-medium uppercase text-white transition-all duration-300"
            style={{
              backgroundColor: "#1b1b1d",
              letterSpacing: "0.12em",
              fontFamily: "'Inter',sans-serif",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#666666")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1b1b1d")}
          >
            ← Back to Home
          </Link>
          <Link
            to="/glasses"
            id="not-found-browse-shop"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-medium uppercase transition-all duration-300"
            style={{
              border: "1px solid #1b1b1d",
              color: "#1b1b1d",
              letterSpacing: "0.12em",
              fontFamily: "'Inter',sans-serif",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#666";
              e.currentTarget.style.color = "#666";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#1b1b1d";
              e.currentTarget.style.color = "#1b1b1d";
            }}
          >
            Browse Shop →
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-12">
          <p
            className="mb-4 text-xs font-medium uppercase"
            style={{ letterSpacing: "0.16em", color: "#6b6a65", fontFamily: "'Inter',sans-serif" }}
          >
            Popular Pages
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              { label: "Eyeglasses", to: "/glasses" as const },
              { label: "Sunglasses", to: "/glasses" as const },
              { label: "Contact Lenses", to: "/lenses" as const },
              { label: "FAQ", to: "/faqs" as const },
            ].map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-xs underline-offset-4 transition-colors duration-200 hover:underline"
                style={{ color: "#6b6a65", fontFamily: "'Inter',sans-serif" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#1b1b1d")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6b6a65")}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  useEffect(() => {
    Sentry.captureException(error, { tags: { source: "route-error-boundary" } });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Unable to Load Page
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We encountered an unexpected error while processing your request. Please try again or
          return to the homepage.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Nigah — Premium Eyeglasses, Sunglasses & Contact Lenses" },
      {
        name: "description",
        content:
          "Discover handcrafted designer eyeglasses, premium sunglasses, and precision contact lenses. Experience unmatched clarity, comfort, and bespoke styling.",
      },
      { property: "og:title", content: "Nigah — Premium Eyewear & Optical Boutique" },
      {
        property: "og:description",
        content:
          "Discover handcrafted designer eyeglasses, premium sunglasses, and precision contact lenses.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/brand-logo.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/brand-logo.png" },
    ],
    scripts: [jsonLdScript([organizationSchema(), opticianBusinessSchema(), websiteSchema()])],
    links: [
      { rel: "stylesheet", href: appCss },
      ...(import.meta.env.VITE_SUPABASE_URL
        ? [{ rel: "preconnect", href: new URL(import.meta.env.VITE_SUPABASE_URL).origin }]
        : []),
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Poppins:wght@600;700&display=swap",
      },
      { rel: "icon", href: "/brand-logo.png", type: "image/png" },
      { rel: "shortcut icon", href: "/brand-logo.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/brand-logo.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5S4FZ7LP');`,
          }}
        />
        {/* End Google Tag Manager */}
        <HeadContent />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5S4FZ7LP"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <CartProvider>
          <WhatsAppModalProvider>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            <Toaster position="top-right" />
          </WhatsAppModalProvider>
        </CartProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}
