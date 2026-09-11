import { useStore } from "@/lib/store";

export function BrandsScrollBar() {
  const { brands } = useStore();
  const enabled = brands.filter((b) => b.enabled);

  // Need at least 1 brand to show
  if (enabled.length === 0) return null;

  // Build a single block with enough items to span wide viewports
  let singleBlock = [...enabled];
  while (singleBlock.length < 16) {
    singleBlock = [...singleBlock, ...enabled];
  }

  // Duplicate singleBlock into 2 identical halves for seamless infinite marquee
  const items = [...singleBlock, ...singleBlock];

  return (
    <div className="brands-scroll-outer" aria-label="Our brands">
      <div className="brands-track">
        {items.map((brand, i) => (
          <div key={`${brand.id}-${i}`} className="brand-item">
            {brand.logo && brand.logo.trim() ? (
              <img src={brand.logo} alt={brand.name} className="brand-logo-img" draggable={false} />
            ) : (
              <span className="brand-logo-text">{brand.name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
