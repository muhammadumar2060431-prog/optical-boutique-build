import { useStore } from "@/lib/store";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function WhatsAppFab() {
  const { settings } = useStore();
  const href = whatsappLink(settings.whatsapp, `Hello ${settings.storeName}!`);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-4 bottom-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl shadow-emerald-600/40 transition-transform duration-200 hover:scale-110 hover:bg-[#20BA5A] sm:right-6 sm:bottom-6"
    >
      <WhatsAppIcon className="h-7 w-7 text-white" />
    </a>
  );
}
