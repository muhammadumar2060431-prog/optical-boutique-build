import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronDown, RefreshCw } from "lucide-react";
import { fetchAdminRecords } from "@/lib/admin-records";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAdminProductLookup } from "@/lib/product-selection";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProductPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string | null | undefined;
  onChange: (product: Product | null) => void;
}) {
  const { products: cachedProducts, isAdmin, rememberAdminRecords } = useStore();
  const [search, setSearch] = useState("");
  const [settledSearch, setSettledSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSettledSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const records = useInfiniteQuery({
    queryKey: ["admin-product-picker", settledSearch],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchAdminRecords("products", pageParam, settledSearch),
    getNextPageParam: (last, pages) =>
      pages.length * 50 < last.total ? pages.length + 1 : undefined,
    enabled: isSupabaseConfigured && isAdmin,
    staleTime: 30_000,
  });
  const selected = useAdminProductLookup(value);
  useEffect(() => {
    if (!isAdmin) return;
    const rows = records.data?.pages.flatMap((page) => page.rows) ?? [];
    if (selected.data) rows.push(selected.data);
    if (rows.length)
      rememberAdminRecords("products", [
        ...new Map(rows.map((product) => [product.id, product])).values(),
      ]);
  }, [records.data, selected.data, isAdmin, rememberAdminRecords]);
  const items = isSupabaseConfigured
    ? (records.data?.pages.flatMap((page) => page.rows) ?? [])
    : cachedProducts.filter((product) =>
        product.name.toLowerCase().includes(settledSearch.toLowerCase()),
      );
  const current = selected.data ?? cachedProducts.find((product) => product.id === value);
  const options =
    current && !items.some((product) => product.id === current.id) ? [current, ...items] : items;
  return (
    <div className="space-y-2">
      <Input
        aria-label="Search products"
        placeholder="Search products"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Select
        value={value || "none"}
        onValueChange={(selectedId) => {
          if (selectedId === "none") onChange(null);
          else {
            const product = options.find((item) => item.id === selectedId);
            if (product) onChange(product);
          }
        }}
      >
        <SelectTrigger id={id} className="min-h-11">
          <SelectValue placeholder="Select product" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No associated product</SelectItem>
          {value && !current && !options.some((product) => product.id === value) && (
            <SelectItem value={value}>{value}</SelectItem>
          )}
          {options.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              {product.name} ({product.sku || product.id})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {records.isLoading && (
        <p role="status" className="text-xs text-ink-muted">
          Loading products...
        </p>
      )}
      {(records.isError || selected.isError) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            void records.refetch();
            if (value) void selected.refetch();
          }}
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      )}
      {records.hasNextPage && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={records.isFetchingNextPage}
          onClick={() => void records.fetchNextPage()}
        >
          <ChevronDown className="h-4 w-4" /> Load more
        </Button>
      )}
    </div>
  );
}
