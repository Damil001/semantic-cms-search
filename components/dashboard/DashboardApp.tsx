"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MeResponse, PromptAnalytics } from "@/lib/types";
import { trackEvent } from "@/lib/analytics";
import { InsightsTab } from "./InsightsTab";
import { IntelligenceTab } from "./IntelligenceTab";
import { AeoTab } from "./AeoTab";
import { SetupTab } from "./SetupTab";

const STALE_MS = 2 * 60 * 1000;
type Tab = "insights" | "intelligence" | "aeo" | "setup";

async function fetchJson<T>(url: string, timeoutMs = 15_000): Promise<T | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export function DashboardApp() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<Tab>("insights");
  const [analytics, setAnalytics] = useState<PromptAnalytics | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const analyticsRef = useRef<PromptAnalytics | null>(null);

  const loadAnalytics = useCallback(
    async (opts: { days?: number; force?: boolean; background?: boolean } = {}) => {
      const days = opts.days ?? analyticsDays;

      if (loadPromiseRef.current && !opts.force) {
        await loadPromiseRef.current;
        return;
      }

      const hasCache = analyticsRef.current && analyticsRef.current.days === days;
      if (hasCache && !opts.force && !opts.background) {
        setAnalytics(analyticsRef.current);
        return;
      }

      if (!opts.background && !hasCache) setAnalyticsLoading(true);
      else if (hasCache) setSyncing(true);

      loadPromiseRef.current = (async () => {
        try {
          const data = await fetchJson<PromptAnalytics>(
            `/api/app/analytics?days=${days}`,
            20_000
          );
          if (data) {
            analyticsRef.current = data;
            setAnalytics(data);
            setAnalyticsDays(days);
            setFetchedAt(Date.now());
          } else if (!opts.background) {
            analyticsRef.current = null;
            setAnalytics(null);
          }
        } finally {
          setAnalyticsLoading(false);
          setSyncing(false);
          loadPromiseRef.current = null;
        }
      })();

      await loadPromiseRef.current;
    },
    [analyticsDays]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("connected") === "1") {
        setTab("setup");
      }

      const auth = await fetchJson<{ authenticated?: boolean }>("/api/auth/session");
      if (cancelled) return;

      if (!auth?.authenticated) {
        window.location.replace("/login?next=/app");
        return;
      }

      const meData = await fetchJson<MeResponse>("/api/app/me");
      if (cancelled) return;

      if (!meData?.authenticated) {
        window.location.replace("/login?next=/app");
        return;
      }

      setMe(meData);
      setBooting(false);

      if (meData.connected) {
        if (params.get("connected") === "1") {
          setTab("setup");
          window.history.replaceState({}, "", "/app");
        }
        void loadAnalytics({ days: 30, force: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadAnalytics]);

  useEffect(() => {
    if (tab !== "insights" || !me?.connected) return;

    const poll = window.setInterval(() => {
      if (fetchedAt && Date.now() - fetchedAt > STALE_MS) {
        loadAnalytics({ background: true });
      }
    }, STALE_MS);

    const onVis = () => {
      if (
        document.visibilityState === "visible" &&
        fetchedAt &&
        Date.now() - fetchedAt > STALE_MS
      ) {
        loadAnalytics({ background: true });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [tab, me?.connected, fetchedAt, loadAnalytics]);

  if (booting) {
    return (
      <div className="container section--tight" style={{ paddingBottom: 96 }}>
        <div className="skeleton-tabs mb-lg">
          <div className="skeleton-tab" />
          <div className="skeleton-tab" />
          <div className="skeleton-tab" />
        </div>
        <div className="prompt-stat-grid mb-lg">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-stat insights-stat-card insights-stat-card--cream" />
          ))}
        </div>
        <p className="caption text-muted" style={{ textAlign: "center" }}>
          Loading dashboard…
        </p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="container section--tight">
        <div className="insights-panel insights-panel--empty">
          <div className="empty-state">
            <h2 className="title-lg">Could not load dashboard</h2>
            <p className="body-md text-muted">
              Your session is active but profile data did not load. Try again.
            </p>
            <button
              type="button"
              className="btn btn-primary mt-md"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (me && !me.connected) {
    return (
      <div className="container section--tight">
        <div className="insights-panel insights-panel--empty">
          <div className="empty-state">
            <h2 className="title-lg">Connect your Webflow site</h2>
            <p className="body-md text-muted">
              Authorize CMS read access, map your collections, index content, and embed search on your site.
            </p>
            <a
              className="btn btn-primary mt-md"
              href="/install"
              onClick={() => trackEvent("connect_webflow_click", { source: "dashboard_empty" })}
            >
              Connect Webflow
            </a>
          </div>
        </div>
      </div>
    );
  }

  const siteLabel = `${me?.siteName || me?.siteId || "Site"}`;

  return (
    <div className="container section--tight" style={{ paddingBottom: 96 }}>
      <div className="tab-rail">
        {(
          [
            ["insights", "Insights"],
            ["intelligence", "Content intelligence"],
            ["aeo", "AEO"],
            ["setup", "Setup & index"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "active" : ""}
            onClick={() => {
              setTab(id);
              trackEvent("dashboard_tab", { tab: id });
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "insights" && (
        <>
          {analyticsLoading && !analytics ? (
            <div className="insights-panel mb-lg">
              <div className="index-progress__head" style={{ padding: "8px 0" }}>
                <span className="index-spinner" aria-hidden />
                <p className="index-progress__title">Loading search insights…</p>
              </div>
            </div>
          ) : analytics ? (
            <div id="insightsData" className={syncing ? "is-syncing" : ""}>
              <InsightsTab
                data={analytics}
                siteLabel={siteLabel}
                fetchedAt={fetchedAt}
                syncing={syncing}
                days={analyticsDays}
                onDaysChange={(d) => {
                  trackEvent("insights_days_change", { days: d });
                  analyticsRef.current = null;
                  loadAnalytics({ days: d, force: true });
                }}
                onRefresh={() => {
                  trackEvent("insights_refresh");
                  loadAnalytics({ force: true, background: true });
                }}
              />
            </div>
          ) : (
            <div className="insights-panel insights-panel--empty mb-lg">
              <p className="body-md text-muted" style={{ margin: 0 }}>
                Insights are still loading. If this persists, open Setup and confirm your site is connected.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm mt-md"
                onClick={() => loadAnalytics({ force: true })}
              >
                Retry
              </button>
            </div>
          )}
        </>
      )}

      {/* Keep report tabs mounted so in-memory state survives toggles; server also persists. */}
      {me && (
        <div hidden={tab !== "intelligence"}>
          <IntelligenceTab />
        </div>
      )}
      {me && (
        <div hidden={tab !== "aeo"}>
          <AeoTab />
        </div>
      )}
      {me && (
        <div hidden={tab !== "setup"}>
          <SetupTab me={me} onSiteMetaChange={() => {}} />
        </div>
      )}
    </div>
  );
}
