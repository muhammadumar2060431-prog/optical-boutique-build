BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE TABLE public.storage_cleanup_queue (
  path text PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','deleting','deleted')),
  queued_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  finished_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text
);
ALTER TABLE public.storage_cleanup_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storage_cleanup_queue FROM anon,authenticated;
GRANT ALL ON public.storage_cleanup_queue TO service_role;
CREATE INDEX storage_cleanup_pending_idx ON public.storage_cleanup_queue(status,queued_at) WHERE status<>'deleted';

CREATE FUNCTION public.decode_storage_path_v1(value text)
RETURNS text LANGUAGE plpgsql IMMUTABLE STRICT SET search_path='' AS $$
DECLARE result bytea := ''::bytea; position integer := 1; decoded text;
BEGIN
  WHILE position<=length(value) LOOP
    IF substr(value,position,1)='%' AND substr(value,position+1,2)~'^[0-9A-Fa-f]{2}$' THEN
      result := result || decode(substr(value,position+1,2),'hex'); position := position+3;
    ELSE result := result || convert_to(substr(value,position,1),'UTF8'); position := position+1; END IF;
  END LOOP;
  decoded := convert_from(result,'UTF8');
  IF decoded='' OR decoded LIKE '/%' OR decoded~'(^|/)\.\.(/|$)' THEN RETURN NULL; END IF;
  RETURN decoded;
END $$;

CREATE FUNCTION public.storage_paths_v1(document jsonb)
RETURNS SETOF text LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE child jsonb; match text[]; path text;
BEGIN
  IF jsonb_typeof(document)='object' THEN
    FOR child IN SELECT value FROM jsonb_each(document) LOOP RETURN QUERY SELECT * FROM public.storage_paths_v1(child); END LOOP;
  ELSIF jsonb_typeof(document)='array' THEN
    FOR child IN SELECT value FROM jsonb_array_elements(document) LOOP RETURN QUERY SELECT * FROM public.storage_paths_v1(child); END LOOP;
  ELSIF jsonb_typeof(document)='string' THEN
    FOR match IN SELECT regexp_matches(document #>> '{}',
      'https://jebzcorqtizjakontrrl[.]supabase[.]co/storage/v1/(?:object/(?:public|sign)|render/image/(?:public|sign))/optique-images/([^[:space:]"''<>?#)&]+)','g') LOOP
      path := public.decode_storage_path_v1(match[1]);
      IF path IS NOT NULL THEN RETURN NEXT path; END IF;
    END LOOP;
  END IF;
END $$;

-- Include drafts, disabled content, nested JSON, blog HTML and historical orders.
CREATE FUNCTION public.storage_reference_tables_v1()
RETURNS SETOF text LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT c.relname::text FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname<>'storage_cleanup_queue'
  ORDER BY c.relname
$$;
CREATE FUNCTION public.storage_references_v1()
RETURNS SETOF text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE table_name text;
BEGIN
  FOR table_name IN SELECT * FROM public.storage_reference_tables_v1() LOOP
    RETURN QUERY EXECUTE format('SELECT DISTINCT path FROM public.%I r CROSS JOIN LATERAL public.storage_paths_v1(to_jsonb(r)) AS paths(path)',table_name);
  END LOOP;
END $$;

CREATE FUNCTION public.queue_removed_storage_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE remaining jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP='UPDATE' THEN remaining := to_jsonb(NEW); END IF;
  INSERT INTO public.storage_cleanup_queue(path)
    SELECT DISTINCT path FROM public.storage_paths_v1(to_jsonb(OLD)) AS old_paths(path)
    EXCEPT SELECT path FROM public.storage_paths_v1(remaining) AS new_paths(path)
    ON CONFLICT ON CONSTRAINT storage_cleanup_queue_pkey DO NOTHING;
  RETURN NULL;
END $$;
CREATE FUNCTION public.guard_storage_reference_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.storage_paths_v1(to_jsonb(NEW)) paths(path)
    JOIN public.storage_cleanup_queue q USING(path) WHERE q.status IN ('deleting','deleted')) THEN
    RAISE EXCEPTION 'IMAGE_REMOVED_UPLOAD_AGAIN' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE table_name text; BEGIN
  FOR table_name IN SELECT * FROM public.storage_reference_tables_v1() LOOP
    IF table_name IN ('products','categories','collections','hero_slides','brands','social_reels','testimonials','store_settings','blog_posts','video_settings') THEN
      EXECUTE format('CREATE TRIGGER queue_removed_storage_v1 AFTER UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.queue_removed_storage_v1()',table_name);
    END IF;
    EXECUTE format('CREATE TRIGGER guard_storage_reference_v1 BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_storage_reference_v1()',table_name);
  END LOOP;
END $$;

CREATE FUNCTION public.storage_cleanup_candidates_v1()
RETURNS TABLE(path text) LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  WITH referenced AS MATERIALIZED (SELECT DISTINCT * FROM public.storage_references_v1())
  SELECT q.path FROM public.storage_cleanup_queue q WHERE q.status<>'deleted'
    AND (q.claimed_at IS NULL OR q.claimed_at<now()-interval '5 minutes')
    AND NOT EXISTS(SELECT 1 FROM referenced r WHERE r.storage_references_v1=q.path)
$$;

CREATE FUNCTION public.claim_storage_cleanup_v1(p_limit integer DEFAULT 100)
RETURNS TABLE(path text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE table_name text;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_LIMIT'; END IF;
  -- Finish in-flight writes, then mark candidates before new records can reference them.
  FOR table_name IN SELECT * FROM public.storage_reference_tables_v1() LOOP
    EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE',table_name);
  END LOOP;
  RETURN QUERY UPDATE public.storage_cleanup_queue q SET status='deleting',claimed_at=now(),attempts=attempts+1,last_error=NULL
    WHERE q.path IN (SELECT c.path FROM public.storage_cleanup_candidates_v1() c ORDER BY c.path LIMIT p_limit)
    RETURNING q.path;
END $$;

CREATE FUNCTION public.finish_storage_cleanup_v1(p_paths text[],p_error text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF cardinality(p_paths)>100 THEN RAISE EXCEPTION 'INVALID_LIMIT'; END IF;
  -- Uncertain failures remain protected and retry after the lease expires.
  UPDATE public.storage_cleanup_queue SET status=CASE WHEN p_error IS NULL THEN 'deleted' ELSE 'deleting' END,
    finished_at=CASE WHEN p_error IS NULL THEN now() ELSE NULL END,last_error=left(p_error,500)
    WHERE path=ANY(p_paths) AND status='deleting';
END $$;

REVOKE ALL ON FUNCTION public.storage_references_v1(),public.storage_cleanup_candidates_v1(),
  public.claim_storage_cleanup_v1(integer),public.finish_storage_cleanup_v1(text[],text),
  public.queue_removed_storage_v1(),public.guard_storage_reference_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.storage_cleanup_candidates_v1(),public.claim_storage_cleanup_v1(integer),
  public.finish_storage_cleanup_v1(text[],text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
