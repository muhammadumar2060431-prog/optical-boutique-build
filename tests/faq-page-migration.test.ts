import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

it("preserves homepage FAQs and persists valid additional page placements", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`
      CREATE TABLE public.faqs (id text PRIMARY KEY, show_on_home boolean DEFAULT false);
      INSERT INTO public.faqs VALUES ('featured', true), ('general', false);
    `);
    const sql = await readFile(
      new URL("../supabase/migrations/20261005120000_faq_page_placements.sql", import.meta.url),
      "utf8",
    );
    await db.exec(sql);
    await db.exec(sql);
    const result = await db.query<{ id: string; show_on_pages: string[] }>(
      "SELECT id, show_on_pages FROM public.faqs ORDER BY id",
    );
    assert.deepEqual(result.rows, [
      { id: "featured", show_on_pages: ["home"] },
      { id: "general", show_on_pages: [] },
    ]);
    await db.exec(
      "UPDATE public.faqs SET show_on_pages = ARRAY['contact', 'checkout'] WHERE id = 'general'",
    );
    await assert.rejects(
      db.exec("UPDATE public.faqs SET show_on_pages = ARRAY['unknown'] WHERE id = 'general'"),
    );
  } finally {
    await db.close();
  }
});
