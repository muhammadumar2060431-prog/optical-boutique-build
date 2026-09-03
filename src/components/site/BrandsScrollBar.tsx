import { useStore } from "@/lib/store";

export function BrandsScrollBar() {
  const { brands } = useStore();
  const enabled = brands.filter((b) => b.enabled);

  // Need at least 1 brand to show
  if (enabled.length === 0) return null;

  // Duplicate brands 4x so scroll looks truly infinite
  const items = [...enabled, ...enabled, ...enabled, ...enabled];

  return (
    <div className="brands-scroll-outer" aria-label="Our brands">
      <div className="brands-track">
        {items.map((brand, i) => (
          <div key={`${brand.id}-${i}`} className="brand-item">
            {brand.logo ? (
              <img
                src={brand.logo}
                alt={brand.name}
                className="brand-logo-img"
                draggable={false}
              />
            ) : (
              <span className="brand-logo-text">{brand.name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
