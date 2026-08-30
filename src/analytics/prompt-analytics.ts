import {
  buildContentGaps,
  contentGapsInsight,
  type ContentGapPrompt,
  type ContentGapsSummary,
} from "./content-gaps.js";
import { supabaseRestGet } from "../lib/supabase-rest.js";

const MAX_EVENTS = 3000;
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
  statSparklines: {
    totalPrompts: { date: string; count: number }[];
    uniquePrompts: { date: string; count: number }[];
    searchesPerVisitor: { date: string; count: number }[];
    searchesPerSession: { date: string; count: number }[];
  };
  volumeInsight: string;
  popularPrompts: PopularPrompt[];
  trendingPrompts: TrendingPrompt[];
  contentGaps: ContentGapPrompt[];
  contentGapsSummary: ContentGapsSummary;
  contentGapsInsight: string;
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
  const rows: SearchEventRow[] = [];
  let offset = 0;
  let visitorColumns = true;

  while (rows.length < MAX_EVENTS) {
    const limit = Math.min(PAGE_SIZE, MAX_EVENTS - rows.length);
    const select = visitorColumns
      ? "query,query_normalized,result_count,created_at,visitor_id,session_id"
      : "query,query_normalized,result_count,created_at";

    let path =
      `search_events?site_id=eq.${encodeURIComponent(siteId)}` +
      `&created_at=gte.${encodeURIComponent(since.toISOString())}`;
    if (until) {
      path += `&created_at=lt.${encodeURIComponent(until.toISOString())}`;
    }
    path +=
      `&order=created_at.asc&select=${select}` +
      `&offset=${offset}&limit=${limit}`;

    try {
      const batch = await supabaseRestGet<SearchEventRow[]>(path, {
        timeoutMs: 8000,
      });
      if (batch.length === 0) break;
      rows.push(...batch);
      if (batch.length < limit) break;
      offset += batch.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (visitorColumns && /visitor_id|session_id/i.test(message)) {
        visitorColumns = false;
        offset = 0;
        rows.length = 0;
        continue;
      }
      throw err;
    }
  }

  return rows;
}

async function fetchHistoricalNorms(
  siteId: string,
  before: Date
): Promise<Set<string>> {
  const norms = new Set<string>();

  const data = await supabaseRestGet<{ query_normalized: string }[]>(
    `search_events?site_id=eq.${encodeURIComponent(siteId)}` +
      `&created_at=lt.${encodeURIComponent(before.toISOString())}` +
      `&order=created_at.desc&select=query_normalized&limit=1000`,
    { timeoutMs: 8000 }
  );

  for (const row of data) {
    const norm = String(row.query_normalized ?? "").trim();
    if (norm) norms.add(norm);
  }

  return norms;
}

function aggregateByNorm(rows: SearchEventRow[]): Map<
  string,
  {
    query: string;
    count: number;
    sumResults: number;
    zeroResults: number;
    lastAt: string;
  }
