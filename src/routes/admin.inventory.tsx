import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";

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

  const handleStockChange = (
    productId: string,
    variantId: string | null,
    newQty: number,
    productName: string,
  ) => {
    const safe = Math.max(0, Math.round(newQty) || 0);
    if (
      !window.confirm(
        `Aap "${productName}" ka stock change karke ${safe} karna chahte hain? (Are you sure you want to set stock to ${safe}?)`,
      )
    ) {
      return;
    }
    updateStock(productId, variantId, safe);
    toast.success(`"${productName}" stock updated to ${safe}.`);
  };

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
          className="min-h-11 bg-white border-zinc-300"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger
            aria-label="Filter by category"
            className="min-h-11 bg-white border-zinc-300"
          >
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
          <SelectTrigger
            aria-label="Filter by stock status"
            className="min-h-11 bg-white border-zinc-300"
          >
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
        <p className="rounded-xl border border-dashed border-[#666666] bg-[#f9f9f9] px-6 py-16 text-center text-sm text-ink-muted">
          Nothing matches this view. Clear the filters to see all stock.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#666666] bg-[#f9f9f9] shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b-2 border-[#555555] bg-[#666666] text-left text-xs tracking-[0.14em] uppercase text-white">
              <tr>
                <th className="px-4 py-3 text-white font-semibold">Category</th>
                <th className="px-4 py-3 text-white font-semibold">Product / variant</th>
                <th className="px-4 py-3 text-white font-semibold">Stock</th>
                <th className="px-4 py-3 text-white font-semibold">Status</th>
                <th className="px-4 py-3 text-white font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-300 bg-[#f9f9f9]">
              {rows.map((r) => (
                <tr
                  key={r.key}
                  className={cn(
                    "hover:bg-zinc-200/80 transition-colors",
                    r.status !== "In stock" && "bg-amber-50/20",
                  )}
                >
                  <td className="px-4 py-3 text-ink-muted">{r.categoryName}</td>
                  <td className="px-4 py-3 font-semibold">{r.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Decrease stock"
                        onClick={() => handleStockChange(r.productId, r.variantId, r.stock - 1, r.name)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-zinc-300 bg-white hover:border-[#666666]"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <Input
                        aria-label={`Stock for ${r.name}`}
                        type="number"
                        value={r.stock}
                        onChange={(e) =>
                          handleStockChange(r.productId, r.variantId, Number(e.target.value), r.name)
                        }
                        className="h-9 w-20 text-center bg-white border-zinc-300"
                      />
                      <button
                        type="button"
                        aria-label="Increase stock"
                        onClick={() => handleStockChange(r.productId, r.variantId, r.stock + 1, r.name)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-zinc-300 bg-white hover:border-[#666666]"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        "font-semibold shadow-xs text-xs px-2.5 py-0.5",
                        r.status === "Low stock"
                          ? "bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5] hover:bg-[#fecaca]"
                          : r.status === "Out of stock"
                            ? "bg-red-950 text-white border border-red-900"
                            : "bg-zinc-200 text-zinc-800 border border-zinc-300 font-medium",
                      )}
                    >
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
