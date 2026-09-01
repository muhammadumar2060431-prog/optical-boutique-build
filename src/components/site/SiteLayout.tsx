import type { ReactNode } from "react";

import { AnnouncementBar } from "./AnnouncementBar";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { WhatsAppFab } from "./WhatsAppFab";
import { FilterProvider } from "./filters";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <FilterProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-gold focus:px-5 focus:py-3 focus:text-xs focus:tracking-[0.18em] focus:uppercase focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <AnnouncementBar />
        <Navbar />
        <main id="main-content" tabIndex={-1} className="flex-1 rise-in">
          {children}
        </main>
        <Footer />
        <WhatsAppFab />
      </div>
    </FilterProvider>
  );
}
