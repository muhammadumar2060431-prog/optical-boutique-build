-- Enable pg_net for authenticated database-to-function webhooks.
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the trigger function that sends webhook to our Edge Function
CREATE OR REPLACE FUNCTION public.notify_resend_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, pg_temp
AS $$
DECLARE
  service_role_key TEXT;
BEGIN
  service_role_key := current_setting('app.settings.service_role_key', true);
  IF COALESCE(service_role_key, '') = '' THEN
    RAISE WARNING 'Email webhook skipped: app.settings.service_role_key is unavailable';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://jebzcorqtizjakontrrl.supabase.co/functions/v1/resend-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('type', 'INSERT', 'table', TG_TABLE_NAME, 'record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$;

-- Trigger for orders table
DROP TRIGGER IF EXISTS webhook_order_email ON public.orders;
CREATE TRIGGER webhook_order_email
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_resend_emails();

-- Trigger for queries table
DROP TRIGGER IF EXISTS webhook_query_email ON public.queries;
CREATE TRIGGER webhook_query_email
  AFTER INSERT ON public.queries
  FOR EACH ROW EXECUTE FUNCTION public.notify_resend_emails();

-- Trigger for subscribers table
DROP TRIGGER IF EXISTS webhook_subscriber_email ON public.subscribers;
CREATE TRIGGER webhook_subscriber_email
  AFTER INSERT ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.notify_resend_emails();
