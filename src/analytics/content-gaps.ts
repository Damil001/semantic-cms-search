export type ResultQuality = "none" | "poor" | "weak" | "good";
export type OpportunityLevel = "critical" | "high" | "medium" | "low";

export interface ContentGapPrompt {
  query: string;
  count: number;
  avgResultCount: number;
  zeroResultRate: number;
  resultQuality: ResultQuality;
  opportunity: OpportunityLevel;
  trendPercent: number | null;
}

export interface ContentGapsSummary {
  gapPromptCount: number;
  unansweredSearchCount: number;
  criticalCount: number;
  byQuality: Record<ResultQuality, number>;
  searchVolumeByQuality: Record<ResultQuality, number>;
}

const OPPORTUNITY_RANK: Record<OpportunityLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function classifyResultQuality(
  avgResultCount: number,
  zeroResultRate: number
): ResultQuality {
  if (avgResultCount === 0 || zeroResultRate >= 1) return "none";
  if (avgResultCount < 2 || zeroResultRate >= 0.5) return "poor";
  if (avgResultCount < 5 || zeroResultRate >= 0.2) return "weak";
  return "good";
}

export function classifyOpportunity(
  quality: ResultQuality,
  count: number
): OpportunityLevel {
  if (quality === "none") return count >= 3 ? "critical" : "high";
  if (quality === "poor") return count >= 5 ? "critical" : "high";
  if (quality === "weak") return count >= 10 ? "high" : "medium";
  return "low";
}

export function buildContentGaps(
  aggregates: {
    norm: string;
    query: string;
    count: number;
    sumResults: number;
    zeroResults: number;
  }[],
  previousCounts: Map<string, number>
): { gaps: ContentGapPrompt[]; summary: ContentGapsSummary } {
  const byQuality: Record<ResultQuality, number> = {
    none: 0,
    poor: 0,
    weak: 0,
    good: 0,
  };
  const searchVolumeByQuality: Record<ResultQuality, number> = {
    none: 0,
    poor: 0,
    weak: 0,
    good: 0,
  };

  const gaps: ContentGapPrompt[] = aggregates.map((agg) => {
    const avgResultCount =
      agg.count > 0
        ? Math.round((agg.sumResults / agg.count) * 10) / 10
        : 0;
    const zeroResultRate =
      agg.count > 0
        ? Math.round((agg.zeroResults / agg.count) * 1000) / 1000
        : 0;
    const resultQuality = classifyResultQuality(avgResultCount, zeroResultRate);
    const opportunity = classifyOpportunity(resultQuality, agg.count);

    byQuality[resultQuality] += 1;
    searchVolumeByQuality[resultQuality] += agg.count;

    const prev = previousCounts.get(agg.norm) ?? 0;

    return {
      query: agg.query,
      count: agg.count,
      avgResultCount,
      zeroResultRate,
      resultQuality,
      opportunity,
      trendPercent:
        prev === 0
          ? agg.count > 0
            ? 100
            : null
          : Math.round(((agg.count - prev) / prev) * 1000) / 10,
    };
  });

  gaps.sort((a, b) => {
    const opp = OPPORTUNITY_RANK[b.opportunity] - OPPORTUNITY_RANK[a.opportunity];
    if (opp !== 0) return opp;
    return b.count - a.count;
  });

  const gapPrompts = gaps.filter((g) => g.resultQuality !== "good");
  const unansweredSearchCount = gapPrompts.reduce((n, g) => n + g.count, 0);

  return {
    gaps,
    summary: {
      gapPromptCount: gapPrompts.length,
      unansweredSearchCount,
      criticalCount: gaps.filter((g) => g.opportunity === "critical").length,
      byQuality,
      searchVolumeByQuality,
    },
  };
}

export function contentGapsInsight(
  summary: ContentGapsSummary,
  days: number
): string {
  if (summary.unansweredSearchCount === 0) {
    return "Every logged prompt returned solid results this period — keep monitoring as volume grows.";
  }
  const topQuality = (["none", "poor", "weak"] as ResultQuality[]).find(
    (q) => summary.searchVolumeByQuality[q] > 0
  );
  const labels: Record<ResultQuality, string> = {
    none: "no matching content",
    poor: "weak matches",
    weak: "thin matches",
    good: "good coverage",
  };
  const critical =
    summary.criticalCount > 0
      ? `${summary.criticalCount} critical gap${summary.criticalCount === 1 ? "" : "s"}`
      : null;
  return [
    `${summary.unansweredSearchCount.toLocaleString()} searches in the last ${days} days hit ${labels[topQuality ?? "none"]}.`,
    critical,
    "Prioritize high-opportunity prompts when planning new pages.",
  ]
    .filter(Boolean)
    .join(" ");
}
