alter table public.admin_users
  add column if not exists is_hidden boolean not null default false;

create index if not exists admin_users_visible_role_idx
  on public.admin_users (role, is_hidden);
