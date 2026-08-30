"use client";

import type { PromptAnalytics } from "@/lib/types";
import { fmtDate, relativeUpdatedTime, trendBadge } from "@/lib/format";
import { StatCards } from "./StatCards";
import { ContentGapsPanel } from "./ContentGapsPanel";
import { VolumeChart } from "@/components/charts/AnalyticsCharts";

interface Props {
  data: PromptAnalytics;
  siteLabel: string;
  fetchedAt: number;
  syncing: boolean;
  days: number;
  onDaysChange: (days: number) => void;
  onRefresh: () => void;
}

export function InsightsTab({
  data,
  siteLabel,
  fetchedAt,
  syncing,
  days,
  onDaysChange,
  onRefresh,
}: Props) {
  const nr = data.newVsReturning;
  const nrTotal = nr.newCount + nr.returningCount;

  return (
    <>
      <div className="insights-toolbar">
        <div>
          <h2 className="title-sm" style={{ margin: "0 0 4px" }}>
            Prompt analytics
          </h2>
          <p className="caption text-muted" style={{ margin: 0 }}>
            {siteLabel} · last {data.days} days
          </p>
          <p className="caption text-muted" style={{ margin: "4px 0 0" }}>
            {fetchedAt
              ? `${relativeUpdatedTime(fetchedAt)}${syncing ? " · refreshing…" : ""}`
              : ""}
          </p>
        </div>
        <div className="insights-toolbar__actions">
          <div className="timeframe-rail">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                className={days === d ? "active" : ""}
                onClick={() => onDaysChange(d)}
              >
                {d} days
              </button>
            ))}
          </div>
          {fetchedAt > 0 && (
            <button type="button" className="btn btn-ghost" onClick={onRefresh}>
              Refresh
            </button>
          )}
        </div>
      </div>

      <StatCards data={data} />
        <ContentGapsPanel data={data} />

        <div className="insights-panel mb-lg" id="newReturningPanel">
          <div className="insights-panel__head">
            <h3 className="title-sm">New vs. returning</h3>
            <p className="caption text-muted">
              First-time questions vs. repeat prompts in this period
            </p>
          </div>
          <div className="new-returning-legend">
            <span className="new-returning-legend__item">
              <i className="new-returning-legend__dot new-returning-legend__dot--new" /> New
            </span>
            <span className="new-returning-legend__item">
              <i className="new-returning-legend__dot new-returning-legend__dot--returning" /> Returning
            </span>
          </div>
          {nrTotal > 0 && (
            <>
              <div className="new-returning-bar mb-md">
                <div
                  className="new-returning-segment new-returning-segment--new"
                  style={{
                    width: `${Math.max(nr.newPercent, nr.newCount > 0 ? 4 : 0)}%`,
                  }}
                />
                <div
                  className="new-returning-segment new-returning-segment--returning"
                  style={{
                    width: `${Math.max(nr.returningPercent, nr.returningCount > 0 ? 4 : 0)}%`,
                  }}
                />
              </div>
              <div className="new-returning-pills">
                <div className="new-returning-pill new-returning-pill--new">
                  <span className="new-returning-pill__label">New</span>
                  <strong>{nr.newCount.toLocaleString()}</strong>
                  <span>{nr.newPercent}%</span>
                </div>
                <div className="new-returning-pill new-returning-pill--returning">
                  <span className="new-returning-pill__label">Returning</span>
                  <strong>{nr.returningCount.toLocaleString()}</strong>
                  <span>{nr.returningPercent}%</span>
                </div>
              </div>
            </>
          )}
          <p className="insights-callout">
            {nrTotal > 0
              ? `${nr.newPercent}% of prompts are new questions not asked before this period — a strong signal for content gaps and fresh demand.`
              : "No prompt data for this period yet."}
          </p>
        </div>

        <div className="insights-panel mb-lg" id="volumePanel">
          <div className="insights-panel__head">
            <h3 className="title-sm">Prompt volume over time</h3>
            <p className="caption text-muted">Daily search activity from your embedded widget</p>
          </div>
          <VolumeChart points={data.volumeOverTime ?? []} />
          {data.volumeInsight && (
            <p className="insights-callout">{data.volumeInsight}</p>
          )}
        </div>

        <div className="insights-panel mb-lg">
          <div className="insights-panel__head">
            <h3 className="title-sm">Most popular prompts</h3>
            <p className="caption text-muted">Highest volume — not the same as fastest growth</p>
          </div>
          <div className="insights-table-wrap">
            <table className="data-table data-table--insights">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Prompt</th>
                  <th>Volume</th>
                  <th>Share</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {(data.popularPrompts ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      No popular prompts yet.
                    </td>
                  </tr>
                ) : (
                  data.popularPrompts.map((p, i) => {
                    const t = trendBadge(p.trendPercent);
                    return (
                      <tr key={p.query}>
                        <td className="rank-cell">{i + 1}</td>
                        <td className="prompt-cell">{p.query}</td>
                        <td>
                          <strong>{p.count.toLocaleString()}</strong>
                        </td>
                        <td>{p.percentOfTotal}%</td>
                        <td>
                          <span className={t.className}>{t.label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="insights-panel mb-lg">
          <div className="insights-panel__head">
            <h3 className="title-sm">Trending prompts</h3>
            <p className="caption text-muted">
              Fastest growth vs. the previous equivalent period
            </p>
          </div>
          <div className="insights-table-wrap">
            <table className="data-table data-table--insights">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Prompt</th>
                  <th>Volume</th>
                  <th>Growth</th>
                </tr>
              </thead>
              <tbody>
                {(data.trendingPrompts ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="table-empty">
                      Not enough growth yet — trending appears when prompts accelerate vs. the previous period.
                    </td>
                  </tr>
                ) : (
                  data.trendingPrompts.map((p, i) => {
                    const t = trendBadge(p.growthPercent);
                    return (
                      <tr key={p.query}>
                        <td className="rank-cell">{i + 1}</td>
                        <td className="prompt-cell">{p.query}</td>
                        <td>
                          <strong>{p.currentCount.toLocaleString()}</strong>
                        </td>
                        <td>
                          <span className={t.className}>{t.label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!(data.total > 0) && (
          <p className="insights-empty mb-lg">
            No prompts logged yet. Embed search on your site and try a few queries.
          </p>
        )}

        <div className="insights-panel">
          <div className="insights-panel__head">
            <h3 className="title-sm">Recent prompts</h3>
            <p className="caption text-muted">Latest searches as they happened</p>
          </div>
          <div className="insights-table-wrap">
            <table className="data-table data-table--insights">
              <thead>
                <tr>
                  <th>Prompt</th>
                  <th>Results</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {(data.recentQueries ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="table-empty">
                      No recent prompts.
                    </td>
                  </tr>
                ) : (
                  data.recentQueries.map((q) => (
                    <tr key={`${q.query}-${q.createdAt}`}>
                      <td className="prompt-cell">{q.query}</td>
                      <td>{q.resultCount}</td>
                      <td className="text-muted">{fmtDate(q.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
    </>
  );
}
