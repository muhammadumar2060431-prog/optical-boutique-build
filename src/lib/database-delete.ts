import type { SupabaseClient } from "@supabase/supabase-js";

export type DeletableTable =
  | "products"
  | "categories"
  | "collections"
  | "hero_slides"
  | "brands"
  | "social_reels"
  | "testimonials"
  | "faqs"
  | "subscribers"
  | "blog_posts"
  | "queries"
  | "orders";

export async function requireDatabaseAdmin(client: SupabaseClient) {
  const user = await client.auth.getUser();
  if (user.error || !user.data.user)
    throw new Error("Sign in with your admin account before changing records.");
  const admin = await client.rpc("is_admin");
  if (admin.error || admin.data !== true)
    throw new Error("Administrator permission could not be verified.");
}

export async function updateInquiryStatus(
  client: SupabaseClient,
  id: string,
  status: "New" | "Responded" | "Archived",
): Promise<boolean> {
  if (!id || id !== id.trim() || id.length > 100) throw new Error("Invalid record ID.");
  await requireDatabaseAdmin(client);
  const existing = await client.from("queries").select("id").eq("id", id).maybeSingle();
  if (existing.error) throw existing.error;
  const table = existing.data ? "queries" : "orders";
  let mutation = client.from(table).update({ status }).eq("id", id).is("deleted_at", null);
  if (table === "orders") mutation = mutation.eq("source", "form");
  const result = await mutation.select("id");
  if (result.error) throw result.error;
  if (result.data?.length !== 1 || result.data[0]?.id !== id)
    throw new Error("Database did not confirm the status change. Refresh and try again.");
  return true;
}

export async function deleteDatabaseRecord(
  client: SupabaseClient,
  table: DeletableTable,
  id: string,
): Promise<boolean> {
  if (!id || id !== id.trim() || id.length > 100) throw new Error("Invalid record ID.");
  await requireDatabaseAdmin(client);
  // Never cascade a category/collection deletion into live product removal.
  if (table === "categories") {
    for (const child of ["products", "collections"]) {
      const result = await client.from(child).select("id").eq("category_id", id).limit(1);
      if (result.error) throw result.error;
      if (result.data?.length)
        throw new Error(
          "Move linked products and collections to another category before deleting it.",
        );
    }
  }
  if (table === "collections") {
    const linked = await client
      .from("products")
      .select("id")
      .contains("collection_ids", [id])
      .limit(1);
    if (linked.error) throw linked.error;
    if (linked.data?.length)
      throw new Error("Move linked products to another collection before deleting it.");
  }
  const softDelete = table === "orders" || table === "queries";
  let existingQuery = client.from(table).select("id, deleted_at");
  if (!softDelete) existingQuery = client.from(table).select("id");
  existingQuery = existingQuery.eq("id", id);
  if (table === "orders") existingQuery = existingQuery.eq("source", "form");
  const existing = await existingQuery.maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data || (softDelete && existing.data.deleted_at)) return true;

  let mutation = softDelete
    ? client
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .is("deleted_at", null)
    : client.from(table).delete().eq("id", id);
  if (table === "orders") mutation = mutation.eq("source", "form");
  const result = await mutation.select("id");
  if (result.error) throw result.error;
  if (result.data?.length !== 1 || result.data?.[0]?.id !== id)
    throw new Error("Database did not confirm deletion. Refresh and try again.");
  return true;
}
