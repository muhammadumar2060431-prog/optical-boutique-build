import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { parseOrderRecord, useStore } from "./store";
import { mapDbProductToStore } from "./supabaseSync";
import type { ContactQuery, Order, Product, Subscriber } from "./types";

export interface AdminRecordMap {
  orders: Order;
  queries: ContactQuery;
  subscribers: Subscriber;
  products: Product;
  inventory: ReturnType<ReturnType<typeof useStore>["getInventoryRows"]>[number] & {
    product: Record<string, unknown>;
  };
}
export interface RecordPage<T> {
  rows: T[];
  total: number;
}

export async function fetchAdminRecords<K extends keyof AdminRecordMap>(
  kind: K,
  page: number,
  search = "",
  status = "all",
  source = "all",
  limit = 50,
  collection = "all",
): Promise<RecordPage<AdminRecordMap[K]>> {
  const { data, error } = await supabase.rpc("admin_record_page_v1", {
    p_kind: kind,
    p_limit: limit,
    p_offset: (page - 1) * limit,
    p_search: search.trim(),
    p_status: status,
    p_source: source,
    p_collection: collection,
  });
  if (error || !data || !Array.isArray(data.rows))
    throw new Error("Records could not be loaded. Please retry.");
  const rows = data.rows.map((raw: Record<string, unknown>) => {
    if (kind === "orders") return parseOrderRecord(raw);
    if (kind === "products") return mapDbProductToStore(raw);
    if (kind === "inventory") return raw;
    if (kind === "queries")
      return {
        id: raw["id"],
        name: raw["name"],
        contact: raw["contact"],
        productName: raw["product_name"] || "",
        message: raw["message"] || "",
        createdAt: raw["created_at"],
        status: raw["status"] || "New",
      };
    return {
      id: raw["id"],
      email: raw["email"],
      status: raw["status"],
      createdAt: raw["created_at"],
    };
  }) as AdminRecordMap[K][];
  return { rows, total: Number(data.total) || 0 };
}

export function useAdminRecords<K extends keyof AdminRecordMap>(
  kind: K,
  search = "",
  status = "all",
  source = "all",
  collection = "all",
) {
  const { isAdmin, rememberAdminRecords } = useStore();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [settledSearch, setSettledSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSettledSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setPage(1);
  }, [status, source, collection]);
  const query = useQuery({
    queryKey: ["admin-records", kind, page, settledSearch, status, source, collection],
    queryFn: () => fetchAdminRecords(kind, page, settledSearch, status, source, 50, collection),
    enabled: isAdmin,
    staleTime: 0,
    refetchInterval: 30000,
  });
  useEffect(() => {
    if (isAdmin && query.data) {
      if (kind === "inventory")
        rememberAdminRecords(
          "products",
          (query.data.rows as AdminRecordMap["inventory"][]).map((row) =>
            mapDbProductToStore(row.product),
          ),
        );
      else
        rememberAdminRecords(
          kind,
          query.data.rows as Array<Order | ContactQuery | Subscriber | Product>,
        );
    }
  }, [isAdmin, query.data, kind, rememberAdminRecords]);
  useEffect(() => {
    if (!isAdmin) client.removeQueries({ queryKey: ["admin-records"] });
  }, [isAdmin, client]);
  useEffect(() => {
    if (query.data && page > 1 && !query.data.rows.length)
      setPage(Math.max(1, Math.ceil(query.data.total / 50)));
  }, [page, query.data]);
  return {
    ...query,
    page,
    setPage,
    rows: isAdmin ? query.data?.rows || [] : [],
    total: isAdmin ? query.data?.total || 0 : 0,
  };
}
