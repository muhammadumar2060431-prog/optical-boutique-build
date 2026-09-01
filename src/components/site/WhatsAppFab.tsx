import { MessageCircle } from "lucide-react";

import { useStore } from "@/lib/store";
import { whatsappLink } from "@/lib/whatsapp";

export function WhatsAppFab() {
  const { settings } = useStore();
  const href = whatsappLink(settings.whatsapp, `Hello ${settings.storeName}!`);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-4 bottom-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-gold text-primary-foreground shadow-[var(--shadow-lens)] transition-transform duration-200 hover:scale-105 sm:right-6 sm:bottom-6"
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </a>
  );
}
