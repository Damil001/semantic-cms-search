-- Hosted Webflow App: one install per site, scoped search, collection field maps.

alter table public.content_items
  add column if not exists site_id text;

create index if not exists content_items_site_id_idx
  on public.content_items (site_id);

create table if not exists public.webflow_installs (
  id uuid primary key default gen_random_uuid(),
  site_id text not null,
  site_name text,
  short_name text,
  preview_url text,
  access_token text not null,
  session_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_indexed_at timestamptz
);

create index if not exists webflow_installs_site_id_idx
  on public.webflow_installs (site_id);

create table if not exists public.webflow_collection_maps (
  id uuid primary key default gen_random_uuid(),
  site_id text not null,
  collection_id text not null,
  collection_name text,
  content_type text not null default 'cms',
  enabled boolean not null default true,
  url_pattern text not null default '{slug}',
  fields jsonb not null default '{}'::jsonb,
  unique (site_id, collection_id)
);

alter table public.webflow_installs enable row level security;
alter table public.webflow_collection_maps enable row level security;

drop function if exists public.match_chunks_semantic(vector, integer, text[]);
drop function if exists public.match_chunks_keyword(text, integer, text[]);

create or replace function public.match_chunks_semantic(
  query_embedding vector(1536),
  match_count integer default 40,
  filter_types text[] default null,
  filter_site text default null
)
returns table (
  chunk_id uuid,
  item_id text,
  chunk_index integer,
  content text,
  similarity double precision,
  source text,
  content_type text,
  title text,
  excerpt text,
  url text,
  image_url text,
  published_at timestamptz
)
language sql
stable
as $$
  select
    c.id as chunk_id,
    c.item_id,
    c.chunk_index,
    c.content,
    (1 - (c.embedding <=> query_embedding))::double precision as similarity,
    i.source,
    i.content_type,
    i.title,
    i.excerpt,
    i.url,
    i.image_url,
    i.published_at
  from public.content_chunks c
  inner join public.content_items i on i.id = c.item_id
  where (filter_types is null or i.content_type = any (filter_types))
    and (filter_site is null or i.site_id = filter_site)
  order by c.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 40), 100));
$$;

create or replace function public.match_chunks_keyword(
  query_text text,
  match_count integer default 40,
  filter_types text[] default null,
  filter_site text default null
)
returns table (
  chunk_id uuid,
  item_id text,
  chunk_index integer,
  content text,
  rank double precision,
  source text,
  content_type text,
  title text,
  excerpt text,
  url text,
  image_url text,
  published_at timestamptz
)
language sql
stable
as $$
  with q as (
    select websearch_to_tsquery('english', coalesce(query_text, '')) as tsq
  )
  select
    c.id as chunk_id,
    c.item_id,
    c.chunk_index,
    c.content,
    ts_rank_cd(c.content_tsv, q.tsq)::double precision as rank,
    i.source,
    i.content_type,
    i.title,
    i.excerpt,
    i.url,
    i.image_url,
    i.published_at
  from public.content_chunks c
  inner join public.content_items i on i.id = c.item_id
  cross join q
  where q.tsq <> ''::tsquery
    and c.content_tsv @@ q.tsq
    and (filter_types is null or i.content_type = any (filter_types))
    and (filter_site is null or i.site_id = filter_site)
  order by ts_rank_cd(c.content_tsv, q.tsq) desc, c.chunk_index asc
  limit greatest(1, least(coalesce(match_count, 40), 100));
$$;

revoke all on function public.match_chunks_semantic(vector, integer, text[], text) from public, anon, authenticated;
revoke all on function public.match_chunks_keyword(text, integer, text[], text) from public, anon, authenticated;
grant execute on function public.match_chunks_semantic(vector, integer, text[], text) to service_role;
grant execute on function public.match_chunks_keyword(text, integer, text[], text) to service_role;
