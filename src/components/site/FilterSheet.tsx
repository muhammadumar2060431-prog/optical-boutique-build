import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

import { defaultFilters, useFilters } from "./filters";

export function FilterSheet({ dark = false }: { dark?: boolean }) {
  const { categories, products } = useStore();
  const { filters, setFilters, active } = useFilters();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const variantLabels = Array.from(
    new Set(products.flatMap((p) => p.variants.map((v) => v.label))),
  );

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-xs tracking-[0.16em] uppercase transition-colors",
            dark
              ? "border-white/20 text-cream hover:border-gold hover:text-gold"
              : "border-stone text-ink hover:border-gold hover:text-gold",
            active && "border-gold text-gold",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Refine</SheetTitle>
          <SheetDescription>Narrow the range by category, price and colour.</SheetDescription>
        </SheetHeader>

        <div className="space-y-8 px-4 pb-8">
          <section className="space-y-3">
            <p className="eyebrow text-ink-muted">Category</p>
            {categories.map((c) => (
              <label key={c.id} className="flex min-h-11 items-center gap-3 text-sm">
                <Checkbox
                  checked={draft.categorySlugs.includes(c.slug)}
                  onCheckedChange={() =>
                    setDraft({ ...draft, categorySlugs: toggle(draft.categorySlugs, c.slug) })
                  }
                />
                {c.name}
              </label>
            ))}
          </section>

          <section className="space-y-3">
            <p className="eyebrow text-ink-muted">Price range (Rs.)</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="filter-min" className="text-xs text-ink-muted">
                  Min
                </Label>
                <Input
                  id="filter-min"
                  type="number"
                  value={draft.min}
                  onChange={(e) => setDraft({ ...draft, min: Number(e.target.value) })}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="filter-max" className="text-xs text-ink-muted">
                  Max
                </Label>
                <Input
                  id="filter-max"
                  type="number"
                  value={draft.max}
                  onChange={(e) => setDraft({ ...draft, max: Number(e.target.value) })}
                />
              </div>
            </div>
          </section>

          {variantLabels.length > 0 && (
            <section className="space-y-3">
              <p className="eyebrow text-ink-muted">Colour</p>
              <div className="flex flex-wrap gap-2">
                {variantLabels.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, variantLabels: toggle(draft.variantLabels, label) })
                    }
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-xs tracking-wide uppercase transition-colors",
                      draft.variantLabels.includes(label)
                        ? "border-gold bg-gold text-primary-foreground"
                        : "border-stone hover:border-gold",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => {
                setFilters(draft);
                setOpen(false);
              }}
            >
              Apply
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setDraft(defaultFilters);
                setFilters(defaultFilters);
              }}
            >
              Clear all
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
