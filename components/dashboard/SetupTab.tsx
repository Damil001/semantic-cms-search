"use client";

import { useCallback, useEffect, useState } from "react";
import type { Collection, CollectionMapping, MeResponse } from "@/lib/types";
import { trackEvent } from "@/lib/analytics";
import { EmbedFieldPicker, isEmbeddableFieldType } from "./EmbedFieldPicker";

interface Props {
  me: MeResponse;
  onSiteMetaChange: (text: string) => void;
}

type CollectionDraft = Collection & { mapping: CollectionMapping };

type CollectionIndexRow = {
  collectionId: string;
  name: string;
  status: "pending" | "indexing" | "done";
  processed: number;
  total: number | null;
  chunks: number;
};

type IndexProgress = {
  phase: "saving" | "indexing" | "success" | "error";
  mode: "save" | "index" | "reindex";
  message: string;
  collections: CollectionIndexRow[];
  totalProcessed: number;
  totalChunks: number;
  percent: number | null;
};

function StatusIcon({ status }: { status: CollectionIndexRow["status"] }) {
  if (status === "indexing") return <span className="index-spinner" aria-hidden />;
  if (status === "done") {
    return (
      <svg className="index-status-icon index-status-icon--done" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return <span className="index-status-icon index-status-icon--pending" aria-hidden />;
}

function formatCollectionStat(row: CollectionIndexRow) {
  if (row.status === "pending") return "Waiting";
  if (row.total != null) return `${row.processed} / ${row.total} items`;
  if (row.processed > 0) return `${row.processed} items`;
  return "Starting…";
}

function computeOverallPercent(rows: CollectionIndexRow[]): number | null {
  const active = rows.filter((r) => r.status !== "pending" || r.processed > 0);
  if (active.length === 0) return null;

  let sum = 0;
  let hasUnknown = false;
  for (const row of rows) {
    if (row.status === "done") {
      sum += 1;
      continue;
    }
    if (row.total != null && row.total > 0) {
      sum += Math.min(row.processed / row.total, 1);
    } else if (row.status === "indexing") {
      hasUnknown = true;
    }
  }
  const pct = (sum / rows.length) * 100;
  return hasUnknown && pct < 5 ? null : Math.min(100, Math.round(pct));
}

function normalizeMapping(mapping: CollectionMapping): CollectionMapping {
  return {
    ...mapping,
    embedFields: Array.isArray(mapping.embedFields) ? mapping.embedFields : [],
  };
}

function mergeCollectionDrafts(
  incoming: Collection[],
  previous: CollectionDraft[]
): { collections: CollectionDraft[]; newFieldCount: number } {
  const previousById = new Map(previous.map((c) => [c.collectionId, c]));
  let newFieldCount = 0;

  const collections = incoming.map((c) => {
    const local = previousById.get(c.collectionId);
    const previousSlugs = new Set((local?.fields ?? []).map((f) => f.slug));
    const newEmbeddableSlugs: string[] = [];
    for (const field of c.fields ?? []) {
      if (!previousSlugs.has(field.slug)) {
        newFieldCount += 1;
        if (isEmbeddableFieldType(field.type)) {
          newEmbeddableSlugs.push(field.slug);
        }
      }
    }

    const baseMapping = normalizeMapping(local?.mapping ?? c.mapping);
    const embedFields = [
      ...new Set([...(baseMapping.embedFields ?? []), ...newEmbeddableSlugs]),
    ];

    return {
      ...c,
      enabled: local?.enabled ?? c.enabled,
      contentType: local?.contentType ?? c.contentType,
      urlPattern: local?.urlPattern ?? c.urlPattern,
      fields: c.fields ?? [],
      mapping: normalizeMapping({
        ...baseMapping,
        embedFields: embedFields.length ? embedFields : baseMapping.embedFields,
      }),
    };
  });

  return { collections, newFieldCount };
}

export function SetupTab({ me, onSiteMetaChange }: Props) {
  const [collections, setCollections] = useState<CollectionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [installingScript, setInstallingScript] = useState(false);
  const [scriptNotice, setScriptNotice] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"save" | "index" | "reindex" | null>(null);
  const [indexProgress, setIndexProgress] = useState<IndexProgress | null>(null);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 10_000);
      const res = await fetch("/api/app/collections", {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (!res.ok) return;
      const data = await res.json();
      const incoming = (data.collections ?? []) as Collection[];
      setCollections(
        incoming.map((c) => ({
          ...c,
          mapping: normalizeMapping(c.mapping),
        }))
      );
      if (data.needsSchemaRefresh) {
        setRefreshNotice("No cached CMS fields yet. Click Refresh fields to pull from Webflow.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshFromWebflow = useCallback(async () => {
    trackEvent("setup_refresh_fields");
    setRefreshing(true);
    setRefreshNotice(null);
    try {
      const res = await fetch("/api/app/collections/refresh", {
        method: "POST",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setRefreshNotice(data.error || "Could not refresh fields from Webflow.");
        return;
      }
      const incoming = (data.collections ?? []) as Collection[];
      let notice = "";
      setCollections((prev) => {
        const { collections: merged, newFieldCount } = mergeCollectionDrafts(incoming, prev);
        const count = data.newFieldCount ?? newFieldCount;
        notice =
          count > 0
            ? `Pulled ${count} new CMS field${count === 1 ? "" : "s"} from Webflow. Map them below, then re-index.`
            : `Synced ${data.synced ?? incoming.length} collection${(data.synced ?? incoming.length) === 1 ? "" : "s"} from Webflow.`;
        return merged;
      });
      setRefreshNotice(notice);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  function updateCollection(i: number, patch: Partial<CollectionDraft>) {
    setCollections((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c))
    );
  }

  function updateMapping(i: number, field: keyof CollectionMapping, value: string) {
    if (field === "embedFields") return;
    setCollections((prev) =>
      prev.map((c, idx) =>
        idx === i ? { ...c, mapping: { ...c.mapping, [field]: value } } : c
      )
    );
  }

  function updateEmbedFields(i: number, slugs: string[]) {
    setCollections((prev) =>
      prev.map((c, idx) =>
        idx === i ? { ...c, mapping: { ...c.mapping, embedFields: slugs } } : c
      )
    );
  }

  function readMaps() {
    return collections.map((c) => ({
      collectionId: c.collectionId,
      collectionName: c.name,
      contentType: c.contentType ?? "",
      enabled: c.enabled,
      urlPattern: c.urlPattern ?? "",
      mapping: c.mapping,
    }));
  }

  async function saveMaps() {
    const res = await fetch("/api/app/maps", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maps: readMaps() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
  }

  function initIndexProgress(mode: "index" | "reindex", enabled: ReturnType<typeof readMaps>) {
    const rows: CollectionIndexRow[] = enabled.map((m) => ({
      collectionId: m.collectionId,
      name: m.collectionName || m.collectionId,
      status: "pending",
      processed: 0,
      total: null,
      chunks: 0,
    }));
    setIndexProgress({
      phase: "saving",
      mode,
      message: "Saving field mappings…",
      collections: rows,
      totalProcessed: 0,
      totalChunks: 0,
      percent: null,
    });
  }

  async function indexAll(reindex = false) {
    const mode = reindex ? "reindex" : "index";
    trackEvent("setup_index", { mode });
    setBusy(true);
    setActiveAction(mode);
    const enabled = readMaps().filter((m) => m.enabled);
    if (enabled.length === 0) {
      setIndexProgress({
        phase: "error",
        mode,
        message: "Enable at least one collection before indexing.",
        collections: [],
        totalProcessed: 0,
        totalChunks: 0,
        percent: null,
      });
      setBusy(false);
      setActiveAction(null);
      return;
    }

    initIndexProgress(mode, enabled);
    try {
      await saveMaps();
      setIndexProgress((prev) =>
        prev
          ? {
              ...prev,
              phase: "indexing",
              message: reindex
                ? "Re-indexing CMS content with saved mappings…"
                : "Indexing CMS content…",
            }
          : prev
      );

      for (const m of enabled) {
        setIndexProgress((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            collections: prev.collections.map((r) =>
              r.collectionId === m.collectionId ? { ...r, status: "indexing" as const } : r
            ),
          };
        });

        let offset = 0;
        let done = false;
        while (!done) {
          const res = await fetch("/api/app/index", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ collectionId: m.collectionId, offset }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Index failed");

          setIndexProgress((prev) => {
            if (!prev) return prev;
            const collections = prev.collections.map((r) =>
              r.collectionId === m.collectionId
                ? {
                    ...r,
                    processed: data.nextOffset ?? offset + (data.processed || 0),
                    total: data.total ?? r.total,
                    chunks: r.chunks + (data.chunks || 0),
                    status: "indexing" as const,
                  }
                : r
            );
            return {
              ...prev,
              collections,
              totalProcessed: collections.reduce((n, r) => n + r.processed, 0),
              totalChunks: collections.reduce((n, r) => n + r.chunks, 0),
              percent: computeOverallPercent(collections),
              message: `Indexing ${m.collectionName || m.collectionId}…`,
            };
          });

          offset = data.nextOffset;
          done = data.done;
        }

        setIndexProgress((prev) => {
          if (!prev) return prev;
          const collections = prev.collections.map((r) =>
            r.collectionId === m.collectionId ? { ...r, status: "done" as const } : r
          );
          return {
            ...prev,
            collections,
            percent: computeOverallPercent(collections),
          };
        });
      }

      setIndexProgress((prev) => {
        const totalProcessed = prev?.totalProcessed ?? 0;
        const totalChunks = prev?.totalChunks ?? 0;
        return {
          phase: "success",
          mode,
          message: `Indexed ${totalProcessed} item${totalProcessed === 1 ? "" : "s"} across ${enabled.length} collection${enabled.length === 1 ? "" : "s"} (${totalChunks} chunks).`,
          collections: (prev?.collections ?? []).map((r) => ({ ...r, status: "done" as const })),
          totalProcessed,
          totalChunks,
          percent: 100,
        };
      });
      onSiteMetaChange(
        `${me.siteName || me.siteId} · Last indexed ${new Date().toLocaleString()}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Index failed";
      setIndexProgress((prev) => ({
        phase: "error",
        mode,
        message,
        collections: prev?.collections ?? [],
        totalProcessed: prev?.totalProcessed ?? 0,
        totalChunks: prev?.totalChunks ?? 0,
        percent: prev?.percent ?? null,
      }));
    } finally {
      setBusy(false);
      setActiveAction(null);
    }
  }

  async function changeSite(siteId: string) {
    trackEvent("setup_change_site");
    await fetch("/api/app/select-site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId }),
    });
    window.location.reload();
  }

  const siteMetaText = me.lastIndexedAt
    ? `${me.siteName || me.siteId} · Last indexed ${new Date(me.lastIndexedAt).toLocaleString()}`
    : `${me.siteName || me.siteId} · Not indexed yet`;

  const searchEndpoint = me.searchEndpoint || "https://www.talaash.org/search";
  const scriptUrl = me.scriptUrl || "https://www.talaash.org/search.js";
  const siteId = me.siteId || "";
  const searchToken = me.searchToken || "";

  const designerEmbedHtml = `<div
  data-search
  data-search-site="${siteId}"
  data-search-token="${searchToken}"
  data-search-endpoint="${searchEndpoint}"
>
  <input data-search-input type="search" placeholder="Search…" autocomplete="off" />
  <div data-search-answer hidden></div>
  <div data-search-loading hidden>Searching…</div>
  <div data-search-empty hidden>No results found.</div>
  <div data-search-results></div>
  <div data-search-result-source hidden style="display:none!important" aria-hidden="true">
    <a data-search-result href="#">
      <img data-search-result-image alt="" width="88" height="88" />
      <div data-search-result-body>
        <div data-search-result-type></div>
        <div data-search-result-title></div>
        <div data-search-result-snippet></div>
      </div>
    </a>
  </div>
</div>`;

  const scriptTagHtml = `<script
  src="${scriptUrl}"
  data-search-site="${siteId}"
  data-search-token="${searchToken}"
  data-search-endpoint="${searchEndpoint}"
></script>`;

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      trackEvent("setup_copy_embed", { which: key });
      window.setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 2000);
    } catch {
      setScriptNotice("Could not copy — select the snippet and copy manually.");
    }
  }

  const isIndexing = busy && (activeAction === "index" || activeAction === "reindex");
  const showIndexDetails =
    indexProgress &&
    indexProgress.collections.length > 0 &&
    (indexProgress.phase === "indexing" || indexProgress.phase === "success");

  return (
    <>
      <div className="insights-toolbar">
        <div>
          <h2 className="title-sm" style={{ margin: "0 0 4px" }}>
            Setup &amp; index
          </h2>
          <p className="caption text-muted" style={{ margin: 0 }}>
            {siteMetaText}
          </p>
        </div>
        <div className="insights-toolbar__actions">
          <button
            type="button"
            className={`btn btn-secondary btn-sm${refreshing ? " is-loading" : ""}`}
            disabled={loading || refreshing || busy}
            onClick={() => refreshFromWebflow()}
          >
            {refreshing ? (
              <>
                <span className="index-spinner" aria-hidden style={{ marginRight: 8 }} />
                <span className="btn-label">Refreshing…</span>
              </>
            ) : (
              "Refresh fields"
            )}
          </button>
        </div>
      </div>

      {refreshNotice && (
        <p className={`setup-refresh-notice${refreshNotice.includes("Could not") ? " setup-refresh-notice--error" : ""}`}>
          {refreshNotice}
        </p>
      )}

      <p className="caption text-muted mb-lg" style={{ marginTop: refreshNotice ? undefined : 0 }}>
        Field lists load from your saved backend cache — not Webflow on every visit. After changing CMS fields in Webflow, click{" "}
        <strong>Refresh fields</strong> to pull the latest schema, then save mappings and re-index.
      </p>

      <div className="setup-steps-grid mb-lg">
        <div className="setup-step-card setup-step-card--mint">
          <span className="setup-step-card__num">1</span>
          <span className="setup-step-card__label">Map collections</span>
          <span className="setup-step-card__hint">Choose fields to index</span>
        </div>
        <div
          className={`setup-step-card setup-step-card--peach${isIndexing ? " setup-step-card--active" : ""}`}
        >
          <span className="setup-step-card__num">2</span>
          <span className="setup-step-card__label">Index CMS</span>
          <span className="setup-step-card__hint">Build your search index</span>
        </div>
        <div className="setup-step-card setup-step-card--mustard">
          <span className="setup-step-card__num">3</span>
          <span className="setup-step-card__label">Install script</span>
          <span className="setup-step-card__hint">Via Custom Code API</span>
        </div>
      </div>

      <div className="insights-panel mb-lg">
        <div className="insights-panel__head">
          <h3 className="title-sm">Search on your Webflow site</h3>
          <p className="caption text-muted">
            Talaash registers the search script through Webflow’s Custom Code API. You design the
            on-page search UI in the Designer, then publish.
          </p>
        </div>
        <div className="btn-row" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`btn btn-primary${installingScript ? " is-loading" : ""}`}
            disabled={busy || installingScript}
            onClick={async () => {
              setInstallingScript(true);
              setScriptNotice(null);
              trackEvent("setup_install_script");
              try {
                const res = await fetch("/api/app/embed-script", { method: "POST" });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  setScriptNotice(data.error || "Could not install search script.");
                  return;
                }
                setScriptNotice(
                  `Search script v${data.version || "?"} installed (${data.integrityHash || "new hash"}). Publish the Webflow site now — until you publish, the browser keeps blocking the old integrity hash and Enter will do nothing.`
                );
              } catch {
                setScriptNotice("Network error installing search script.");
              } finally {
                setInstallingScript(false);
              }
            }}
          >
            {installingScript ? (
              <>
                <span className="index-spinner" aria-hidden style={{ marginRight: 8 }} />
                <span className="btn-label">Installing…</span>
              </>
            ) : (
              "Reinstall search script"
            )}
          </button>
        </div>
        {scriptNotice && (
          <p className="insights-callout" role="status">
            {scriptNotice}
          </p>
        )}

        <div className="insights-callout mt-md" style={{ marginTop: 16 }}>
          <strong>Do not reuse credentials from another site.</strong> If you copied a search block
          from an older project, delete its old <code>data-search-site</code>,{" "}
          <code>data-search-token</code>, and <code>data-search-endpoint</code> — those values send
          searches to a different dashboard.
        </div>

        <div className="setup-embed-block mt-lg">
          <div className="setup-embed-block__head">
            <div>
              <h4 className="title-sm" style={{ margin: 0 }}>
                1. Designer search layout
              </h4>
              <p className="caption text-muted" style={{ margin: "4px 0 0" }}>
                Paste into a Webflow Embed. Result cards live in a hidden{" "}
                <code>data-search-result-source</code> block (never flash empty). Styles load from{" "}
                <code>search.css</code>. No filter tabs by default — add{" "}
                <code>data-search-filter</code> links only if you need them.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => copyText("designer", designerEmbedHtml)}
            >
              {copiedKey === "designer" ? "Copied" : "Copy HTML"}
            </button>
          </div>
          <pre className="setup-embed-pre">{designerEmbedHtml}</pre>
        </div>

        <div className="setup-embed-block mt-md">
          <div className="setup-embed-block__head">
            <div>
              <h4 className="title-sm" style={{ margin: 0 }}>
                2. Script tag (optional fallback)
              </h4>
              <p className="caption text-muted" style={{ margin: "4px 0 0" }}>
                Prefer <strong>Install search script</strong> above (Custom Code API). Use this only
                if you need a manual footer script — then publish.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => copyText("script", scriptTagHtml)}
            >
              {copiedKey === "script" ? "Copied" : "Copy script"}
            </button>
          </div>
          <pre className="setup-embed-pre">{scriptTagHtml}</pre>
        </div>

        <div className="setup-code-grid mt-md">
          {[
            ["Site ID", siteId],
            ["Search token", searchToken],
            ["Search API", searchEndpoint],
            ["Script URL", scriptUrl],
          ].map(([label, value]) => (
            <div key={String(label)} className="setup-code-row">
              <span className="setup-code-label">{label}</span>
              <code className="setup-code-value">{value}</code>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => copyText(String(label), String(value))}
              >
                {copiedKey === label ? "Copied" : "Copy"}
              </button>
            </div>
          ))}
        </div>

        <div className="insights-callout mt-md" style={{ marginTop: 12 }}>
          <strong>Disconnect cleanup:</strong> Disconnect Webflow removes the Custom Code script
          Talaash applied. Publish the site afterward so removal goes live. You can delete any
          leftover Designer attributes yourself if you no longer want the search layout.
        </div>
      </div>

      <div className="insights-panel mb-lg">
        <div className="insights-panel__head">
          <h3 className="title-sm">Active site</h3>
          <p className="caption text-muted">Switch between connected Webflow sites</p>
        </div>
        <div className="form-field" style={{ margin: 0 }}>
          <label htmlFor="site">Site</label>
          <select
            className="text-input"
            id="site"
            value={me.siteId}
            onChange={(e) => changeSite(e.target.value)}
          >
            {(me.sites ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={disconnecting}
            onClick={async () => {
              if (
                !window.confirm(
                  "Disconnect Webflow? This removes the Custom Code search script Talaash applied, revokes access, and clears the stored token.\n\nPublish your Webflow site afterward so removal goes live. Designer layout attributes are not deleted automatically."
                )
              ) {
                return;
              }
              trackEvent("setup_disconnect");
              setDisconnecting(true);
              try {
                const res = await fetch("/api/app/disconnect", { method: "POST" });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  window.alert(data.error || "Disconnect failed");
                  return;
                }
                window.location.href = "/app";
              } finally {
                setDisconnecting(false);
              }
            }}
          >
            {disconnecting ? "Disconnecting…" : "Disconnect Webflow"}
          </button>
          <a className="caption text-muted" href="/support">
            Setup help
          </a>
        </div>
      </div>

      {loading ? (
        <div className="insights-panel mb-lg skeleton-block">
          <div className="skeleton-line skeleton-line--title" />
        </div>
      ) : (
        collections.map((c, i) => (
          <div key={c.collectionId} className="insights-panel collection-card mb-lg">
            <div className="insights-panel__head insights-panel__head--split">
              <h3 className="title-sm" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={c.enabled}
                  onChange={(e) => updateCollection(i, { enabled: e.target.checked })}
                />
                {c.name}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="gap-summary-pill">
                  {(c.fields ?? []).length} field{(c.fields ?? []).length === 1 ? "" : "s"}
                </span>
                <span className="gap-summary-pill">{c.enabled ? "Enabled" : "Disabled"}</span>
              </div>
            </div>
            <div className="row-2">
              <div className="form-field">
                <label>Content type</label>
                <input
                  className="text-input"
                  value={c.contentType ?? ""}
                  onChange={(e) => updateCollection(i, { contentType: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>URL pattern</label>
                <input
                  className="text-input"
                  value={c.urlPattern ?? ""}
                  onChange={(e) => updateCollection(i, { urlPattern: e.target.value })}
                />
              </div>
            </div>
            <div className="row-2">
              <div className="form-field">
                <label>Title</label>
                <select
                  className="text-input"
                  value={c.mapping.title ?? ""}
                  onChange={(e) => updateMapping(i, "title", e.target.value)}
                >
                  <option value="">—</option>
                  {(c.fields ?? []).map((f) => (
                    <option key={f.slug} value={f.slug}>
                      {f.displayName ?? f.slug}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Excerpt</label>
                <select
                  className="text-input"
                  value={c.mapping.excerpt ?? ""}
                  onChange={(e) => updateMapping(i, "excerpt", e.target.value)}
                >
                  <option value="">—</option>
                  {(c.fields ?? []).map((f) => (
                    <option key={f.slug} value={f.slug}>
                      {f.displayName ?? f.slug}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row-2">
              <div className="form-field">
                <label>Slug</label>
                <select
                  className="text-input"
                  value={c.mapping.slug ?? ""}
                  onChange={(e) => updateMapping(i, "slug", e.target.value)}
                >
                  <option value="">—</option>
                  {(c.fields ?? []).map((f) => (
                    <option key={f.slug} value={f.slug}>
                      {f.displayName ?? f.slug}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Image</label>
                <select
                  className="text-input"
                  value={c.mapping.image ?? ""}
                  onChange={(e) => updateMapping(i, "image", e.target.value)}
                >
                  <option value="">—</option>
                  {(c.fields ?? []).map((f) => (
                    <option key={f.slug} value={f.slug}>
                      {f.displayName ?? f.slug}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row-2">
              <div className="form-field">
                <label>Date</label>
                <select
                  className="text-input"
                  value={c.mapping.date ?? ""}
                  onChange={(e) => updateMapping(i, "date", e.target.value)}
                >
                  <option value="">—</option>
                  {(c.fields ?? []).map((f) => (
                    <option key={f.slug} value={f.slug}>
                      {f.displayName ?? f.slug}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <EmbedFieldPicker
              fields={c.fields ?? []}
              selected={c.mapping.embedFields ?? []}
              onChange={(slugs) => updateEmbedFields(i, slugs)}
              disabled={busy}
            />
          </div>
        ))
      )}

      <div className="insights-panel">
        <div className="insights-panel__head">
          <h3 className="title-sm">Index &amp; save</h3>
          <p className="caption text-muted">Save field mappings, then index or re-index CMS content</p>
        </div>
        <div className="btn-row">
          <button
            type="button"
            className={`btn btn-primary${activeAction === "save" ? " is-loading" : ""}`}
            disabled={busy}
            onClick={async () => {
              trackEvent("setup_save_mappings");
              setBusy(true);
              setActiveAction("save");
              setIndexProgress({
                phase: "saving",
                mode: "save",
                message: "Saving field mappings…",
                collections: [],
                totalProcessed: 0,
                totalChunks: 0,
                percent: null,
              });
              try {
                await saveMaps();
                setIndexProgress({
                  phase: "success",
                  mode: "save",
                  message: "Field mappings saved.",
                  collections: [],
                  totalProcessed: 0,
                  totalChunks: 0,
                  percent: null,
                });
              } catch (err) {
                setIndexProgress({
                  phase: "error",
                  mode: "save",
                  message: err instanceof Error ? err.message : "Save failed",
                  collections: [],
                  totalProcessed: 0,
                  totalChunks: 0,
                  percent: null,
                });
              } finally {
                setBusy(false);
                setActiveAction(null);
              }
            }}
          >
            {activeAction === "save" ? (
              <>
                <span className="index-spinner" aria-hidden style={{ marginRight: 8 }} />
                <span className="btn-label">Saving…</span>
              </>
            ) : (
              "Save mappings"
            )}
          </button>
          <button
            type="button"
            className={`btn btn-secondary${activeAction === "index" ? " is-loading" : ""}`}
            disabled={busy}
            onClick={() => indexAll(false)}
          >
            {activeAction === "index" ? (
              <>
                <span className="index-spinner" aria-hidden style={{ marginRight: 8 }} />
                <span className="btn-label">Indexing…</span>
              </>
            ) : (
              "Index CMS"
            )}
          </button>
          <button
            type="button"
            className={`btn btn-secondary${activeAction === "reindex" ? " is-loading" : ""}`}
            disabled={busy}
            onClick={() => indexAll(true)}
          >
            {activeAction === "reindex" ? (
              <>
                <span className="index-spinner" aria-hidden style={{ marginRight: 8 }} />
                <span className="btn-label">Re-indexing…</span>
              </>
            ) : (
              "Re-index"
            )}
          </button>
        </div>

        {indexProgress && (
          <div
            className={`index-progress${
              indexProgress.phase === "success" ? " index-progress--success" : ""
            }${indexProgress.phase === "error" ? " index-progress--error" : ""}`}
            role="status"
            aria-live="polite"
          >
            <div className="index-progress__head">
              {(indexProgress.phase === "saving" || indexProgress.phase === "indexing") && (
                <span className="index-spinner" aria-hidden />
              )}
              {indexProgress.phase === "success" && <StatusIcon status="done" />}
              {indexProgress.phase === "error" && (
                <svg className="index-status-icon" viewBox="0 0 16 16" fill="none" aria-hidden style={{ color: "var(--color-signature-coral)" }}>
                  <path d="M8 5v4M8 11.5v.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              )}
              <p className="index-progress__title">{indexProgress.message}</p>
            </div>

            {showIndexDetails && (
              <>
                <div className="index-progress__bar" aria-hidden>
                  <div
                    className={`index-progress__fill${
                      indexProgress.percent == null && indexProgress.phase === "indexing"
                        ? " index-progress__fill--indeterminate"
                        : ""
                    }`}
                    style={
                      indexProgress.percent != null
                        ? { width: `${indexProgress.percent}%` }
                        : undefined
                    }
                  />
                </div>
                {(indexProgress.totalProcessed > 0 || indexProgress.totalChunks > 0) && (
                  <p className="index-progress__meta">
                    {indexProgress.totalProcessed} item
                    {indexProgress.totalProcessed === 1 ? "" : "s"}
                    {indexProgress.totalChunks > 0 &&
                      ` · ${indexProgress.totalChunks} chunk${indexProgress.totalChunks === 1 ? "" : "s"} embedded`}
                    {indexProgress.percent != null && indexProgress.phase === "indexing" &&
                      ` · ${indexProgress.percent}%`}
                  </p>
                )}
                <ul className="index-progress__collections">
                  {indexProgress.collections.map((row) => (
                    <li
                      key={row.collectionId}
                      className={`index-progress__row${
                        row.status === "indexing" ? " index-progress__row--active" : ""
                      }${row.status === "done" ? " index-progress__row--done" : ""}`}
                    >
                      <span className="index-progress__row-name">
                        <StatusIcon status={row.status} />
                        <span>{row.name}</span>
                      </span>
                      <span className="index-progress__row-stat">{formatCollectionStat(row)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
