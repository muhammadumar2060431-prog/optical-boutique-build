import { useStore } from "@/lib/store";

export function AnnouncementBar() {
  const { announcement } = useStore();
  if (!announcement?.enabled || !Array.isArray(announcement?.messages)) return null;

  const items = announcement.messages.filter((m) => typeof m === "string" && m.trim().length > 0);
  if (!items.length) return null;

  // Build a single block with enough items to span wide viewports
  let singleBlock: string[] = [];
  while (singleBlock.length < 16) {
    singleBlock = [...singleBlock, ...items];
  }
  const sequence = [...singleBlock, ...singleBlock];

  return (
    <div
      className="w-full overflow-hidden py-2 text-[11px] tracking-[0.14em] uppercase sm:py-2.5 sm:text-xs"
      style={{ backgroundColor: announcement.background, color: announcement.textColor }}
      aria-label="Store announcements"
    >
      <div className="marquee-track whitespace-nowrap">
        {sequence.map((msg, i) => (
          <span key={`${msg}-${i}`} className="flex items-center">
            <span className="px-6">{msg}</span>
            <span aria-hidden className="opacity-50">
              •
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
