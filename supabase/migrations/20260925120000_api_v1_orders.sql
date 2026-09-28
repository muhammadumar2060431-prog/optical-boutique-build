-- Versioned checkout support: durable idempotency and a database-backed abuse limit.
CREATE TABLE IF NOT EXISTS public.checkout_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.checkout_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.checkout_idempotency FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.api_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_checkout_order_v1(
  p_idempotency_key TEXT,
  p_request_hash TEXT,
  p_orders JSONB,
  p_rate_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
  v_existing_hash TEXT;
  v_existing_response JSONB;
  v_first JSONB;
  v_order JSONB;
  v_response JSONB;
  v_reserved BOOLEAN;
BEGIN
  IF p_idempotency_key !~ '^[A-Za-z0-9._:-]{16,128}$'
    OR p_request_hash !~ '^[a-f0-9]{64}$'
    OR char_length(p_rate_key) NOT BETWEEN 1 AND 200
  THEN
    RAISE EXCEPTION 'INVALID_ORDER';
  END IF;

  INSERT INTO public.api_rate_limits AS limits (bucket_key, window_started_at, request_count)
  VALUES (p_rate_key, now(), 1)
  ON CONFLICT (bucket_key) DO UPDATE SET
    window_started_at = CASE
      WHEN limits.window_started_at <= now() - interval '1 minute' THEN now()
      ELSE limits.window_started_at
    END,
    request_count = CASE
      WHEN limits.window_started_at <= now() - interval '1 minute' THEN 1
      ELSE limits.request_count + 1
    END
  RETURNING request_count INTO v_count;

  IF v_count > 8 THEN
    RAISE EXCEPTION 'RATE_LIMITED';
  END IF;

  IF jsonb_typeof(p_orders) <> 'array' OR jsonb_array_length(p_orders) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'INVALID_ORDER';
  END IF;

  v_first := p_orders->0;
  IF char_length(trim(COALESCE(v_first->>'reference', ''))) NOT BETWEEN 9 AND 32
    OR char_length(trim(COALESCE(v_first->>'customerName', ''))) NOT BETWEEN 2 AND 120
    OR char_length(trim(COALESCE(v_first->>'contact', ''))) NOT BETWEEN 3 AND 320
  THEN
    RAISE EXCEPTION 'INVALID_ORDER';
  END IF;

  FOR v_order IN SELECT value FROM jsonb_array_elements(p_orders)
  LOOP
    IF v_order->>'reference' IS DISTINCT FROM v_first->>'reference'
      OR v_order->>'customerName' IS DISTINCT FROM v_first->>'customerName'
      OR v_order->>'contact' IS DISTINCT FROM v_first->>'contact'
      OR COALESCE(v_order->>'source', '') NOT IN ('cart', 'whatsapp')
      OR char_length(trim(COALESCE(v_order->>'id', ''))) NOT BETWEEN 1 AND 100
      OR char_length(trim(COALESCE(v_order->>'productName', ''))) NOT BETWEEN 1 AND 200
      OR char_length(trim(COALESCE(v_order->>'message', ''))) NOT BETWEEN 1 AND 2000
    THEN
      RAISE EXCEPTION 'INVALID_ORDER';
    END IF;
  END LOOP;

  INSERT INTO public.checkout_idempotency (idempotency_key, request_hash)
  VALUES (p_idempotency_key, p_request_hash)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING true INTO v_reserved;

  IF NOT COALESCE(v_reserved, false) THEN
    SELECT request_hash, response
    INTO v_existing_hash, v_existing_response
    FROM public.checkout_idempotency
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_hash IS DISTINCT FROM p_request_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    IF v_existing_response IS NULL THEN
      RAISE EXCEPTION 'IDEMPOTENCY_IN_PROGRESS';
    END IF;
    RETURN v_existing_response || jsonb_build_object('replayed', true);
  END IF;

  FOR v_order IN SELECT value FROM jsonb_array_elements(p_orders)
  LOOP
    INSERT INTO public.orders (
      id,
      reference,
      customer_name,
      phone,
      address,
      city,
      product_id,
      product_name,
      variant_id,
      variant_label,
      items,
      total,
      status,
      source,
      stock_deducted,
      created_at
    ) VALUES (
      trim(v_order->>'id'),
      trim(v_order->>'reference'),
      trim(v_order->>'customerName'),
      trim(v_order->>'contact'),
      trim(v_order->>'message'),
      'N/A',
      NULLIF(trim(v_order->>'productId'), ''),
      trim(v_order->>'productName'),
      NULLIF(trim(v_order->>'variantId'), ''),
      NULLIF(trim(v_order->>'variantLabel'), ''),
      jsonb_build_array(v_order),
      0,
      'New',
      v_order->>'source',
      false,
      now()
    );
  END LOOP;

  v_response := jsonb_build_object(
    'reference', v_first->>'reference',
    'orders', p_orders,
    'replayed', false
  );

  UPDATE public.checkout_idempotency
  SET response = v_response
  WHERE idempotency_key = p_idempotency_key;

  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.create_checkout_order_v1(TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order_v1(TEXT, TEXT, JSONB, TEXT) TO service_role;

-- Public checkout writes must pass through /api/v1/orders after this migration.
REVOKE INSERT ON public.orders FROM anon;

CREATE INDEX IF NOT EXISTS checkout_idempotency_created_at_idx
  ON public.checkout_idempotency (created_at);

