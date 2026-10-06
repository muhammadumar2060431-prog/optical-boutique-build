BEGIN;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
CREATE EXTENSION IF NOT EXISTS pgmq;
SELECT pgmq.create('notification_jobs');
CREATE TABLE public.notification_jobs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dedupe_key text NOT NULL UNIQUE, payload jsonb NOT NULL, message_id bigint,
  status text NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Processing','Sent','Failed')),
  attempts integer NOT NULL DEFAULT 0, sent_targets jsonb NOT NULL DEFAULT '[]',
  lease_token uuid, lease_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz, error_code text
);
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_jobs FROM PUBLIC,anon,authenticated;
CREATE POLICY "Administrators read notification jobs" ON public.notification_jobs FOR SELECT TO authenticated USING(public.is_admin());
GRANT SELECT ON public.notification_jobs TO authenticated;
CREATE INDEX notification_jobs_status_created_idx ON public.notification_jobs(status,created_at DESC);
REVOKE ALL ON SCHEMA pgmq FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA pgmq FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pgmq FROM PUBLIC,anon,authenticated;

-- Existing INSERT triggers now enqueue transactionally, instead of firing an untracked HTTP call.
CREATE OR REPLACE FUNCTION public.notify_resend_emails()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE job_id bigint; msg_id bigint;
BEGIN
  IF TG_OP<>'INSERT' OR TG_TABLE_NAME NOT IN ('orders','queries','subscribers') THEN RETURN NEW; END IF;
  INSERT INTO public.notification_jobs(dedupe_key,payload)
    VALUES(TG_TABLE_NAME||':'||NEW.id,jsonb_build_object('table',TG_TABLE_NAME,'record',to_jsonb(NEW)))
    ON CONFLICT(dedupe_key) DO NOTHING RETURNING id INTO job_id;
  IF job_id IS NOT NULL THEN
    SELECT pgmq.send('notification_jobs',jsonb_build_object('jobId',job_id::text)) INTO msg_id;
    UPDATE public.notification_jobs SET message_id=msg_id WHERE id=job_id;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_resend_emails() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.claim_notification_job_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE message pgmq.message_record; job public.notification_jobs%ROWTYPE;
BEGIN
  SELECT * INTO message FROM pgmq.read('notification_jobs',180,1);
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO job FROM public.notification_jobs WHERE id=(message.message->>'jobId')::bigint FOR UPDATE;
  IF NOT FOUND OR job.status IN ('Sent','Failed') OR job.message_id<>message.msg_id THEN
    PERFORM pgmq.archive('notification_jobs',message.msg_id); RETURN NULL; END IF;
  IF job.attempts>=8 THEN
    UPDATE public.notification_jobs SET status='Failed',error_code='MAX_ATTEMPTS',lease_token=NULL,lease_until=NULL WHERE id=job.id;
    PERFORM pgmq.archive('notification_jobs',message.msg_id); RETURN NULL;
  END IF;
  UPDATE public.notification_jobs SET status='Processing',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '180 seconds'
    WHERE id=job.id RETURNING * INTO job;
  RETURN jsonb_build_object('id',job.id::text,'dedupeKey',job.dedupe_key,'payload',job.payload,
    'sentTargets',job.sent_targets,'leaseToken',job.lease_token,'attempts',job.attempts);
