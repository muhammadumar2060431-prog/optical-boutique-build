-- SQL access required. Planning only: no ANALYZE, mutations, or customer data output.
BEGIN TRANSACTION READ ONLY;

EXPLAIN (FORMAT JSON) SELECT id FROM public.products WHERE enabled = true ORDER BY created_at DESC;
EXPLAIN (FORMAT JSON) SELECT id FROM public.products WHERE lower(slug) = 'audit-product';
EXPLAIN (FORMAT JSON) SELECT id FROM public.products WHERE collection_ids @> ARRAY['audit-collection']::TEXT[];
EXPLAIN (FORMAT JSON) SELECT id FROM public.collections WHERE category_id = 'audit-category' ORDER BY sort_order;
EXPLAIN (FORMAT JSON) SELECT id FROM public.orders WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 50;
EXPLAIN (FORMAT JSON) SELECT id FROM public.orders
WHERE deleted_at IS NULL AND source <> 'form'
AND regexp_replace(upper(COALESCE(reference, items->0->>'reference', '')), '[^A-Z0-9]', '', 'g') = 'AUDIT0000';

SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_stat_statements', 'pg_cron', 'pg_net');

-- Aggregate timings only; statements and literals may contain sensitive data and are omitted.
DO $$
DECLARE
  statistics_schema TEXT;
  summary JSONB;
BEGIN
  SELECT n.nspname INTO statistics_schema FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pg_stat_statements';
  IF statistics_schema IS NOT NULL THEN
    EXECUTE format('SELECT jsonb_agg(to_jsonb(s)) FROM (SELECT queryid, calls,
      mean_exec_time, total_exec_time, rows, shared_blks_hit, shared_blks_read
      FROM %I.pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20) s', statistics_schema)
      INTO summary;
    RAISE NOTICE 'Statement timing aggregates: %', summary;
  ELSE
    RAISE NOTICE 'pg_stat_statements is unavailable; statement timing audit remains pending';
  END IF;
END;
$$;

COMMIT;