> {
  const byNorm = new Map<
    string,
    {
      query: string;
      count: number;
      sumResults: number;
      zeroResults: number;
      lastAt: string;
    }
  >();
  for (const row of rows) {
    const norm = row.query_normalized;
    const existing = byNorm.get(norm);
    if (!existing) {
      byNorm.set(norm, {
        query: row.query,
        count: 1,
        sumResults: row.result_count,
        zeroResults: row.result_count === 0 ? 1 : 0,
        lastAt: row.created_at,
      });
    } else {
      existing.count += 1;
      existing.sumResults += row.result_count;
      if (row.result_count === 0) existing.zeroResults += 1;
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

function uniqueCountByDay(
  rows: SearchEventRow[],
  start: Date,
  end: Date,
  field: "query_normalized" | "visitor_id" | "session_id"
): { date: string; count: number }[] {
  const buckets = new Map<string, Set<string>>();
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setUTCHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    buckets.set(isoDate(cursor), new Set());
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    const bucket = buckets.get(day);
    if (!bucket) continue;
    const value = String(row[field] ?? "").trim();
    if (value) bucket.add(value);
  }

  return [...buckets.entries()].map(([date, ids]) => ({
    date,
    count: ids.size,
  }));
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

function attributedStats(
  rows: SearchEventRow[],
  field: "visitor_id" | "session_id"
): { searches: number; unique: number } {
  const ids = new Set<string>();
  let searches = 0;
  for (const row of rows) {
    const id = row[field]?.trim();
    if (!id) continue;
    searches += 1;
    ids.add(id);
  }
  return { searches, unique: ids.size };
}

function ratioByDay(
  rows: SearchEventRow[],
  start: Date,
  end: Date,
  field: "visitor_id" | "session_id"
): { date: string; count: number }[] {
  const buckets = new Map<string, { searches: number; ids: Set<string> }>();
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setUTCHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    buckets.set(isoDate(cursor), { searches: 0, ids: new Set() });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    const bucket = buckets.get(day);
    if (!bucket) continue;
    const id = row[field]?.trim();
    if (!id) continue;
    bucket.searches += 1;
    bucket.ids.add(id);
  }

  return [...buckets.entries()].map(([date, { searches, ids }]) => ({
    date,
    count:
      ids.size > 0
        ? Math.round((searches / ids.size) * 10) / 10
        : 0,
  }));
}

function ratioMetric(
  searches: number,
  unique: number,
  previousSearches: number,
  previousUnique: number
): MetricWithChange {
  if (unique === 0 || searches === 0) {
    return {
      value: 0,
      display: "—",
      changePercent: null,
      direction: "flat",
    };
  }
  const value = searches / unique;
  const previousValue =
    previousUnique > 0 && previousSearches > 0
      ? previousSearches / previousUnique
      : 0;
  return metric(value, previousValue, formatDecimal);
}

export function emptyPromptAnalytics(days = 30): PromptAnalytics {
  const { currentStart, currentEnd } = periodBounds(days);
  const emptyMetric: MetricWithChange = {
    value: 0,
    display: "0",
    changePercent: null,
    direction: "flat",
  };
  const emptyDays: { date: string; count: number }[] = volumeByDay(
    [],
    currentStart,
    currentEnd
  );

  return {
    days,
    periodStart: currentStart.toISOString(),
    periodEnd: currentEnd.toISOString(),
    totalPrompts: emptyMetric,
    uniquePrompts: emptyMetric,
    searchesPerVisitor: { value: 0, display: "—", changePercent: null, direction: "flat" },
    searchesPerSession: { value: 0, display: "—", changePercent: null, direction: "flat" },
    newVsReturning: {
      newCount: 0,
      returningCount: 0,
      newPercent: 0,
      returningPercent: 0,
    },
    volumeOverTime: emptyDays,
    statSparklines: {
      totalPrompts: emptyDays,
      uniquePrompts: emptyDays,
      searchesPerVisitor: emptyDays,
      searchesPerSession: emptyDays,
    },
    volumeInsight: "No prompts logged yet for this period.",
    popularPrompts: [],
    trendingPrompts: [],
    contentGaps: [],
    contentGapsSummary: {
      gapPromptCount: 0,
      unansweredSearchCount: 0,
      criticalCount: 0,
      byQuality: { none: 0, poor: 0, weak: 0, good: 0 },
      searchVolumeByQuality: { none: 0, poor: 0, weak: 0, good: 0 },
    },
    contentGapsInsight: "No search data yet — embed the widget to start collecting prompts.",
    total: 0,
    zeroResults: 0,
    moreThanFive: 0,
    topQueries: [],
    recentQueries: [],
  };
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

  const currentVisitorStats = attributedStats(currentRows, "visitor_id");
  const previousVisitorStats = attributedStats(previousRows, "visitor_id");
  const currentSessionStats = attributedStats(currentRows, "session_id");
  const previousSessionStats = attributedStats(previousRows, "session_id");

  const { newCount, returningCount } = classifyNewReturning(
    currentRows,
    historicalNorms
  );
  const classified = newCount + returningCount || 1;

  const volumeOverTime = volumeByDay(currentRows, currentStart, currentEnd);
  const statSparklines = {
    totalPrompts: volumeOverTime,
    uniquePrompts: uniqueCountByDay(
      currentRows,
      currentStart,
      currentEnd,
      "query_normalized"
    ),
    searchesPerVisitor: ratioByDay(
      currentRows,
      currentStart,
      currentEnd,
      "visitor_id"
    ),
    searchesPerSession: ratioByDay(
      currentRows,
      currentStart,
      currentEnd,
      "session_id"
    ),
  };
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

  const { gaps: contentGaps, summary: contentGapsSummary } = buildContentGaps(
    [...currentNorms.entries()].map(([norm, agg]) => ({ norm, ...agg })),
    previousNormCounts
  );

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
      currentVisitorStats.searches,
      currentVisitorStats.unique,
      previousVisitorStats.searches,
      previousVisitorStats.unique
    ),
    searchesPerSession: ratioMetric(
      currentSessionStats.searches,
      currentSessionStats.unique,
      previousSessionStats.searches,
      previousSessionStats.unique
    ),
    newVsReturning: {
      newCount,
      returningCount,
      newPercent: Math.round((newCount / classified) * 1000) / 10,
      returningPercent: Math.round((returningCount / classified) * 1000) / 10,
    },
    volumeOverTime,
    statSparklines,
    volumeInsight,
    popularPrompts,
    trendingPrompts,
    contentGaps,
    contentGapsSummary,
    contentGapsInsight: contentGapsInsight(contentGapsSummary, days),
    total: currentTotal,
    zeroResults,
    moreThanFive,
    topQueries,
    recentQueries,
  };
}
