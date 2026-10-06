BEGIN;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
CREATE TABLE public.api_rate_buckets (
  route text NOT NULL, address_hash text NOT NULL, window_start timestamptz NOT NULL,
  expires_at timestamptz NOT NULL, requests integer NOT NULL DEFAULT 1,
  PRIMARY KEY(route,address_hash,window_start)
);
ALTER TABLE public.api_rate_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_buckets FROM PUBLIC,anon,authenticated;
CREATE INDEX api_rate_buckets_expiry_idx ON public.api_rate_buckets(expires_at);
CREATE FUNCTION public.consume_api_rate_limit_v1(p_route text,p_address_hash text,p_max integer,p_window_ms integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE bucket public.api_rate_buckets%ROWTYPE; starts timestamptz; ends timestamptz;
BEGIN
  IF p_route IS NULL OR p_address_hash IS NULL OR p_max IS NULL OR p_window_ms IS NULL OR p_route NOT IN ('api.v1.contact.create','api.v1.orders.create','api.v1.reviews.create','api.v1.subscribers.create','api.v1.orders.track')
    OR p_address_hash !~ '^[a-f0-9]{64}$' OR p_max NOT BETWEEN 1 AND 100 OR p_window_ms NOT BETWEEN 1000 AND 3600000 THEN
    RAISE EXCEPTION 'INVALID_RATE_LIMIT'; END IF;
  starts := to_timestamp(floor(extract(epoch FROM clock_timestamp())*1000/p_window_ms)*p_window_ms/1000);
  ends := starts + p_window_ms*interval '1 millisecond';
  INSERT INTO public.api_rate_buckets AS b(route,address_hash,window_start,expires_at)
    VALUES(p_route,p_address_hash,starts,ends)
    ON CONFLICT(route,address_hash,window_start) DO UPDATE SET requests=b.requests+1 RETURNING * INTO bucket;
  RETURN jsonb_build_object('allowed',bucket.requests<=p_max,'remaining',greatest(0,p_max-bucket.requests),
    'retryAfter',greatest(1,ceil(extract(epoch FROM ends-clock_timestamp()))::integer));
END $$;
REVOKE ALL ON FUNCTION public.consume_api_rate_limit_v1(text,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit_v1(text,text,integer,integer) TO service_role;
-- Public reviews also enter through the validated/rate-limited server API.
REVOKE INSERT ON public.testimonials FROM PUBLIC,anon;
NOTIFY pgrst,'reload schema';
COMMIT;
