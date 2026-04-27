-- ============================================================================
-- process-rescue-tasks · 1-minute cron
-- ============================================================================
-- Picks up queued rescue_tasks (rebook_search / hotel_hold) and dispatches them
-- via the process-rescue-tasks edge function which texts the traveler 3
-- numbered options.
--
-- Apply this once with an operator role that has access to pg_cron / pg_net.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotent re-schedule
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-rescue-tasks-every-minute') THEN
    PERFORM cron.unschedule('process-rescue-tasks-every-minute');
  END IF;
END $$;

SELECT cron.schedule(
  'process-rescue-tasks-every-minute',
  '* * * * *',
  $cmd$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-rescue-tasks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $cmd$
);
