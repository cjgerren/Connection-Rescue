-- ============================================================================
-- process-rescue-tasks · 1-minute cron
-- ============================================================================
-- Schedules the deployed `process-rescue-tasks` edge function in project:
--   mhvjottsregkwadwqwge
--
-- This version removes URL/token placeholders by using Supabase Vault secrets.
-- Required vault secret names:
--   - project_url       (https://mhvjottsregkwadwqwge.supabase.co)
--   - service_role_key  (your Supabase service role key)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Ensure project_url exists and matches this repo's linked project.
DO $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT id
  INTO existing_id
  FROM vault.decrypted_secrets
  WHERE name = 'project_url'
  LIMIT 1;

  IF existing_id IS NULL THEN
    PERFORM vault.create_secret(
      'https://mhvjottsregkwadwqwge.supabase.co',
      'project_url',
      'ConnectionRescue project URL for pg_cron edge function calls'
    );
  ELSE
    PERFORM vault.update_secret(
      existing_id,
      'https://mhvjottsregkwadwqwge.supabase.co',
      'project_url',
      'ConnectionRescue project URL for pg_cron edge function calls'
    );
  END IF;
END $$;

-- service_role_key is intentionally not written here.
-- Create it once from Dashboard > Database > Vault or with SQL:
--   select vault.create_secret('your-service-role-key', 'service_role_key');
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
  ) THEN
    RAISE EXCEPTION 'Missing vault secret: service_role_key';
  END IF;
END $$;

-- Idempotent re-schedule.
SELECT cron.unschedule('process-rescue-tasks-every-minute')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-rescue-tasks-every-minute'
);

SELECT cron.schedule(
  'process-rescue-tasks-every-minute',
  '* * * * *',
  $cmd$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url'
    ) || '/functions/v1/process-rescue-tasks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'
      )
    ),
    body := jsonb_build_object(
      'source', 'pg_cron',
      'job', 'process-rescue-tasks-every-minute'
    )
  ) AS request_id;
  $cmd$
);

-- Verify registration:
-- SELECT * FROM cron.job WHERE jobname = 'process-rescue-tasks-every-minute';

-- Inspect request responses:
-- SELECT id, status_code, content, created
-- FROM net._http_response
-- ORDER BY created DESC
-- LIMIT 20;
