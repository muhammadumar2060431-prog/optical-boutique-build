import { useRouterState } from "@tanstack/react-router";

import { useStore } from "@/lib/store";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function WhatsAppFab() {
  const { settings } = useStore();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hideOnMobile = pathname === "/contact";

  return (
    <a
      href={whatsappLink(
        settings.whatsapp,
        `Hello ${settings.storeName}! I'd like to enquire about your eyewear.`,
      )}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={`fixed right-3 bottom-3 z-40 grid h-11 w-11 place-items-center rounded-full bg-[#25D366] text-white shadow-xl shadow-emerald-600/40 transition-transform duration-200 hover:scale-110 hover:bg-[#20BA5A] sm:right-6 sm:bottom-6 sm:h-14 sm:w-14 cursor-pointer border-none ${hideOnMobile ? "max-sm:hidden" : ""}`}
    >
      <WhatsAppIcon className="h-5 w-5 text-white sm:h-7 sm:w-7" />
    </a>
  );
}
