-- ============================================================================
-- Schedule poll-flight-status to run every 5 minutes
-- ============================================================================
-- Run this from the Supabase SQL editor (must be a project owner).
-- Requires the `pg_cron` and `pg_net` extensions to be enabled
-- under Database → Extensions in the Supabase dashboard.
--
-- Replace the two placeholders before running:
--   <PROJECT_REF>      e.g. feslnfaiegtbduxsqrpu
--   <SERVICE_ROLE_KEY> the project's service_role key (keep secret!)
-- ============================================================================

-- 1. Enable extensions (idempotent; safe to re-run)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remove any prior schedule of the same job so we can re-create it
SELECT cron.unschedule('poll-flight-status-every-5min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'poll-flight-status-every-5min'
);

-- 3. Schedule the function. pg_net.http_post is fire-and-forget; the result is
--    written to net._http_response so you can audit calls.
SELECT cron.schedule(
  'poll-flight-status-every-5min',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://<PROJECT_REF>.functions.supabase.co/poll-flight-status',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
      ),
      body := jsonb_build_object('source', 'pg_cron')
    );
  $$
);

-- 4. Verify the job is registered
-- SELECT * FROM cron.job WHERE jobname = 'poll-flight-status-every-5min';

-- 5. Inspect recent runs (audit log written by the function itself)
-- SELECT ran_at, flights_checked, bookings_considered, alerts_sent, ok, error
-- FROM flight_polling_runs
-- ORDER BY ran_at DESC
-- LIMIT 20;
