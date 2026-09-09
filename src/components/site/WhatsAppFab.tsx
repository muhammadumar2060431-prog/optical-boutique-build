import { useWhatsAppModal } from "./WhatsAppModal";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function WhatsAppFab() {
  const { openWhatsAppModal } = useWhatsAppModal();

  return (
    <button
      type="button"
      onClick={() => openWhatsAppModal({ productName: "General WhatsApp Inquiry" })}
      aria-label="Chat with us on WhatsApp"
      className="fixed right-4 bottom-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl shadow-emerald-600/40 transition-transform duration-200 hover:scale-110 hover:bg-[#20BA5A] sm:right-6 sm:bottom-6 cursor-pointer border-none"
    >
      <WhatsAppIcon className="h-7 w-7 text-white" />
    </button>
  );
}
