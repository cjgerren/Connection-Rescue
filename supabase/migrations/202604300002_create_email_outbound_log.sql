create extension if not exists pgcrypto;

create table if not exists public.email_outbound_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider text not null default 'resend',
  provider_message_id text,
  to_email text not null,
  subject text not null,
  ok boolean not null default false,
  error text,
  kind text not null default 'rescue_options',
  idempotency_key text,
  task_id uuid references public.rescue_tasks(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists email_outbound_log_created_at_idx
  on public.email_outbound_log (created_at desc);

create index if not exists email_outbound_log_task_id_idx
  on public.email_outbound_log (task_id, created_at desc);

create index if not exists email_outbound_log_booking_id_idx
  on public.email_outbound_log (booking_id, created_at desc);

create index if not exists email_outbound_log_idempotency_key_idx
  on public.email_outbound_log (idempotency_key)
  where idempotency_key is not null;

alter table public.email_outbound_log enable row level security;

drop policy if exists "email_outbound_log_select_admins" on public.email_outbound_log;
create policy "email_outbound_log_select_admins"
  on public.email_outbound_log
  for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "email_outbound_log_no_client_mutation" on public.email_outbound_log;
create policy "email_outbound_log_no_client_mutation"
  on public.email_outbound_log
  for all
  to public
  using (false)
  with check (false);

