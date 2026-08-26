import { getServiceClient } from "../lib/supabase.js";

export const MAX_QUERY_EVENTS = 15000;
const PAGE_SIZE = 1000;

export interface AggregatedQuery {
  query: string;
  count: number;
  zeroResults: number;
  avgResultCount: number;
  lastAt: string;
}

export interface QueryDataset {
  eventsFetched: number;
  uniqueQueries: number;
  totalZeroResultEvents: number;
  oldestAt: string | null;
  newestAt: string | null;
  queries: AggregatedQuery[];
}

interface SearchEventRow {
  query: string;
  query_normalized: string;
  result_count: number;
  created_at: string;
}

export async function fetchQueryDataset(siteId: string): Promise<QueryDataset> {
  const supabase = getServiceClient();
  const rows: SearchEventRow[] = [];
  let offset = 0;

  while (rows.length < MAX_QUERY_EVENTS) {
    const limit = Math.min(PAGE_SIZE, MAX_QUERY_EVENTS - rows.length);
    const { data, error } = await supabase
      .from("search_events")
      .select("query, query_normalized, result_count, created_at")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as SearchEventRow[];
    if (batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < limit) break;
    offset += batch.length;
  }

  const byNorm = new Map<
    string,
    {
      query: string;
      count: number;
      zeroResults: number;
      sumResults: number;
      lastAt: string;
    }
  >();

  let totalZeroResultEvents = 0;
  let oldestAt: string | null = null;
  let newestAt: string | null = null;

  for (const row of rows) {
    const rc = row.result_count;
    if (rc === 0) totalZeroResultEvents += 1;

    const createdAt = row.created_at;
    if (!newestAt || createdAt > newestAt) newestAt = createdAt;
    if (!oldestAt || createdAt < oldestAt) oldestAt = createdAt;

    const norm = row.query_normalized;
    const existing = byNorm.get(norm);
    if (!existing) {
      byNorm.set(norm, {
        query: row.query,
        count: 1,
        zeroResults: rc === 0 ? 1 : 0,
        sumResults: rc,
        lastAt: createdAt,
      });
    } else {
      existing.count += 1;
      if (rc === 0) existing.zeroResults += 1;
      existing.sumResults += rc;
      if (createdAt > existing.lastAt) {
        existing.lastAt = createdAt;
        existing.query = row.query;
      }
    }
  }

  const queries = [...byNorm.values()]
    .map((r) => ({
      query: r.query,
      count: r.count,
      zeroResults: r.zeroResults,
      avgResultCount: Math.round((r.sumResults / r.count) * 10) / 10,
      lastAt: r.lastAt,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    eventsFetched: rows.length,
    uniqueQueries: queries.length,
    totalZeroResultEvents,
    oldestAt,
    newestAt,
    queries,
  };
}

/** Trim dataset for LLM — top volume + zero-result gaps. */
export function buildAnalysisPayload(dataset: QueryDataset, maxLines = 350): string {
  const top = dataset.queries.slice(0, 250);
  const zeroGap = dataset.queries
    .filter((q) => q.zeroResults > 0)
    .sort((a, b) => b.zeroResults - a.zeroResults)
    .slice(0, 100);

  const seen = new Set<string>();
  const lines: string[] = [];

  function add(q: AggregatedQuery) {
    const key = q.query.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(
      `- "${q.query}" | searches:${q.count} | zero_results:${q.zeroResults} | avg_hits:${q.avgResultCount}`
    );
  }

  top.forEach(add);
  zeroGap.forEach(add);

  const header = [
    `Total search events: ${dataset.eventsFetched}`,
    `Unique queries: ${dataset.uniqueQueries}`,
    `Zero-result events: ${dataset.totalZeroResultEvents}`,
    `Date range: ${dataset.oldestAt ?? "n/a"} to ${dataset.newestAt ?? "n/a"}`,
    "",
    "Query aggregates (deduplicated):",
  ];

  return [...header, ...lines.slice(0, maxLines)].join("\n");
}
