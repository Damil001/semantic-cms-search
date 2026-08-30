"use client";

import { useCallback, useEffect, useState } from "react";
import type { Collection, MeResponse } from "@/lib/types";

interface Props {
  me: MeResponse;
  onSiteMetaChange: (text: string) => void;
}

type CollectionDraft = Collection & { mapping: Record<string, string> };

export function SetupTab({ me, onSiteMetaChange }: Props) {
  const [collections, setCollections] = useState<CollectionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function indexAll(reindex = false) {
    setBusy(true);
    setLog(reindex ? "Re-indexing…" : "Indexing…");
    try {
      await saveMaps();
      const enabled = readMaps().filter((m) => m.enabled);
      let n = 0;
      for (const m of enabled) {
        let offset = 0;
        let done = false;
        while (!done) {
          setLog(`Indexing ${m.collectionName || m.collectionId} @ ${offset}…`);
          const res = await fetch("/api/app/index", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ collectionId: m.collectionId, offset }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Index failed");
          n += data.processed || 0;
          offset = data.nextOffset;
          done = data.done;
        }
      }
      setLog(`Done. Indexed ${n} items.`);
      onSiteMetaChange(
        me.lastIndexedAt
          ? `${me.siteName || me.siteId} · Last indexed ${new Date().toLocaleString()}`
          : `${me.siteName || me.siteId} · Indexed just now`
      );
    } catch (err) {
      setLog(err instanceof Error ? err.message : "Index failed");
    } finally {
      setBusy(false);
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
        <div className="setup-step-card setup-step-card--peach">
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
            className="btn btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await saveMaps();
                setLog("Mappings saved.");
              } catch (err) {
                setLog(err instanceof Error ? err.message : "Save failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save mappings
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => indexAll(false)}
          >
            Index CMS
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => indexAll(true)}
          >
            Re-index
          </button>
        </div>
        {log && <p className="status-line mt-md">{log}</p>}
      </div>
    </>
  );
}
