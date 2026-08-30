-- Cache Webflow CMS field schemas locally; refresh from Webflow only on demand.

alter table public.webflow_collection_maps
  add column if not exists cms_fields jsonb not null default '[]'::jsonb,
  add column if not exists cms_fields_synced_at timestamptz;
