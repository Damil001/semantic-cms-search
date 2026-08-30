"use client";

import { useState } from "react";
import type { ContentInsightsResponse } from "@/lib/types";
import { fmtDate } from "@/lib/format";

const SURFACES = ["peach", "mint", "mustard", "cream"];

function volumeBadge(vol: string) {
  const cls =
    vol === "high"
      ? "trend-badge--up"
      : vol === "medium"
        ? "trend-badge--neutral"
        : "trend-badge--neutral";
  return <span className={`trend-badge ${cls}`}>{vol || "low"} volume</span>;
}

export function IntelligenceTab() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ContentInsightsResponse | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setStatus("Analyzing up to 15,000 past searches… this may take 30–60 seconds.");
    setData(null);
    try {
      const res = await fetch("/api/app/content-insights", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Analysis failed");
      setData(json);
      setStatus("Analysis complete.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="insights-toolbar">
        <div>
          <h2 className="title-sm" style={{ margin: "0 0 4px" }}>
            Content intelligence
          </h2>
          <p className="caption text-muted" style={{ margin: 0 }}>
            AI analysis of up to 15,000 searches — topic trends, gaps, and content ideas
          </p>
          {status && (
            <p className="caption text-muted" style={{ margin: "4px 0 0" }}>
              {status}
            </p>
          )}
        </div>
        <div className="insights-toolbar__actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={runAnalysis}
          >
            {loading ? "Analyzing…" : "Analyze search trends"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="prompt-stat-grid mb-lg">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`skeleton-stat insights-stat-card insights-stat-card--${SURFACES[i]}`}
            />
          ))}
        </div>
      )}

      {!loading && !data && (
        <div className="insights-panel insights-panel--empty mb-lg">
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </span>
            <h3 className="title-sm">Ready when you are</h3>
            <p className="body-md text-muted">
              Run an analysis to see what visitors are searching for, where content is missing, and what your team should write next.
            </p>
          </div>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="prompt-stat-grid mb-lg">
            {[
              [data.eventsAnalyzed.toLocaleString(), "Searches analyzed", "mint"],
              [data.uniqueQueries.toLocaleString(), "Unique queries", "peach"],
              [(data.contentGaps ?? []).length.toLocaleString(), "Content gaps", "mustard"],
              [(data.marketingSuggestions ?? []).length.toLocaleString(), "Suggestions", "cream"],
            ].map(([value, label, surface]) => (
              <div
                key={String(label)}
                className={`insights-stat-card insights-stat-card--${surface} insights-stat-card--static`}
              >
                <div className="insights-stat-card__label">{label}</div>
                <div className="insights-stat-card__value">{value}</div>
              </div>
            ))}
          </div>

          <div className="insights-panel mb-lg">
            <div className="insights-panel__head">
              <h3 className="title-sm">Executive summary</h3>
              <p className="caption text-muted">What your search data means for content and marketing</p>
            </div>
            <p className="body-md">{data.summary}</p>
            <p className="caption text-muted mt-sm">
              {data.eventsAnalyzed} searches analyzed · {data.uniqueQueries} unique queries ·{" "}
              {fmtDate(data.analyzedAt)}
            </p>
          </div>

          <div className="insights-panel mb-lg">
            <div className="insights-panel__head">
              <h3 className="title-sm">Topic trends</h3>
              <p className="caption text-muted">Recurring themes clustered from real prompts</p>
            </div>
            <div className="intelligence-trends">
              {(data.trends ?? []).length === 0 ? (
                <p className="body-md text-muted table-empty">Not enough data to identify trends yet.</p>
              ) : (
                data.trends.map((t, i) => (
                  <div
                    key={t.topic}
                    className={`intelligence-trend-card intelligence-trend-card--${SURFACES[i % SURFACES.length]}`}
                  >
                    <div className="intelligence-trend-card__head">
                      <strong className="label-md">{t.topic}</strong>
                      {volumeBadge(t.volume)}
                    </div>
                    <p className="body-md text-muted">{t.description}</p>
                    <p className="caption">
                      Examples: {(t.exampleQueries ?? []).join(", ")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="insights-panel mb-lg">
            <div className="insights-panel__head">
              <h3 className="title-sm">Content gaps</h3>
              <p className="caption text-muted">High-intent searches your site doesn&apos;t answer well yet</p>
            </div>
            <div className="insights-table-wrap">
              {(data.contentGaps ?? []).length === 0 ? (
                <p className="body-md text-muted table-empty">No major content gaps detected.</p>
              ) : (
                <table className="data-table data-table--insights">
                  <thead>
                    <tr>
                      <th>Query</th>
                      <th>Searches</th>
                      <th>Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.contentGaps.map((g) => (
                      <tr key={g.query}>
                        <td className="prompt-cell">{g.query}</td>
                        <td>
                          <strong>{g.searches ?? "—"}</strong>
                        </td>
                        <td>{g.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="insights-panel insights-panel--suggestions mb-lg">
            <div className="insights-panel__head">
              <h3 className="title-sm">Marketing suggestions</h3>
              <p className="caption text-muted">Recommended pieces your team could publish next</p>
            </div>
            <div className="suggestion-list">
              {(data.marketingSuggestions ?? []).length === 0 ? (
                <p className="body-md text-muted table-empty">
                  Run analysis again once you have more search data.
                </p>
              ) : (
                data.marketingSuggestions.map((s) => (
                  <div key={s.title} className="suggestion-card">
                    <div className="suggestion-card__head">
                      <strong className="label-md">{s.title}</strong>
                      <span className="quality-badge quality-badge--weak">{s.format}</span>
                    </div>
                    <p className="body-md text-muted">{s.rationale}</p>
                    <p className="caption">
                      Targets: {(s.targetQueries ?? []).join(", ")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
