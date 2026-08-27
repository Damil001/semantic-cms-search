-- Public search API key: scopes /search to one install/site so tenants cannot mix.

alter table public.webflow_installs
  add column if not exists search_token text;

update public.webflow_installs
set search_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
where search_token is null or search_token = '';

alter table public.webflow_installs
  alter column search_token set not null;

create unique index if not exists webflow_installs_search_token_idx
  on public.webflow_installs (search_token);
