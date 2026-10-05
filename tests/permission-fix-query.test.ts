import assert from "node:assert/strict";
import { it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { buildPermissionFixQuery } from "../permission-fix-query.ts";

it("preserves SQL dollar quotes and rolls back unexpected row changes", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(
      "CREATE SCHEMA storage; CREATE TABLE storage.objects (id TEXT); CREATE TABLE public.products (id TEXT); INSERT INTO products VALUES ('product'); INSERT INTO storage.objects VALUES ('image');",
    );
    await db.exec(
      buildPermissionFixQuery(
        "BEGIN; CREATE FUNCTION public.test_guard() RETURNS BOOLEAN LANGUAGE plpgsql AS $$ BEGIN RETURN true; END; $$; COMMIT;",
      ),
    );
    assert.deepEqual((await db.query("SELECT test_guard() AS ok")).rows, [{ ok: true }]);
    await assert.rejects(
      db.exec(buildPermissionFixQuery("BEGIN; DELETE FROM public.products; COMMIT;")),
      /Row contents changed/,
    );
    await db.exec("ROLLBACK;");
    assert.deepEqual((await db.query("SELECT id FROM products")).rows, [{ id: "product" }]);
    assert.deepEqual((await db.query("SELECT id FROM storage.objects")).rows, [{ id: "image" }]);
  } finally {
    await db.close();
  }
});
