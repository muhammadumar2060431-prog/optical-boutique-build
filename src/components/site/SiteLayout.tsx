import type { ReactNode } from "react";

import { AnnouncementBar } from "./AnnouncementBar";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { NewsletterSection } from "./NewsletterSection";
import { OfflineNotice } from "./OfflineNotice";
import { WhatsAppFab } from "./WhatsAppFab";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-clip bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-gold focus:px-5 focus:py-3 focus:text-xs focus:tracking-[0.18em] focus:uppercase focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <AnnouncementBar />
      <OfflineNotice />
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="rise-in min-w-0 max-w-full flex-1 overflow-x-clip"
      >
        {children}
      </main>
      {/* ── Newsletter Email Subscription (Above Footer) ── */}
      <NewsletterSection />
      <Footer />
      <WhatsAppFab />
    </div>
  );
}
