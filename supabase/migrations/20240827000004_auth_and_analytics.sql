-- Accounts (Supabase Auth) own Webflow installs; search events power the insights dashboard.

alter table public.webflow_installs
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists webflow_installs_user_id_idx
  on public.webflow_installs (user_id);

create table if not exists public.search_events (
  id uuid primary key default gen_random_uuid(),
  site_id text not null,
  query text not null,
  query_normalized text not null,
  result_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists search_events_site_created_idx
  on public.search_events (site_id, created_at desc);

create index if not exists search_events_site_normalized_idx
  on public.search_events (site_id, query_normalized);

alter table public.search_events enable row level security;