END $$;
CREATE FUNCTION public.mark_notification_delivery_v1(p_job_id bigint,p_lease_token uuid,p_target text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_target NOT IN ('customer','admin','subscriber') THEN RAISE EXCEPTION 'INVALID_TARGET'; END IF;
  UPDATE public.notification_jobs SET sent_targets=CASE WHEN sent_targets ? p_target THEN sent_targets ELSE sent_targets||to_jsonb(p_target) END
    WHERE id=p_job_id AND status='Processing' AND lease_token=p_lease_token AND lease_until>now();
  IF NOT FOUND THEN RAISE EXCEPTION 'LEASE_EXPIRED'; END IF;
END $$;
CREATE FUNCTION public.finish_notification_job_v1(p_job_id bigint,p_lease_token uuid,p_success boolean,p_error_code text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE job public.notification_jobs%ROWTYPE; delay integer;
BEGIN
  SELECT * INTO job FROM public.notification_jobs WHERE id=p_job_id AND status='Processing'
    AND lease_token=p_lease_token AND lease_until>now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEASE_EXPIRED'; END IF;
  IF p_success THEN
    PERFORM pgmq.archive('notification_jobs',job.message_id);
    UPDATE public.notification_jobs SET status='Sent',finished_at=now(),lease_token=NULL,lease_until=NULL,error_code=NULL WHERE id=job.id;
  ELSIF job.attempts>=8 THEN
    PERFORM pgmq.archive('notification_jobs',job.message_id);
    UPDATE public.notification_jobs SET status='Failed',lease_token=NULL,lease_until=NULL,error_code=left(p_error_code,80) WHERE id=job.id;
  ELSE
    delay := least(3600,60*power(2,job.attempts-1)::integer);
    PERFORM pgmq.set_vt('notification_jobs',job.message_id,delay);
    UPDATE public.notification_jobs SET status='Pending',lease_token=NULL,lease_until=NULL,error_code=left(p_error_code,80) WHERE id=job.id;
  END IF;
END $$;
CREATE FUNCTION public.notification_queue_health_v1()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object('pending',count(*) FILTER(WHERE status='Pending'),'processing',count(*) FILTER(WHERE status='Processing'),
    'failed',count(*) FILTER(WHERE status='Failed'),'sent',count(*) FILTER(WHERE status='Sent'),
    'oldestPendingAt',min(created_at) FILTER(WHERE status IN ('Pending','Processing'))) FROM public.notification_jobs;
$$;
CREATE FUNCTION public.admin_notification_queue_v1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT COALESCE(public.is_admin(),false) THEN RAISE EXCEPTION 'Administrator permission required' USING ERRCODE='42501'; END IF;
  RETURN public.notification_queue_health_v1()||jsonb_build_object('failedJobs',
    (SELECT COALESCE(jsonb_agg(to_jsonb(j)),'[]') FROM (
      SELECT id::text,status,attempts,created_at,error_code FROM public.notification_jobs WHERE status='Failed' ORDER BY created_at DESC LIMIT 10) j));
END $$;
CREATE FUNCTION public.retry_notification_job_v1(p_job_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE job public.notification_jobs%ROWTYPE; msg_id bigint;
BEGIN
  IF NOT COALESCE(public.is_admin(),false) THEN RAISE EXCEPTION 'Administrator permission required' USING ERRCODE='42501'; END IF;
  SELECT * INTO job FROM public.notification_jobs WHERE id=p_job_id AND status='Failed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'JOB_NOT_FAILED'; END IF;
  SELECT pgmq.send('notification_jobs',jsonb_build_object('jobId',job.id::text)) INTO msg_id;
  UPDATE public.notification_jobs SET status='Pending',attempts=0,message_id=msg_id,error_code=NULL,lease_token=NULL,lease_until=NULL WHERE id=job.id;
END $$;
REVOKE ALL ON FUNCTION public.claim_notification_job_v1(),public.mark_notification_delivery_v1(bigint,uuid,text),
  public.finish_notification_job_v1(bigint,uuid,boolean,text),public.notification_queue_health_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_job_v1(),public.mark_notification_delivery_v1(bigint,uuid,text),
  public.finish_notification_job_v1(bigint,uuid,boolean,text),public.notification_queue_health_v1() TO service_role;
REVOKE ALL ON FUNCTION public.admin_notification_queue_v1(),public.retry_notification_job_v1(bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_notification_queue_v1(),public.retry_notification_job_v1(bigint) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
