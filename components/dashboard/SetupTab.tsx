"use client";

import { useCallback, useEffect, useState } from "react";
import type { Collection, MeResponse } from "@/lib/types";

interface Props {
  me: MeResponse;
  onSiteMetaChange: (text: string) => void;
}

type CollectionDraft = Collection & { mapping: Record<string, string> };

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

export function SetupTab({ me, onSiteMetaChange }: Props) {
  const [collections, setCollections] = useState<CollectionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeAction, setActiveAction] = useState<"save" | "index" | "reindex" | null>(null);
  const [indexProgress, setIndexProgress] = useState<IndexProgress | null>(null);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/app/collections");
      if (!res.ok) return;
      const data = await res.json();
      setCollections(
        (data.collections ?? []).map((c: Collection) => ({
          ...c,
          mapping: { ...c.mapping },
        }))
      );
    } finally {
      setLoading(false);
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

  function updateMapping(i: number, field: string, value: string) {
    setCollections((prev) =>
      prev.map((c, idx) =>
        idx === i ? { ...c, mapping: { ...c.mapping, [field]: value } } : c
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
      </div>

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
          <span className="setup-step-card__label">Embed widget</span>
          <span className="setup-step-card__hint">Add script to Webflow</span>
        </div>
      </div>

      <div className="insights-panel mb-lg">
        <div className="insights-panel__head">
          <h3 className="title-sm">Embed on your site</h3>
          <p className="caption text-muted">Add the search script to your Webflow project</p>
        </div>
        <div className="setup-code-grid">
          {[
            ["Search URL", me.searchEndpoint],
            ["Script", me.scriptUrl],
            ["data-search-site", me.siteId],
            ["data-search-token", me.searchToken],
          ].map(([label, value]) => (
            <div key={String(label)} className="setup-code-row">
              <span className="setup-code-label">{label}</span>
              <code className="setup-code-value">{value}</code>
            </div>
          ))}
        </div>
        <p className="insights-callout">
          Optional: add an empty element with <code>data-search-answer</code> above your results list for AI intro text. Autocomplete runs automatically while typing.
        </p>
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
              <span className="gap-summary-pill">{c.enabled ? "Enabled" : "Disabled"}</span>
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
                <label>Body</label>
                <select
                  className="text-input"
                  value={c.mapping.body ?? ""}
                  onChange={(e) => updateMapping(i, "body", e.target.value)}
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
            </div>
            <div className="row-2">
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
