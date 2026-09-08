"use client";

import { useCallback, useEffect, useState } from "react";
import type { AeoBrief, AeoPageScore, AeoReport } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";

function readinessBadge(r: AeoPageScore["readiness"]) {
  if (r === "ready") return <span className="trend-badge trend-badge--up">Answer-ready</span>;
  if (r === "partial")
    return <span className="trend-badge trend-badge--neutral">Partial</span>;
  return <span className="trend-badge trend-badge--down">Needs work</span>;
}

function BriefRow({
  brief,
  open,
  onToggle,
}: {
  brief: AeoBrief;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`aeo-brief${open ? " aeo-brief--open" : ""}`}>
      <button type="button" className="aeo-brief__toggle" onClick={onToggle}>
        <span className="aeo-brief__main">
          <span className="label-md">{brief.suggestedTitle}</span>
          <span className="caption text-muted">
            “{brief.question}” · {brief.searchDemand} searches · {brief.opportunity}
          </span>
        </span>
        <span className="gap-summary-pill">{brief.format}</span>
        <span className="aeo-brief__chevron" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="aeo-brief__body">
          <p className="body-md text-muted" style={{ marginTop: 0 }}>
            {brief.rationale}
          </p>
          <div className="aeo-brief__grid">
            <div>
              <p className="caption" style={{ marginBottom: 6 }}>
                Outline
              </p>
              <ol className="body-md aeo-compact-list">
                {brief.outline.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
            </div>
            <div>
              <p className="caption" style={{ marginBottom: 6 }}>
                Facts · schema
              </p>
              <ul className="body-md aeo-compact-list">
                {brief.factsToInclude.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="caption" style={{ margin: "8px 0 0" }}>
                <code>{brief.schemaHint}</code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AeoTab() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<AeoReport | null>(null);
  const [openBrief, setOpenBrief] = useState<string | null>(null);
  const [showAllPages, setShowAllPages] = useState(false);

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
    trackEvent("aeo_run", { days: d, refresh });
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
      setOpenBrief(null);
      setShowAllPages(false);
      trackEvent("aeo_success", { days: d });
    } catch (err) {
      setError(err instanceof Error ? err.message : "AEO analysis failed");
      trackEvent("aeo_failed", { days: d });
    } finally {
      setLoading(false);
    }
  }, []);

  const pages = data?.pages ?? [];
  const visiblePages = showAllPages ? pages : pages.slice(0, 8);

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
            {loading ? "Analyzing…" : data ? "Re-run AEO" : "Run AEO analysis"}
          </button>
        </div>
      </div>

      {data && (
        <div className="aeo-status-bar mb-md" role="status">
          <div className="aeo-status-bar__date">
            <span className="aeo-status-bar__label">Last ran</span>
            <time dateTime={data.analyzedAt} className="aeo-status-bar__value">
              {fmtDate(data.analyzedAt)}
            </time>
          </div>
          <span className="aeo-status-bar__sep" aria-hidden>
            ·
          </span>
          <span className="body-md">{data.summary}</span>
        </div>
      )}

      {error && (
        <p className="insights-callout mb-md" role="alert">
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
        <p className="insights-callout mb-md">
          Refreshing… previous results stay visible until the new run finishes.
        </p>
      )}

      {!loading && !booting && !data && !error && (
        <div className="insights-panel insights-panel--empty mb-lg">
          <div className="empty-state">
            <h2 className="title-lg">Draft AEO helper</h2>
            <p className="body-md text-muted">
              Runs answer-readiness scores on your indexed CMS pages and builds briefs from
              on-site questions with weak or zero results. Reports are saved across tab switches.
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
          <div className="prompt-stat-grid mb-md">
            <div className="insights-stat-card insights-stat-card--mint insights-stat-card--static">
              <div className="insights-stat-card__label">Avg readiness</div>
              <div className="insights-stat-card__value">{data.stats.avgScore}</div>
              <div className="caption text-muted">{data.stats.pagesScored} pages</div>
            </div>
            <div className="insights-stat-card insights-stat-card--peach insights-stat-card--static">
              <div className="insights-stat-card__label">Answer-ready</div>
              <div className="insights-stat-card__value">{data.stats.readyCount}</div>
              <div className="caption text-muted">
                {data.stats.partialCount} partial · {data.stats.weakCount} weak
              </div>
            </div>
            <div className="insights-stat-card insights-stat-card--mustard insights-stat-card--static">
              <div className="insights-stat-card__label">Gap questions</div>
              <div className="insights-stat-card__value">{data.stats.gapCount}</div>
              <div className="caption text-muted">{data.stats.briefCount} briefs</div>
            </div>
            <div className="insights-stat-card insights-stat-card--cream insights-stat-card--static">
              <div className="insights-stat-card__label">Window</div>
              <div className="insights-stat-card__value">{data.days}d</div>
              <div className="caption text-muted">Search lookback</div>
            </div>
          </div>

          <details className="aeo-tips mb-md">
            <summary className="aeo-tips__summary">How to use this report</summary>
            <ul className="body-md aeo-compact-list" style={{ marginTop: 10 }}>
              {data.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </details>

          <div className="aeo-split mb-md">
            <section className="insights-panel aeo-panel">
              <div className="insights-panel__head">
                <h3 className="title-sm">Content briefs</h3>
                <p className="caption text-muted">
                  Expand a brief · publish → re-index
                </p>
              </div>
              {data.briefs.length === 0 ? (
                <p className="body-md text-muted" style={{ margin: 0 }}>
                  No gap-driven briefs yet. Collect more search traffic or widen the timeframe.
                </p>
              ) : (
                <div className="aeo-brief-list">
                  {data.briefs.map((b) => (
                    <BriefRow
                      key={b.question}
                      brief={b}
                      open={openBrief === b.question}
                      onToggle={() =>
                        setOpenBrief((cur) =>
                          cur === b.question ? null : b.question
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="insights-panel aeo-panel">
              <div className="insights-panel__head insights-panel__head--split">
                <div>
                  <h3 className="title-sm">Page readiness</h3>
                  <p className="caption text-muted">Lowest scores first</p>
                </div>
                {pages.length > 8 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowAllPages((v) => !v)}
                  >
                    {showAllPages ? "Show top 8" : `Show all ${pages.length}`}
                  </button>
                )}
              </div>
              {pages.length === 0 ? (
                <p className="body-md text-muted">No indexed pages to score.</p>
              ) : (
                <div className="insights-table-wrap aeo-table-scroll">
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
                      {visiblePages.map((p) => (
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
            </section>
          </div>
        </>
      )}
    </>
  );
}
