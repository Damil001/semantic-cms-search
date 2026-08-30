-- Visitor/session ids for searches-per-visitor and searches-per-session metrics.

alter table public.search_events
  add column if not exists visitor_id text,
  add column if not exists session_id text;

create index if not exists search_events_site_visitor_idx
  on public.search_events (site_id, visitor_id)
  where visitor_id is not null;

create index if not exists search_events_site_session_idx
  on public.search_events (site_id, session_id)
  where session_id is not null;
