create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null unique,
  email text not null,
  role text not null check (role in ('admin', 'owner'))
);

create unique index if not exists admin_users_email_lower_idx
  on public.admin_users (lower(email));

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

create or replace function public.is_owner_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and role = 'owner'
  );
$$;

grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.is_owner_user() to authenticated;

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "admin_users_service_role_write_only" on public.admin_users;
create policy "admin_users_service_role_write_only"
  on public.admin_users
  for all
  to public
  using (false)
  with check (false);


create table if not exists public.admin_invites (
  email text primary key,
  created_at timestamptz not null default now(),
  role text not null check (role in ('admin', 'owner'))
);

alter table public.admin_invites enable row level security;

drop policy if exists "admin_invites_service_role_only" on public.admin_invites;
create policy "admin_invites_service_role_only"
  on public.admin_invites
  for all
  to public
  using (false)
  with check (false);


create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid,
  actor_email text,
  action text not null check (length(trim(action)) > 0),
  target text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_actor_user_id_idx
  on public.admin_audit_log (actor_user_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_audit_log_select_admins" on public.admin_audit_log;
create policy "admin_audit_log_select_admins"
  on public.admin_audit_log
  for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "admin_audit_log_insert_admins" on public.admin_audit_log;
create policy "admin_audit_log_insert_admins"
  on public.admin_audit_log
  for insert
  to authenticated
  with check (
    public.is_admin_user()
    and (actor_user_id is null or actor_user_id = auth.uid())
  );

drop policy if exists "admin_audit_log_no_client_mutation" on public.admin_audit_log;
create policy "admin_audit_log_no_client_mutation"
  on public.admin_audit_log
  for all
  to public
  using (false)
  with check (false);


create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid,
  actor_email text,
  action text not null check (length(trim(action)) > 0),
  target text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_admins" on public.audit_logs;
create policy "audit_logs_select_admins"
  on public.audit_logs
  for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "audit_logs_service_role_only" on public.audit_logs;
create policy "audit_logs_service_role_only"
  on public.audit_logs
  for all
  to public
  using (false)
  with check (false);


create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  run_id text,
  offer_id text,
  supplier text,
  supplier_confirmation_number text,
  supplier_metadata jsonb not null default '{}'::jsonb,
  stripe_session_id text,
  total_amount numeric(10,2),
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  currency text,
  status text not null default 'pending' check (
    status in ('pending', 'paid', 'confirmed', 'booked', 'cancelled', 'failed')
  ),
  traveler_user_id uuid,
  traveler_email text,
  traveler_phone text,
  item_label text,
  booking_type text,
  metadata jsonb not null default '{}'::jsonb,
  last_alert_sent_at timestamptz
);

create unique index if not exists bookings_stripe_session_id_idx
  on public.bookings (stripe_session_id)
  where stripe_session_id is not null;

create index if not exists bookings_traveler_email_idx
  on public.bookings (lower(traveler_email))
  where traveler_email is not null;

create index if not exists bookings_last_alert_sent_at_idx
  on public.bookings (last_alert_sent_at desc);

create index if not exists bookings_status_idx
  on public.bookings (status);

alter table public.bookings enable row level security;

drop policy if exists "bookings_select_admins" on public.bookings;
create policy "bookings_select_admins"
  on public.bookings
  for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "bookings_select_own_user" on public.bookings;
