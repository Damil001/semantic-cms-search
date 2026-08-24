-- Semantic nearest-neighbor over chunks, joined to parent items for rendering.
create or replace function public.match_chunks_semantic(
  query_embedding vector(1536),
  match_count integer default 40,
  filter_types text[] default null
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
  where filter_types is null
     or i.content_type = any (filter_types)
  order by c.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 40), 100));
$$;

-- Keyword / full-text search using websearch_to_tsquery (Google-like operators).
create or replace function public.match_chunks_keyword(
  query_text text,
  match_count integer default 40,
  filter_types text[] default null
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
    and (
      filter_types is null
      or i.content_type = any (filter_types)
    )
  order by ts_rank_cd(c.content_tsv, q.tsq) desc, c.chunk_index asc
  limit greatest(1, least(coalesce(match_count, 40), 100));
$$;

revoke all on function public.match_chunks_semantic(vector, integer, text[]) from public, anon, authenticated;
revoke all on function public.match_chunks_keyword(text, integer, text[]) from public, anon, authenticated;
grant execute on function public.match_chunks_semantic(vector, integer, text[]) to service_role;
grant execute on function public.match_chunks_keyword(text, integer, text[]) to service_role;
