import { createClient } from "@supabase/supabase-js";

import { createContactHandler, type ContactRepository } from "./contact-handler.ts";
import { ApiError } from "./http.server.ts";

function serviceClient() {
  const url =
    process.env["SUPABASE_URL"] ??
    process.env["VITE_SUPABASE_URL"] ??
    import.meta.env.VITE_SUPABASE_URL;
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Contact service is temporarily unavailable.");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const repository: ContactRepository = {
  async create(input) {
    const id = `qry-${crypto.randomUUID()}`;
    const { error } = await serviceClient().from("queries").insert({
      id,
      name: input.name,
      contact: input.contact,
      product_name: input.productName,
      product_id: input.productId,
      message: input.message,
      status: "New",
      created_at: new Date().toISOString(),
    });
    if (error) throw new Error("Contact query insert failed");
    return { id };
  },
};

export const contactHandler = createContactHandler(repository);
