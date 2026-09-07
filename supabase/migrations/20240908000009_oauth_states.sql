-- Single-use OAuth state for Webflow authorize CSRF binding (Marketplace preflight).

create table if not exists public.oauth_states (
  state text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists oauth_states_user_id_idx
  on public.oauth_states (user_id);

alter table public.oauth_states enable row level security;
