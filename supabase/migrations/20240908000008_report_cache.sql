-- Persist last Content Intelligence + AEO reports per install (survive tab switches & reloads).

alter table public.webflow_installs
  add column if not exists content_insights_report jsonb,
  add column if not exists content_insights_at timestamptz,
  add column if not exists aeo_report jsonb,
  add column if not exists aeo_report_at timestamptz;
