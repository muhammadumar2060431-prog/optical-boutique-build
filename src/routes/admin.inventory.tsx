import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/inventory")({
  component: AdminInventory,
});

function AdminInventory() {
  const { getInventoryRows, updateStock, settings, categories } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = useMemo(
    () =>
      getInventoryRows().filter((r) => {
        if (query && !r.name.toLowerCase().includes(query.toLowerCase())) return false;
        if (category !== "all" && r.categoryName !== category) return false;
        if (status !== "all" && r.status !== status) return false;
        return true;
      }),
    [getInventoryRows, query, category, status],
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-gold">Stock control</p>
        <h1 className="mt-2 font-display text-3xl">Inventory</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Low-stock threshold is {settings.lowStockThreshold} units — change it in Settings.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          placeholder="Search product or variant"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-11"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="min-h-11">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="min-h-11">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock levels</SelectItem>
            <SelectItem value="In stock">In stock</SelectItem>
            <SelectItem value="Low stock">Low stock</SelectItem>
            <SelectItem value="Out of stock">Out of stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone bg-card px-6 py-16 text-center text-sm text-ink-muted">
          Nothing matches this view. Clear the filters to see all stock.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-stone text-left text-xs tracking-[0.14em] uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Product / variant</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              {rows.map((r) => (
                <tr key={r.key} className={cn(r.status !== "In stock" && "bg-gold/5")}>
                  <td className="px-4 py-3 text-ink-muted">{r.categoryName}</td>
                  <td className="px-4 py-3 font-semibold">{r.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Decrease stock"
                        onClick={() => updateStock(r.productId, r.variantId, r.stock - 1)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-stone hover:border-gold"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <Input
                        aria-label={`Stock for ${r.name}`}
                        type="number"
                        value={r.stock}
                        onChange={(e) =>
                          updateStock(r.productId, r.variantId, Number(e.target.value))
                        }
                        className="h-9 w-20 text-center"
                      />
                      <button
                        type="button"
                        aria-label="Increase stock"
                        onClick={() => updateStock(r.productId, r.variantId, r.stock + 1)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-stone hover:border-gold"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === "In stock" ? "secondary" : "default"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                    {new Date(r.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
