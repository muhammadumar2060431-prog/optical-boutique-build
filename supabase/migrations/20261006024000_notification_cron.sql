BEGIN;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE FUNCTION public.dispatch_notification_worker_v1()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE endpoint text; secret text; request_id bigint;
BEGIN
  SELECT decrypted_secret INTO endpoint FROM vault.decrypted_secrets WHERE name='notification_worker_url' LIMIT 1;
  SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name='resend_webhook_secret' LIMIT 1;
  IF endpoint IS NULL OR secret IS NULL THEN RAISE EXCEPTION 'WORKER_NOT_CONFIGURED'; END IF;
  SELECT net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','X-Resend-Webhook-Secret',secret),body:='{}'::jsonb,timeout_milliseconds:=60000) INTO request_id;
  RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_notification_worker_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_notification_worker_v1() TO service_role;
-- Configure notification_worker_url in Vault and deploy the worker before enabling this schedule.
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='notification_worker_url')
    OR NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='resend_webhook_secret') THEN
    RAISE EXCEPTION 'Worker Vault configuration missing'; END IF;
END $$;
SELECT cron.schedule('notification-worker-every-minute','* * * * *','SELECT public.dispatch_notification_worker_v1();');
SELECT cron.schedule('api-rate-bucket-cleanup','17 * * * *','DELETE FROM public.api_rate_buckets WHERE expires_at<now()-interval ''1 day'';');
SELECT cron.schedule('notification-payload-retention','23 3 * * *','UPDATE public.notification_jobs SET payload=''{}''::jsonb WHERE status=''Sent'' AND finished_at<now()-interval ''30 days'' AND payload<>''{}''::jsonb;');
COMMIT;
