import { randomUUID } from "node:crypto";

export function buildPermissionFixQuery(sql: string): string {
  const snapshot = `permission_fix_snapshot_${randomUUID().replaceAll("-", "")}`;
  const capture = `
CREATE TEMP TABLE ${snapshot} (relation_name TEXT PRIMARY KEY, row_hash TEXT) ON COMMIT DROP;
DO $$ DECLARE item RECORD; fingerprint TEXT; BEGIN
  FOR item IN SELECT schemaname,tablename FROM pg_tables WHERE schemaname='public'
    OR (schemaname='storage' AND tablename='objects') LOOP
    EXECUTE format('SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, chr(10) ORDER BY to_jsonb(t)::text), '''')) FROM %I.%I t', item.schemaname,item.tablename) INTO fingerprint;
    INSERT INTO ${snapshot} VALUES (format('%I.%I',item.schemaname,item.tablename),fingerprint);
  END LOOP;
END $$;`;
  const verify = `
DO $$ DECLARE item RECORD; fingerprint TEXT; BEGIN
  FOR item IN SELECT * FROM ${snapshot} LOOP
    EXECUTE format('SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, chr(10) ORDER BY to_jsonb(t)::text), '''')) FROM %s t',item.relation_name) INTO fingerprint;
    IF fingerprint IS DISTINCT FROM item.row_hash THEN RAISE EXCEPTION 'Row contents changed: %',item.relation_name; END IF;
  END LOOP;
END $$;
SELECT count(*) AS unchanged_relations FROM ${snapshot};`;
  // Callback replacement preserves SQL dollar quotes, unlike replacement strings.
  return sql
    .replace(
      "BEGIN;",
      () =>
        `BEGIN ISOLATION LEVEL REPEATABLE READ;\nSET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';\n${capture}`,
    )
    .replace("COMMIT;", () => `${verify}\nCOMMIT;`);
}
