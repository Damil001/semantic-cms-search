import { getServiceClient } from "../lib/supabase.js";

export interface SearchAnalytics {
  days: number;
  total: number;
  zeroResults: number;
  moreThanFive: number;
  topQueries: {
    query: string;
    count: number;
    avgResultCount: number;
    lastAt: string;
  }[];
  recentQueries: {
    query: string;
    resultCount: number;
    createdAt: string;
  }[];
}

export async function getSearchAnalytics(
  siteId: string,
  days = 30
): Promise<SearchAnalytics> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("search_events")
    .select("query, query_normalized, result_count, created_at")
    .eq("site_id", siteId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  let zeroResults = 0;
  let moreThanFive = 0;
  const byNorm = new Map<
    string,
    { query: string; count: number; sumResults: number; lastAt: string }
  >();

  for (const row of rows) {
    const rc = row.result_count as number;
    if (rc === 0) zeroResults += 1;
    if (rc > 5) moreThanFive += 1;

    const norm = row.query_normalized as string;
    const existing = byNorm.get(norm);
    const createdAt = row.created_at as string;
    if (!existing) {
      byNorm.set(norm, {
        query: row.query as string,
        count: 1,
        sumResults: rc,
        lastAt: createdAt,
      });
    } else {
      existing.count += 1;
      existing.sumResults += rc;
      if (createdAt > existing.lastAt) {
        existing.lastAt = createdAt;
        existing.query = row.query as string;
      }
    }
  }

  const topQueries = [...byNorm.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 25)
    .map((r) => ({
      query: r.query,
      count: r.count,
      avgResultCount: Math.round((r.sumResults / r.count) * 10) / 10,
      lastAt: r.lastAt,
    }));

  const recentQueries = rows.slice(0, 50).map((row) => ({
    query: row.query as string,
    resultCount: row.result_count as number,
    createdAt: row.created_at as string,
  }));

  return {
    days,
    total: rows.length,
    zeroResults,
    moreThanFive,
    topQueries,
    recentQueries,
  };
}
