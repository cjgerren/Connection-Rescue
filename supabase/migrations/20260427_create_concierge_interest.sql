create extension if not exists pgcrypto;

create table if not exists public.concierge_interest (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  vote text not null check (vote in ('yes', 'no')),
  email text,
  notes text,
  page text not null default 'pricing',
  source text not null default 'web',
  user_agent text,
  origin text,
  referer text
);

create index if not exists concierge_interest_created_at_idx
  on public.concierge_interest (created_at desc);

create index if not exists concierge_interest_vote_idx
  on public.concierge_interest (vote);

alter table public.concierge_interest enable row level security;

drop policy if exists "service_role_only_concierge_interest" on public.concierge_interest;
create policy "service_role_only_concierge_interest"
  on public.concierge_interest
  for all
  to public
  using (false)
  with check (false);
