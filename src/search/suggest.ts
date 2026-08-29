import { getServiceClient } from "../lib/supabase.js";
import { normalizeQuery } from "../analytics/log.js";

export interface QuerySuggestion {
  text: string;
  count: number;
}

export interface SuggestItem {
  id: string;
  type: string;
  title: string;
  url: string;
}

export interface SuggestResult {
  query: string;
  suggestions: QuerySuggestion[];
  items: SuggestItem[];
}

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 10;
const LOOKBACK_DAYS = 90;
const EVENT_SCAN_LIMIT = 500;

function clampLimit(raw?: number): number {
  if (raw == null || !Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.floor(raw), 1), MAX_LIMIT);
}

/** Escape % and _ for Postgres ILIKE. */
function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function startsWithScore(haystack: string, needle: string): number {
  if (haystack.startsWith(needle)) return 0;
  if (haystack.includes(` ${needle}`)) return 1;
  return 2;
}

export async function runSuggest(opts: {
  q: string;
  siteId: string;
  limit?: number;
}): Promise<SuggestResult> {
  const query = opts.q.trim();
  const siteId = opts.siteId.trim();
  const limit = clampLimit(opts.limit);

  if (!query || !siteId || query.length < 2) {
    return { query, suggestions: [], items: [] };
  }

  const normalized = normalizeQuery(query);
  const pattern = `%${escapeIlike(normalized)}%`;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - LOOKBACK_DAYS);

  const supabase = getServiceClient();

  const [eventsRes, itemsRes] = await Promise.all([
    supabase
      .from("search_events")
      .select("query, query_normalized, result_count")
      .eq("site_id", siteId)
      .gt("result_count", 0)
      .gte("created_at", since.toISOString())
      .ilike("query_normalized", pattern)
      .limit(EVENT_SCAN_LIMIT),
    supabase
      .from("content_items")
      .select("id, content_type, title, url")
      .eq("site_id", siteId)
      .ilike("title", pattern)
      .order("title", { ascending: true })
      .limit(Math.min(limit * 3, 30)),
  ]);

  if (eventsRes.error) {
    throw new Error(`suggest events: ${eventsRes.error.message}`);
  }
  if (itemsRes.error) {
    throw new Error(`suggest items: ${itemsRes.error.message}`);
  }

  const byNorm = new Map<string, { text: string; count: number }>();
  for (const row of eventsRes.data ?? []) {
    const norm = String(row.query_normalized ?? "").trim();
    if (!norm) continue;
    const text = String(row.query ?? norm).trim() || norm;
    const existing = byNorm.get(norm);
    if (existing) {
      existing.count += 1;
      // Prefer the longer/original casing from a recent-ish event
      if (text.length > existing.text.length) existing.text = text;
    } else {
      byNorm.set(norm, { text, count: 1 });
    }
  }

  const suggestions = [...byNorm.values()]
    .map((s) => ({
      text: s.text,
      count: s.count,
      rank: startsWithScore(normalizeQuery(s.text), normalized),
    }))
    .sort((a, b) => a.rank - b.rank || b.count - a.count || a.text.localeCompare(b.text))
    .slice(0, limit)
    .map(({ text, count }) => ({ text, count }));

  const items = (itemsRes.data ?? [])
    .map((row) => ({
      id: String(row.id),
      type: String(row.content_type ?? ""),
      title: String(row.title ?? ""),
      url: String(row.url ?? ""),
      rank: startsWithScore(normalizeQuery(String(row.title ?? "")), normalized),
    }))
    .filter((row) => row.id && row.title && row.url)
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map(({ id, type, title, url }) => ({ id, type, title, url }));

  return { query, suggestions, items };
}
