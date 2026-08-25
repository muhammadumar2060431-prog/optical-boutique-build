import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export interface FilterState {
  categorySlugs: string[];
  min: number;
  max: number;
  variantLabels: string[];
}

export const defaultFilters: FilterState = {
  categorySlugs: [],
  min: 0,
  max: 20000,
  variantLabels: [],
};

interface FilterApi {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  clear: () => void;
  active: boolean;
}

const FilterContext = createContext<FilterApi | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const value = useMemo<FilterApi>(
    () => ({
      filters,
      setFilters,
      clear: () => setFilters(defaultFilters),
      active:
        filters.categorySlugs.length > 0 ||
        filters.variantLabels.length > 0 ||
        filters.min !== defaultFilters.min ||
        filters.max !== defaultFilters.max,
    }),
    [filters],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used inside <FilterProvider>");
  return ctx;
}