create policy "bookings_select_own_user"
  on public.bookings
  for select
  to authenticated
  using (
    traveler_user_id = auth.uid()
    or lower(coalesce(traveler_email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
  );

drop policy if exists "bookings_no_client_mutation" on public.bookings;
create policy "bookings_no_client_mutation"
  on public.bookings
  for all
  to public
  using (false)
  with check (false);


create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider text not null,
  provider_event_id text not null,
  type text not null,
  status text not null default 'pending' check (
    status in ('pending', 'paid', 'failed', 'cancelled')
  ),
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  currency text,
  run_id text,
  offer_id text,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists payment_events_provider_event_id_idx
  on public.payment_events (provider, provider_event_id);

create index if not exists payment_events_created_at_idx
  on public.payment_events (created_at desc);

alter table public.payment_events enable row level security;

drop policy if exists "payment_events_select_admins" on public.payment_events;
create policy "payment_events_select_admins"
  on public.payment_events
  for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "payment_events_service_role_only" on public.payment_events;
create policy "payment_events_service_role_only"
  on public.payment_events
  for all
  to public
  using (false)
  with check (false);


create table if not exists public.flight_polling_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  flights_checked integer not null default 0 check (flights_checked >= 0),
  bookings_considered integer not null default 0 check (bookings_considered >= 0),
  alerts_sent integer not null default 0 check (alerts_sent >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  ok boolean not null default true,
  error text,
  summary jsonb not null default '[]'::jsonb
);

create index if not exists flight_polling_runs_ran_at_idx
  on public.flight_polling_runs (ran_at desc);

alter table public.flight_polling_runs enable row level security;

drop policy if exists "flight_polling_runs_select_admins" on public.flight_polling_runs;
create policy "flight_polling_runs_select_admins"
  on public.flight_polling_runs
  for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "flight_polling_runs_no_client_mutation" on public.flight_polling_runs;
create policy "flight_polling_runs_no_client_mutation"
  on public.flight_polling_runs
  for all
  to public
  using (false)
  with check (false);


create table if not exists public.flight_status_snapshots (
  id uuid primary key default gen_random_uuid(),
  flight_num text not null,
  flight_date date not null,
  flight_status text,
  gate text,
  terminal text,
  scheduled_departure timestamptz,
  estimated_departure timestamptz,
  delay_minutes integer check (delay_minutes is null or delay_minutes >= 0),
  updated_at timestamptz not null default now()
);

create unique index if not exists flight_status_snapshots_flight_unique_idx
  on public.flight_status_snapshots (flight_num, flight_date);

create index if not exists flight_status_snapshots_updated_at_idx
  on public.flight_status_snapshots (updated_at desc);

alter table public.flight_status_snapshots enable row level security;

drop policy if exists "flight_status_snapshots_select_admins" on public.flight_status_snapshots;
create policy "flight_status_snapshots_select_admins"
  on public.flight_status_snapshots
  for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "flight_status_snapshots_no_client_mutation" on public.flight_status_snapshots;
create policy "flight_status_snapshots_no_client_mutation"
  on public.flight_status_snapshots
  for all
  to public
  using (false)
  with check (false);


create table if not exists public.sms_inbound_log (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  from_number text,
  to_number text,
  message_sid text,
  body text,
  command text,
  matched_booking_id uuid references public.bookings(id) on delete set null,
  action_taken text,
  reply_body text,
  ok boolean,
  error text
);

create index if not exists sms_inbound_log_received_at_idx
  on public.sms_inbound_log (received_at desc);

create index if not exists sms_inbound_log_matched_booking_id_idx
  on public.sms_inbound_log (matched_booking_id);

alter table public.sms_inbound_log enable row level security;

drop policy if exists "sms_inbound_log_select_admins" on public.sms_inbound_log;
create policy "sms_inbound_log_select_admins"
  on public.sms_inbound_log
  for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "sms_inbound_log_no_client_mutation" on public.sms_inbound_log;
create policy "sms_inbound_log_no_client_mutation"
  on public.sms_inbound_log
  for all
  to public
  using (false)
  with check (false);


create table if not exists public.rescue_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  requested_at timestamptz not null default now(),
  type text not null check (type in ('rebook_search', 'hotel_hold', 'lounge_pass')),
  status text not null default 'queued' check (
    status in (
      'queued',
      'processing',
      'options_sent',
      'awaiting_payment',
      'paid',
      'confirmed',
      'payment_failed',
      'checkout_failed',
      'no_options',
      'sms_failed',
      'cancelled',
      'error'
    )
  ),
  booking_id uuid references public.bookings(id) on delete set null,
  flight_num text,
  flight_date date,
  traveler_email text,
  traveler_phone text,
  source text,
  notes text,
  result jsonb not null default '{}'::jsonb
);

create index if not exists rescue_tasks_requested_at_idx
  on public.rescue_tasks (requested_at desc);

create index if not exists rescue_tasks_status_idx
  on public.rescue_tasks (status);

create index if not exists rescue_tasks_booking_id_idx
  on public.rescue_tasks (booking_id);

alter table public.rescue_tasks enable row level security;

drop policy if exists "rescue_tasks_select_admins" on public.rescue_tasks;
create policy "rescue_tasks_select_admins"
  on public.rescue_tasks
  for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "rescue_tasks_update_admins" on public.rescue_tasks;
create policy "rescue_tasks_update_admins"
  on public.rescue_tasks
  for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "rescue_tasks_no_client_insert_delete" on public.rescue_tasks;
create policy "rescue_tasks_no_client_insert_delete"
  on public.rescue_tasks
  for all
  to public
  using (false)
  with check (false);


create table if not exists public.rescue_task_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  processed integer not null default 0 check (processed >= 0),
  errors integer not null default 0 check (errors >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  trigger text not null default 'manual'
);

create index if not exists rescue_task_runs_started_at_idx
  on public.rescue_task_runs (started_at desc);

alter table public.rescue_task_runs enable row level security;

drop policy if exists "rescue_task_runs_select_admins" on public.rescue_task_runs;
create policy "rescue_task_runs_select_admins"
  on public.rescue_task_runs
  for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "rescue_task_runs_no_client_mutation" on public.rescue_task_runs;
create policy "rescue_task_runs_no_client_mutation"
  on public.rescue_task_runs
  for all
  to public
  using (false)
  with check (false);
