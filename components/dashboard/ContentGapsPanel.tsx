"use client";

import { useMemo, useState } from "react";
import type { ContentGapPrompt, PromptAnalytics } from "@/lib/types";

const QUALITY_LABELS: Record<string, string> = {
  none: "None",
  poor: "Poor",
  weak: "Weak",
  good: "Good",
};

const OPP_LABELS: Record<string, { label: string; icon: string; cls: string }> =
  {
    critical: { label: "Critical", icon: "🔥🔥", cls: "opportunity-badge--critical" },
    high: { label: "High", icon: "🔥", cls: "opportunity-badge--high" },
    medium: { label: "Medium", icon: "↑", cls: "opportunity-badge--medium" },
    low: { label: "Low", icon: "—", cls: "opportunity-badge--low" },
  };

function filterGaps(
  gaps: ContentGapPrompt[],
  quality: string,
  opportunity: string
): ContentGapPrompt[] {
  return gaps.filter((g) => {
    if (quality === "gaps" && g.resultQuality === "good") return false;
    if (quality !== "gaps" && quality !== "all" && g.resultQuality !== quality)
      return false;
    if (opportunity === "critical" && g.opportunity !== "critical") return false;
    if (
      opportunity === "high" &&
      g.opportunity !== "critical" &&
      g.opportunity !== "high"
    )
      return false;
    return true;
  });
}

export function ContentGapsPanel({ data }: { data: PromptAnalytics }) {
  const [qualityFilter, setQualityFilter] = useState("gaps");
  const [oppFilter, setOppFilter] = useState("all");

  const filtered = useMemo(
    () => filterGaps(data.contentGaps ?? [], qualityFilter, oppFilter),
    [data.contentGaps, qualityFilter, oppFilter]
  );

  const summary = data.contentGapsSummary;
  const totalVol = summary
    ? Object.values(summary.searchVolumeByQuality ?? {}).reduce((a, b) => a + b, 0)
    : 0;

  const segments = [
    { key: "none", cls: "none" },
    { key: "poor", cls: "poor" },
    { key: "weak", cls: "weak" },
    { key: "good", cls: "good" },
  ] as const;

  return (
    <div className="insights-panel insights-panel--gaps mb-lg" id="contentGapsPanel">
      <div className="insights-panel__head insights-panel__head--split">
        <div>
          <h3 className="title-sm">Questions your website can&apos;t answer</h3>
          <p className="caption text-muted">
            Prompts where search returns none, weak, or poor matches — your content to-do list
          </p>
        </div>
        {summary && totalVol > 0 && (
          <div className="gap-summary-pills">
            <span className="gap-summary-pill gap-summary-pill--alert">
              <strong>{summary.unansweredSearchCount.toLocaleString()}</strong> gap searches
            </span>
            <span className="gap-summary-pill">
              <strong>{summary.gapPromptCount}</strong> prompts
            </span>
            {summary.criticalCount > 0 && (
              <span className="gap-summary-pill gap-summary-pill--critical">
                <strong>{summary.criticalCount}</strong> critical
              </span>
            )}
          </div>
        )}
      </div>

      {summary && totalVol > 0 && (
        <>
          <div className="gap-volume-bar mb-md">
            {segments.map(({ key, cls }) => {
              const vol = summary.searchVolumeByQuality[key] ?? 0;
              const pct = totalVol > 0 ? (vol / totalVol) * 100 : 0;
              return pct > 0 ? (
                <div
                  key={key}
                  className={`gap-volume-segment gap-volume-segment--${cls}`}
                  style={{ width: `${pct}%` }}
                  title={`${vol} searches`}
                />
              ) : null;
            })}
          </div>
          <div className="gap-volume-legend mb-md">
            {segments.map(({ key, cls }) => {
              const vol = summary.searchVolumeByQuality[key] ?? 0;
              return vol > 0 ? (
                <span key={key} className="gap-volume-legend__item">
                  <i className={`gap-volume-legend__dot gap-volume-legend__dot--${cls}`} />
                  {QUALITY_LABELS[key]} ({vol.toLocaleString()})
                </span>
              ) : null;
            })}
          </div>
        </>
      )}

      <div className="gap-filters mb-md">
        <div className="gap-filter-group">
          <span className="gap-filter-label">Result quality</span>
          <div className="timeframe-rail gap-filter-rail">
            {[
              ["gaps", "All gaps"],
              ["none", "None"],
              ["poor", "Poor"],
              ["weak", "Weak"],
              ["all", "Show all"],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={qualityFilter === val ? "active" : ""}
                onClick={() => setQualityFilter(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="gap-filter-group">
          <span className="gap-filter-label">Opportunity</span>
          <div className="timeframe-rail gap-filter-rail">
            {[
              ["all", "All"],
              ["critical", "Critical"],
              ["high", "High+"],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={oppFilter === val ? "active" : ""}
                onClick={() => setOppFilter(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="insights-table-wrap">
        <table className="data-table data-table--insights data-table--gaps">
          <thead>
            <tr>
              <th>Prompt</th>
              <th>Searches</th>
              <th>Result quality</th>
              <th>Avg results</th>
              <th>Opportunity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-empty">
                  {(data.contentGaps ?? []).length
                    ? "No prompts match these filters."
                    : "No gap data yet — searches with weak results will appear here."}
                </td>
              </tr>
            ) : (
              filtered.slice(0, 50).map((g) => {
                const opp = OPP_LABELS[g.opportunity] ?? OPP_LABELS.low;
                return (
                  <tr key={g.query} className={`gap-row gap-row--${g.resultQuality}`}>
                    <td className="prompt-cell">{g.query}</td>
                    <td>
                      <strong>{g.count.toLocaleString()}</strong>
                    </td>
                    <td>
                      <span className={`quality-badge quality-badge--${g.resultQuality}`}>
                        {QUALITY_LABELS[g.resultQuality]}
                      </span>
                    </td>
                    <td className="text-muted">{g.avgResultCount}</td>
                    <td>
                      <span className={`opportunity-badge ${opp.cls}`}>
                        <span className="opportunity-badge__icon">{opp.icon}</span>
                        {opp.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {data.contentGapsInsight && (
        <p className="insights-callout">{data.contentGapsInsight}</p>
      )}
    </div>
  );
}
