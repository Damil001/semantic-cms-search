-- Unified item model: one row per CMS record, regardless of type or source.
-- New connectors (Sanity, Contentful, …) insert here with their own `source`
-- and namespaced `id` (e.g. sanity:{dataset}:{docId}).

create table if not exists public.content_items (
  id text primary key,
  source text not null,
  content_type text not null,
  title text not null,
  excerpt text,
  url text not null,
  image_url text,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists content_items_source_type_idx
  on public.content_items (source, content_type);

create table if not exists public.content_chunks (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.content_items (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536) not null,
  content_tsv tsvector generated always as (
    to_tsvector('english', coalesce(content, ''))
  ) stored,
  unique (item_id, chunk_index)
);

-- Approximate cosine NN (HNSW). Query with embedding <=> query_vector.
create index if not exists content_chunks_embedding_hnsw_idx
  on public.content_chunks
  using hnsw (embedding vector_cosine_ops);

create index if not exists content_chunks_content_tsv_gin_idx
  on public.content_chunks
  using gin (content_tsv);

-- Browser clients must not read tables directly; only the serverless /search
-- route (service role) talks to Postgres.
alter table public.content_items enable row level security;
alter table public.content_chunks enable row level security;
