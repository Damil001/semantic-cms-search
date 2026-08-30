"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MeResponse, PromptAnalytics } from "@/lib/types";
import { InsightsTab } from "./InsightsTab";
import { IntelligenceTab } from "./IntelligenceTab";
import { SetupTab } from "./SetupTab";

const STALE_MS = 2 * 60 * 1000;
type Tab = "insights" | "intelligence" | "setup";

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
          const res = await fetch(`/api/app/analytics?days=${days}`);
          if (!res.ok) return;
          const data = (await res.json()) as PromptAnalytics;
          analyticsRef.current = data;
          setAnalytics(data);
          setAnalyticsDays(days);
          setFetchedAt(Date.now());
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

    const bootTimeout = window.setTimeout(() => {
      if (!cancelled) {
        setBooting(false);
      }
    }, 12000);

    (async () => {
      try {
        const authRes = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const auth = await authRes.json();

        if (cancelled) return;

        if (!auth.authenticated) {
          window.location.replace("/login?next=/app");
          return;
        }

        const meRes = await fetch("/api/app/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const meData = (await meRes.json()) as MeResponse;
        if (cancelled) return;

        setMe(meData);
        setBooting(false);

        if (meData.connected) {
          void loadAnalytics({ days: 30, force: true });
        }
      } catch {
        if (!cancelled) {
          setBooting(false);
          window.location.replace("/login?next=/app");
        }
      } finally {
        window.clearTimeout(bootTimeout);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimeout);
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
          Checking session…
        </p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="container section--tight">
        <div className="insights-panel insights-panel--empty">
          <div className="empty-state">
            <h2 className="title-lg">Sign in required</h2>
            <p className="body-md text-muted">
              Your session expired or could not be verified. Sign in again to open the dashboard.
            </p>
            <a className="btn btn-primary mt-md" href="/login?next=/app">
              Go to sign in
            </a>
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
            <a className="btn btn-primary mt-md" href="/api/oauth/start">
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
            ["setup", "Setup & index"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
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
                  analyticsRef.current = null;
                  loadAnalytics({ days: d, force: true });
                }}
                onRefresh={() => loadAnalytics({ force: true, background: true })}
              />
            </div>
          ) : (
            <div className="insights-panel insights-panel--empty mb-lg">
              <p className="body-md text-muted" style={{ margin: 0 }}>
                Insights could not be loaded. Try refreshing the tab.
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

      {tab === "intelligence" && me && <IntelligenceTab />}

      {tab === "setup" && me && <SetupTab me={me} onSiteMetaChange={() => {}} />}
    </div>
  );
}
