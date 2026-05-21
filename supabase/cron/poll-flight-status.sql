-- ============================================================================
-- poll-flight-status · strategy and optional schedule
-- ============================================================================
-- Strategy decision (current):
-- - Keep this cron UNSCHEDULED by default.
-- - Reason: `poll-flight-status` is not currently deployed in project
--   mhvjottsregkwadwqwge.
-- - Live flight status is currently served on-demand via backend
--   `/api/flights/status`.
--
-- If/when `poll-flight-status` is deployed, use the optional schedule block
-- at the bottom of this file.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Ensure this job is disabled for now.
SELECT cron.unschedule('poll-flight-status-every-5min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'poll-flight-status-every-5min'
);

-- Confirm disabled:
-- SELECT * FROM cron.job WHERE jobname = 'poll-flight-status-every-5min';

-- ----------------------------------------------------------------------------
-- OPTIONAL: enable schedule only after `poll-flight-status` function exists.
-- Requires vault secrets:
--   - project_url       (https://mhvjottsregkwadwqwge.supabase.co)
--   - service_role_key  (your Supabase service role key)
-- ----------------------------------------------------------------------------
/*
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_url'
  ) THEN
    RAISE EXCEPTION 'Missing vault secret: project_url';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key'
  ) THEN
    RAISE EXCEPTION 'Missing vault secret: service_role_key';
  END IF;
END $$;

SELECT cron.schedule(
  'poll-flight-status-every-5min',
  '*/5 * * * *',
  $cmd$
    SELECT net.http_post(
      url := (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url'
      ) || '/functions/v1/poll-flight-status',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'
        )
      ),
      body := jsonb_build_object('source', 'pg_cron')
    ) AS request_id;
  $cmd$
);
*/
