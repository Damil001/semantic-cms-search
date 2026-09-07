"use client";

import { useCallback, useEffect, useState } from "react";
import type { AeoBrief, AeoPageScore, AeoReport } from "@/lib/types";
import { fmtDate } from "@/lib/format";

function readinessBadge(r: AeoPageScore["readiness"]) {
  if (r === "ready") return <span className="trend-badge trend-badge--up">Answer-ready</span>;
  if (r === "partial")
    return <span className="trend-badge trend-badge--neutral">Partial</span>;
  return <span className="trend-badge trend-badge--down">Needs work</span>;
}

function BriefCard({ brief }: { brief: AeoBrief }) {
  return (
    <div className="insights-panel mb-md">
      <div className="insights-panel__head insights-panel__head--split">
        <div>
          <h3 className="title-sm" style={{ margin: 0 }}>
            {brief.suggestedTitle}
          </h3>
          <p className="caption text-muted" style={{ margin: "4px 0 0" }}>
            Target: “{brief.question}” · {brief.searchDemand} on-site searches ·{" "}
            {brief.opportunity} opportunity
          </p>
        </div>
        <span className="gap-summary-pill">{brief.format}</span>
      </div>
      <p className="body-md text-muted">{brief.rationale}</p>
      <div className="row-2 mt-md">
        <div>
          <p className="caption" style={{ marginBottom: 8 }}>
            Outline
          </p>
          <ol className="body-md" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55 }}>
            {brief.outline.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </div>
        <div>
          <p className="caption" style={{ marginBottom: 8 }}>
            Facts to include
          </p>
          <ul className="body-md" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55 }}>
            {brief.factsToInclude.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="caption mt-md" style={{ marginBottom: 0 }}>
            Schema hint: <code>{brief.schemaHint}</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export function AeoTab() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<AeoReport | null>(null);

  const loadCached = useCallback(async () => {
    try {
      const res = await fetch(`/api/app/aeo?days=30`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const json = (await res.json()) as AeoReport & {
        cached?: boolean;
        savedAt?: string;
        error?: string;
      };
      if (json.error) return;
      if (json.stats) {
        setData(json);
        if (json.days) setDays(json.days);
      }
    } catch {
      /* ignore */
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void loadCached();
  }, [loadCached]);

  const run = useCallback(async (d: number, refresh: boolean) => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ days: String(d) });
      if (refresh) qs.set("refresh", "1");
      const res = await fetch(`/api/app/aeo?${qs}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AEO analysis failed");
      setData(json as AeoReport);
      setDays(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AEO analysis failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      <div className="insights-toolbar">
        <div>
          <h2 className="title-sm" style={{ margin: "0 0 4px" }}>
            AEO — Answer engine optimization
          </h2>
          <p className="caption text-muted" style={{ margin: 0 }}>
            Score indexed pages for AI citability and turn search gaps into answer-page briefs
          </p>
          {data && (
            <p className="caption text-muted" style={{ margin: "4px 0 0" }}>
              Saved report from {fmtDate(data.analyzedAt)} · last {data.days} days of search gaps.
              Re-run anytime for new findings.
            </p>
          )}
        </div>
        <div className="insights-toolbar__actions">
          <div className="timeframe-rail">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                className={days === d ? "active" : ""}
                disabled={loading || booting}
                onClick={() => run(d, true)}
              >
                {d} days
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || booting}
            onClick={() => run(days, true)}
          >
            {loading
              ? "Analyzing…"
              : data
                ? "Re-run AEO"
                : "Run AEO analysis"}
          </button>
        </div>
      </div>

      {error && (
        <p className="insights-callout mb-lg" role="alert">
          {error}
        </p>
      )}

      {(loading || booting) && !data && (
        <div className="prompt-stat-grid mb-lg">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`skeleton-stat insights-stat-card insights-stat-card--${
                ["peach", "mint", "mustard", "cream"][i]
              }`}
            />
          ))}
        </div>
      )}

      {loading && data && (
        <p className="insights-callout mb-lg">
          Refreshing AEO report… previous results stay visible until the new run finishes.
        </p>
      )}

      {!loading && !booting && !data && !error && (
        <div className="insights-panel insights-panel--empty mb-lg">
          <div className="empty-state">
            <h2 className="title-lg">Draft AEO helper</h2>
            <p className="body-md text-muted">
              Runs answer-readiness scores on your indexed CMS pages and builds briefs from
              on-site questions that currently get weak or zero results. Reports are saved so they
              stay after you switch tabs.
            </p>
            <button
              type="button"
              className="btn btn-primary mt-md"
              onClick={() => run(30, true)}
            >
              Run AEO analysis
            </button>
          </div>
        </div>
      )}

      {data && (
        <>
          <p className="body-md mb-lg" style={{ maxWidth: "62ch" }}>
            {data.summary}
          </p>

          <div className="prompt-stat-grid mb-lg">
            <div className="insights-stat-card insights-stat-card--mint">
              <div className="insights-stat-card__top">
                <span className="insights-stat-card__label">Avg readiness</span>
              </div>
              <div className="insights-stat-card__value">{data.stats.avgScore}</div>
              <div className="insights-stat-card__foot">
                <span className="caption text-muted">
                  {data.stats.pagesScored} pages scored
                </span>
              </div>
            </div>
            <div className="insights-stat-card insights-stat-card--peach">
              <div className="insights-stat-card__top">
                <span className="insights-stat-card__label">Answer-ready</span>
              </div>
              <div className="insights-stat-card__value">{data.stats.readyCount}</div>
              <div className="insights-stat-card__foot">
                <span className="caption text-muted">
                  {data.stats.partialCount} partial · {data.stats.weakCount} weak
                </span>
              </div>
            </div>
            <div className="insights-stat-card insights-stat-card--mustard">
              <div className="insights-stat-card__top">
                <span className="insights-stat-card__label">Gap questions</span>
              </div>
              <div className="insights-stat-card__value">{data.stats.gapCount}</div>
              <div className="insights-stat-card__foot">
                <span className="caption text-muted">
                  {data.stats.briefCount} briefs generated
                </span>
              </div>
            </div>
            <div className="insights-stat-card insights-stat-card--cream">
              <div className="insights-stat-card__top">
                <span className="insights-stat-card__label">Window</span>
              </div>
              <div className="insights-stat-card__value">{data.days}d</div>
              <div className="insights-stat-card__foot">
                <span className="caption text-muted">Search gap lookback</span>
              </div>
            </div>
          </div>

          <div className="insights-panel mb-lg">
            <div className="insights-panel__head">
              <h3 className="title-sm">How to use this</h3>
              <p className="caption text-muted">Practical AEO tips for this draft</p>
            </div>
            <ul className="body-md" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55 }}>
              {data.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>

          <div className="mb-lg">
            <div className="insights-panel__head" style={{ marginBottom: 12 }}>
              <h3 className="title-sm">AEO content briefs</h3>
              <p className="caption text-muted">
                From on-site questions with weak or zero results — publish then re-index
              </p>
            </div>
            {data.briefs.length === 0 ? (
              <div className="insights-panel insights-panel--empty">
                <p className="body-md text-muted" style={{ margin: 0 }}>
                  No gap-driven briefs yet. Collect more search traffic or widen the timeframe.
                </p>
              </div>
            ) : (
              data.briefs.map((b) => <BriefCard key={b.question} brief={b} />)
            )}
          </div>

          <div className="insights-panel mb-lg">
            <div className="insights-panel__head">
              <h3 className="title-sm">Page answer-readiness</h3>
              <p className="caption text-muted">
                Lowest scores first — fix these before chasing new topics
              </p>
            </div>
            {data.pages.length === 0 ? (
              <p className="body-md text-muted">No indexed pages to score.</p>
            ) : (
              <div className="insights-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Top fix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pages.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="label-md" style={{ marginBottom: 2 }}>
                            {p.title}
                          </div>
                          <a
                            className="caption"
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {p.contentType}
                          </a>
                        </td>
                        <td>{p.score}</td>
                        <td>{readinessBadge(p.readiness)}</td>
                        <td className="body-md text-muted">
                          {p.fixes[0] ?? p.strengths[0] ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
