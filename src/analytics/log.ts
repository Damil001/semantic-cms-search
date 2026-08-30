import { getServiceClient } from "../lib/supabase.js";

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function logSearchEvent(opts: {
  siteId: string;
  query: string;
  resultCount: number;
  visitorId?: string;
  sessionId?: string;
}): Promise<void> {
  const siteId = opts.siteId.trim();
  const query = opts.query.trim();
  if (!siteId || !query) return;

  const visitorId = opts.visitorId?.trim() || null;
  const sessionId = opts.sessionId?.trim() || null;

  try {
    const supabase = getServiceClient();
    await supabase.from("search_events").insert({
      site_id: siteId,
      query,
      query_normalized: normalizeQuery(query),
      result_count: Math.max(0, opts.resultCount),
      visitor_id: visitorId,
      session_id: sessionId,
    });
  } catch (err) {
    console.error("search event log failed", err);
  }
}
