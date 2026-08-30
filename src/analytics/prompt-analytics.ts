import { getServiceClient } from "../lib/supabase.js";

const MAX_EVENTS = 50000;
const PAGE_SIZE = 1000;

interface SearchEventRow {
  query: string;
  query_normalized: string;
  result_count: number;
  created_at: string;
  visitor_id: string | null;
  session_id: string | null;
}

export interface MetricWithChange {
  value: number;
  display: string;
  changePercent: number | null;
  direction: "up" | "down" | "flat";
}

export interface PopularPrompt {
  query: string;
  count: number;
  percentOfTotal: number;
  trendPercent: number | null;
}

export interface TrendingPrompt {
  query: string;
  currentCount: number;
  previousCount: number;
  growthPercent: number;
}

export interface PromptAnalytics {
  days: number;
  periodStart: string;
  periodEnd: string;
  totalPrompts: MetricWithChange;
  uniquePrompts: MetricWithChange;
  searchesPerVisitor: MetricWithChange;
  searchesPerSession: MetricWithChange;
  newVsReturning: {
    newCount: number;
    returningCount: number;
    newPercent: number;
    returningPercent: number;
  };
  volumeOverTime: { date: string; count: number }[];
  volumeInsight: string;
  popularPrompts: PopularPrompt[];
  trendingPrompts: TrendingPrompt[];
  /** Legacy fields for older UI paths */
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

function periodBounds(days: number): {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
} {
  const currentEnd = new Date();
  const currentStart = new Date(currentEnd);
  currentStart.setUTCDate(currentStart.getUTCDate() - days);
  const previousEnd = new Date(currentStart);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);
  return { currentStart, currentEnd, previousStart, previousEnd };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function metric(
  value: number,
  previous: number,
  format: (n: number) => string = (n) => String(n)
): MetricWithChange {
  const change = pctChange(value, previous);
  let direction: MetricWithChange["direction"] = "flat";
  if (change != null) {
    if (change > 0.5) direction = "up";
    else if (change < -0.5) direction = "down";
  }
  return {
    value,
    display: format(value),
    changePercent: change,
    direction,
  };
}

function formatDecimal(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}

async function fetchEvents(
  siteId: string,
  since: Date,
  until?: Date
): Promise<SearchEventRow[]> {
  const supabase = getServiceClient();
  const rows: SearchEventRow[] = [];
  let offset = 0;

  while (rows.length < MAX_EVENTS) {
    const limit = Math.min(PAGE_SIZE, MAX_EVENTS - rows.length);
    let q = supabase
      .from("search_events")
      .select(
        "query, query_normalized, result_count, created_at, visitor_id, session_id"
      )
      .eq("site_id", siteId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    if (until) {
      q = q.lt("created_at", until.toISOString());
    }

    const { data, error } = await q.range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as SearchEventRow[];
    if (batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < limit) break;
    offset += batch.length;
  }

  return rows;
}

async function fetchHistoricalNorms(
  siteId: string,
  before: Date
): Promise<Set<string>> {
  const supabase = getServiceClient();
  const norms = new Set<string>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("search_events")
      .select("query_normalized")
      .eq("site_id", siteId)
      .lt("created_at", before.toISOString())
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = data ?? [];
    if (batch.length === 0) break;
    for (const row of batch) {
      const norm = String(row.query_normalized ?? "").trim();
      if (norm) norms.add(norm);
    }
    if (batch.length < PAGE_SIZE) break;
    offset += batch.length;
  }

  return norms;
}

function aggregateByNorm(rows: SearchEventRow[]): Map<
  string,
  { query: string; count: number; sumResults: number; lastAt: string }
> {
  const byNorm = new Map<
    string,
    { query: string; count: number; sumResults: number; lastAt: string }
  >();
  for (const row of rows) {
    const norm = row.query_normalized;
    const existing = byNorm.get(norm);
    if (!existing) {
      byNorm.set(norm, {
        query: row.query,
        count: 1,
        sumResults: row.result_count,
        lastAt: row.created_at,
      });
    } else {
      existing.count += 1;
      existing.sumResults += row.result_count;
      if (row.created_at > existing.lastAt) {
        existing.lastAt = row.created_at;
        existing.query = row.query;
      }
    }
  }
  return byNorm;
}

function volumeByDay(
  rows: SearchEventRow[],
  start: Date,
  end: Date
): { date: string; count: number }[] {
  const buckets = new Map<string, number>();
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setUTCHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    buckets.set(isoDate(cursor), 0);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    if (buckets.has(day)) {
      buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

function classifyNewReturning(
  rows: SearchEventRow[],
  historicalNorms: Set<string>
): { newCount: number; returningCount: number } {
  const seenInPeriod = new Set<string>();
  let newCount = 0;
  let returningCount = 0;

  for (const row of rows) {
    const norm = row.query_normalized;
    if (historicalNorms.has(norm) || seenInPeriod.has(norm)) {
      returningCount += 1;
    } else {
      newCount += 1;
    }
    seenInPeriod.add(norm);
  }

  return { newCount, returningCount };
}

function uniqueCount(rows: SearchEventRow[], field: "visitor_id" | "session_id"): number {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = row[field];
    if (id) ids.add(id);
  }
  return ids.size;
}

function ratioMetric(
  total: number,
  unique: number,
  previousTotal: number,
  previousUnique: number
): MetricWithChange {
  if (unique === 0) {
    return {
      value: 0,
      display: "—",
      changePercent: null,
      direction: "flat",
    };
  }
  const value = total / unique;
  const previousValue = previousUnique > 0 ? previousTotal / previousUnique : 0;
  return metric(value, previousValue, formatDecimal);
}

export async function getPromptAnalytics(
  siteId: string,
  days = 30
): Promise<PromptAnalytics> {
  const { currentStart, currentEnd, previousStart, previousEnd } =
    periodBounds(days);

  const [currentRows, previousRows, historicalNorms] = await Promise.all([
    fetchEvents(siteId, currentStart),
    fetchEvents(siteId, previousStart, previousEnd),
    fetchHistoricalNorms(siteId, currentStart),
  ]);

  const currentTotal = currentRows.length;
  const previousTotal = previousRows.length;

  const currentNorms = aggregateByNorm(currentRows);
  const previousNorms = aggregateByNorm(previousRows);

  const currentUnique = currentNorms.size;
  const previousUnique = previousNorms.size;

  const currentVisitors = uniqueCount(currentRows, "visitor_id");
  const previousVisitors = uniqueCount(previousRows, "visitor_id");
  const currentSessions = uniqueCount(currentRows, "session_id");
  const previousSessions = uniqueCount(previousRows, "session_id");

  const { newCount, returningCount } = classifyNewReturning(
    currentRows,
    historicalNorms
  );
  const classified = newCount + returningCount || 1;

  const volumeOverTime = volumeByDay(currentRows, currentStart, currentEnd);
  const totalVolumeChange = pctChange(currentTotal, previousTotal);
  const volumeInsight =
    totalVolumeChange != null && currentTotal > 0
      ? `Prompt volume ${totalVolumeChange >= 0 ? "increased" : "decreased"} ${Math.abs(totalVolumeChange)}% vs. the previous ${days}-day period.`
      : currentTotal > 0
        ? "Prompt volume is steady compared to the previous period."
        : "No prompts logged yet for this period.";

  const previousNormCounts = new Map<string, number>();
  for (const [norm, agg] of previousNorms) {
    previousNormCounts.set(norm, agg.count);
  }

  const popularPrompts: PopularPrompt[] = [...currentNorms.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([norm, agg]) => ({
      query: agg.query,
      count: agg.count,
      percentOfTotal:
        currentTotal > 0
          ? Math.round((agg.count / currentTotal) * 1000) / 10
          : 0,
      trendPercent: pctChange(agg.count, previousNormCounts.get(norm) ?? 0),
    }));

  const trendingPrompts: TrendingPrompt[] = [...currentNorms.entries()]
    .map(([norm, agg]) => {
      const prev = previousNormCounts.get(norm) ?? 0;
      const growth =
        prev === 0
          ? agg.count > 0
            ? 100
            : 0
          : Math.round(((agg.count - prev) / prev) * 1000) / 10;
      return {
        query: agg.query,
        currentCount: agg.count,
        previousCount: prev,
        growthPercent: growth,
      };
    })
    .filter((t) => t.currentCount >= 2 && t.growthPercent > 0)
    .sort((a, b) => b.growthPercent - a.growthPercent)
    .slice(0, 10);

  let zeroResults = 0;
  let moreThanFive = 0;
  for (const row of currentRows) {
    if (row.result_count === 0) zeroResults += 1;
    if (row.result_count > 5) moreThanFive += 1;
  }

  const topQueries = [...currentNorms.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 25)
    .map((r) => ({
      query: r.query,
      count: r.count,
      avgResultCount: Math.round((r.sumResults / r.count) * 10) / 10,
      lastAt: r.lastAt,
    }));

  const recentQueries = [...currentRows]
    .reverse()
    .slice(0, 50)
    .map((row) => ({
      query: row.query,
      resultCount: row.result_count,
      createdAt: row.created_at,
    }));


  return {
    days,
    periodStart: currentStart.toISOString(),
    periodEnd: currentEnd.toISOString(),
    totalPrompts: metric(currentTotal, previousTotal, (n) =>
      n.toLocaleString()
    ),
    uniquePrompts: metric(currentUnique, previousUnique, (n) =>
      n.toLocaleString()
    ),
    searchesPerVisitor: ratioMetric(
      currentTotal,
      currentVisitors,
      previousTotal,
      previousVisitors
    ),
    searchesPerSession: ratioMetric(
      currentTotal,
      currentSessions,
      previousTotal,
      previousSessions
    ),
    newVsReturning: {
      newCount,
      returningCount,
      newPercent: Math.round((newCount / classified) * 1000) / 10,
      returningPercent: Math.round((returningCount / classified) * 1000) / 10,
    },
    volumeOverTime,
    volumeInsight,
    popularPrompts,
    trendingPrompts,
    total: currentTotal,
    zeroResults,
    moreThanFive,
    topQueries,
    recentQueries,
  };
}
