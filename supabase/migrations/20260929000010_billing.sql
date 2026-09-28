-- Paid plans: Paddle subscriptions mirrored from signed webhooks, plus manual grants
-- (Webflow Marketplace reviewers, custom Scale deals, accounts that existed before billing).

create table if not exists public.billing_subscriptions (
  paddle_subscription_id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  paddle_customer_id text not null,
  status text not null,
  plan text check (plan in ('starter', 'growth')),
  billing_cycle text check (billing_cycle in ('month', 'year')),
  extra_collections integer not null default 0 check (extra_collections >= 0),
  current_period_end timestamptz,
  scheduled_change_action text,
  scheduled_change_at timestamptz,
  past_due_since timestamptz,
  last_event_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_user_id_idx
  on public.billing_subscriptions (user_id);

alter table public.billing_subscriptions enable row level security;

create table if not exists public.plan_grants (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('starter', 'growth', 'scale')),
  extra_collections integer not null default 0 check (extra_collections >= 0),
  note text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.plan_grants enable row level security;

-- Accounts that already had a connected site keep working for 30 days so their live
-- search doesn't stop the moment billing launches. Delete a row to end it early.
insert into public.plan_grants (user_id, plan, note, expires_at)
select distinct user_id, 'growth', 'Existing account before billing launch', now() + interval '30 days'
from public.webflow_installs
where user_id is not null
on conflict (user_id) do nothing;
