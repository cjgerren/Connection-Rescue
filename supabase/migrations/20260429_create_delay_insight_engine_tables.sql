create extension if not exists pgcrypto;

create table if not exists public.flight_monitor_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  flight_key text not null check (length(trim(flight_key)) > 0),
  trip_id uuid,
  booking_id uuid,
  source text not null check (length(trim(source)) > 0),
  event_type text not null check (length(trim(event_type)) > 0),
  observed_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists flight_monitor_events_flight_key_observed_at_idx
  on public.flight_monitor_events (flight_key, observed_at desc);

create index if not exists flight_monitor_events_trip_id_observed_at_idx
  on public.flight_monitor_events (trip_id, observed_at desc);

create index if not exists flight_monitor_events_booking_id_observed_at_idx
  on public.flight_monitor_events (booking_id, observed_at desc);

alter table public.flight_monitor_events enable row level security;

drop policy if exists "service_role_only_flight_monitor_events" on public.flight_monitor_events;
create policy "service_role_only_flight_monitor_events"
  on public.flight_monitor_events
  for all
  to public
  using (false)
  with check (false);


create table if not exists public.delay_signal_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  flight_key text not null check (length(trim(flight_key)) > 0),
  snapshot_at timestamptz not null,
  delay_minutes integer check (delay_minutes is null or delay_minutes >= 0),
  faa_status text,
  weather_status text,
  inbound_status text,
  traveler_signal_count integer not null default 0 check (traveler_signal_count >= 0),
  signals jsonb not null default '{}'::jsonb
);

create index if not exists delay_signal_snapshots_flight_key_snapshot_at_idx
  on public.delay_signal_snapshots (flight_key, snapshot_at desc);

alter table public.delay_signal_snapshots enable row level security;

drop policy if exists "service_role_only_delay_signal_snapshots" on public.delay_signal_snapshots;
create policy "service_role_only_delay_signal_snapshots"
  on public.delay_signal_snapshots
  for all
  to public
  using (false)
  with check (false);


create table if not exists public.user_delay_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trip_id uuid,
  booking_id uuid,
  flight_key text not null check (length(trim(flight_key)) > 0),
  traveler_email text,
  traveler_user_id uuid,
  report_type text not null check (length(trim(report_type)) > 0),
  free_text text,
  structured_flags jsonb not null default '{}'::jsonb,
  reported_at timestamptz not null
);

create index if not exists user_delay_reports_flight_key_reported_at_idx
  on public.user_delay_reports (flight_key, reported_at desc);

create index if not exists user_delay_reports_traveler_user_id_reported_at_idx
  on public.user_delay_reports (traveler_user_id, reported_at desc);

create index if not exists user_delay_reports_booking_id_reported_at_idx
  on public.user_delay_reports (booking_id, reported_at desc);

alter table public.user_delay_reports enable row level security;

drop policy if exists "service_role_only_user_delay_reports" on public.user_delay_reports;
create policy "service_role_only_user_delay_reports"
  on public.user_delay_reports
  for all
  to public
  using (false)
  with check (false);


create table if not exists public.delay_inference_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  flight_key text not null check (length(trim(flight_key)) > 0),
  trip_id uuid,
  booking_id uuid,
  computed_at timestamptz not null,
  cause_bucket text not null check (
    cause_bucket in (
      'maintenance',
      'faa_atc',
      'weather',
      'late_inbound',
      'crew_ops',
      'ground_ops',
      'security',
      'unknown'
    )
  ),
  cause_confidence numeric(5,4) not null check (cause_confidence >= 0 and cause_confidence <= 1),
  eta_min_minutes integer check (eta_min_minutes is null or eta_min_minutes >= 0),
  eta_max_minutes integer check (eta_max_minutes is null or eta_max_minutes >= 0),
  projected_departure_at timestamptz,
  projected_arrival_at timestamptz,
  recommended_action text not null check (
    recommended_action in (
      'monitor',
      'prepare_backup',
      'show_recovery_options',
      'start_rescue_checkout'
    )
  ),
  top_signals jsonb not null default '[]'::jsonb,
  model_version text not null default 'rules_v1',
  check (
    eta_min_minutes is null
    or eta_max_minutes is null
    or eta_max_minutes >= eta_min_minutes
  )
);

create index if not exists delay_inference_results_flight_key_computed_at_idx
  on public.delay_inference_results (flight_key, computed_at desc);

create index if not exists delay_inference_results_trip_id_computed_at_idx
  on public.delay_inference_results (trip_id, computed_at desc);

create index if not exists delay_inference_results_booking_id_computed_at_idx
  on public.delay_inference_results (booking_id, computed_at desc);

alter table public.delay_inference_results enable row level security;

drop policy if exists "service_role_only_delay_inference_results" on public.delay_inference_results;
create policy "service_role_only_delay_inference_results"
  on public.delay_inference_results
  for all
  to public
  using (false)
  with check (false);


create table if not exists public.connection_risk_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trip_id uuid not null,
  connection_key text not null check (length(trim(connection_key)) > 0),
  computed_at timestamptz not null,
  miss_probability numeric(5,4) not null check (miss_probability >= 0 and miss_probability <= 1),
  minimum_connection_minutes integer check (minimum_connection_minutes is null or minimum_connection_minutes >= 0),
  projected_slack_minutes integer,
  risk_band text not null check (
    risk_band in (
      'safe',
      'tight',
      'high_risk',
      'rescue_now'
    )
  ),
  recommended_action text not null check (
    recommended_action in (
      'monitor',
      'prepare_backup',
      'show_recovery_options',
      'start_rescue_checkout'
    )
  ),
  inputs jsonb not null default '{}'::jsonb
);

create index if not exists connection_risk_scores_trip_id_computed_at_idx
  on public.connection_risk_scores (trip_id, computed_at desc);

create index if not exists connection_risk_scores_connection_key_computed_at_idx
  on public.connection_risk_scores (connection_key, computed_at desc);

alter table public.connection_risk_scores enable row level security;

drop policy if exists "service_role_only_connection_risk_scores" on public.connection_risk_scores;
create policy "service_role_only_connection_risk_scores"
  on public.connection_risk_scores
  for all
  to public
  using (false)
  with check (false);
