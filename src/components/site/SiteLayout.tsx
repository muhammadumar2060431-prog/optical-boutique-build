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
        <AnnouncementBar />
        <Navbar />
        <main className="flex-1 rise-in">{children}</main>
        <Footer />
        <WhatsAppFab />
      </div>
    </FilterProvider>
  );
}
