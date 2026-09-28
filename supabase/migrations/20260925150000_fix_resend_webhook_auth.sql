-- Authenticate database-to-function email webhooks with a dedicated secret.
-- The secret itself is encrypted in Supabase Vault and is never stored in Git.
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE OR REPLACE FUNCTION public.notify_resend_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault, pg_temp
AS $$
DECLARE
  webhook_secret TEXT;
BEGIN
  SELECT decrypted_secret
  INTO webhook_secret
  FROM vault.decrypted_secrets
  WHERE name = 'resend_webhook_secret'
  LIMIT 1;

  IF COALESCE(webhook_secret, '') = '' THEN
    RAISE WARNING 'Email webhook skipped: Vault secret resend_webhook_secret is unavailable';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://jebzcorqtizjakontrrl.supabase.co/functions/v1/resend-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Resend-Webhook-Secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW)
    )
  );

  RETURN NEW;
END;
$$;