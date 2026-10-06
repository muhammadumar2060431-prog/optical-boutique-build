import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

it("denies direct public submissions/tracking while retaining admin and service paths", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
      CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.admin',true),'false')::boolean $$;
      CREATE FUNCTION subscribe_email(text,text) RETURNS text LANGUAGE sql AS $$ SELECT $2 $$;
      CREATE FUNCTION lookup_order_by_reference(text) RETURNS text LANGUAGE sql AS $$ SELECT $1 $$;`);
    for (const table of ["orders", "queries", "subscribers"]) {
      await db.exec(`CREATE TABLE ${table}(id text PRIMARY KEY); ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        GRANT ALL ON ${table} TO anon,authenticated;
        CREATE POLICY "Admin writes" ON ${table} FOR ALL TO authenticated USING(is_admin()) WITH CHECK(is_admin());`);
    }
    await db.exec(`CREATE POLICY "Public creates valid orders" ON orders FOR INSERT TO anon WITH CHECK(true);
      CREATE POLICY "Public creates valid queries" ON queries FOR INSERT TO anon WITH CHECK(true);`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261005150000_server_only_public_submissions.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec("SET ROLE anon");
    for (const table of ["orders", "queries", "subscribers"])
      await assert.rejects(db.exec(`INSERT INTO ${table} VALUES('bypass')`), { code: "42501" });
    for (const query of [
      "SELECT subscribe_email('id','synthetic@example.test')",
      "SELECT lookup_order_by_reference('OPT-TEST')",
    ])
      await assert.rejects(db.query(query), { code: "42501" });
    await db.exec("RESET ROLE; SET ROLE authenticated");
    await assert.rejects(db.exec("INSERT INTO queries VALUES('non-admin')"), { code: "42501" });
    await db.exec(
      "SELECT set_config('test.admin','true',false); INSERT INTO queries VALUES('admin'); RESET ROLE; SET ROLE service_role",
    );
    assert.equal(
      (await db.query("SELECT subscribe_email('id','synthetic@example.test') AS email")).rows[0]
        ?.email,
      "synthetic@example.test",
    );
    assert.equal(
      (await db.query("SELECT lookup_order_by_reference('OPT-TEST') AS reference")).rows[0]
        ?.reference,
      "OPT-TEST",
    );
  } finally {
    await db.close();
  }
});
