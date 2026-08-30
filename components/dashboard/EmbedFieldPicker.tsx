"use client";

import { useMemo, useState } from "react";
import type { CollectionField } from "@/lib/types";

const TEXT_TYPES = new Set(["PlainText", "RichText"]);
const NON_EMBED_TYPES = new Set([
  "Image",
  "MultiImage",
  "File",
  "ExtFileRef",
  "VideoLink",
  "Reference",
  "MultiReference",
  "Color",
]);

export function isEmbeddableFieldType(type?: string): boolean {
  if (!type) return true;
  return !NON_EMBED_TYPES.has(type);
}

interface Props {
  fields: CollectionField[];
  selected: string[];
  onChange: (slugs: string[]) => void;
  disabled?: boolean;
}

function fieldLabel(field: CollectionField): string {
  return field.displayName ?? field.slug;
}

export function EmbedFieldPicker({ fields, selected, onChange, disabled }: Props) {
  const [expanded, setExpanded] = useState(fields.length <= 10);
  const [filter, setFilter] = useState("");

  const embeddable = useMemo(
    () => fields.filter((f) => isEmbeddableFieldType(f.type)),
    [fields]
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter(
      (f) =>
        f.slug.toLowerCase().includes(q) ||
        (f.displayName ?? "").toLowerCase().includes(q) ||
        (f.type ?? "").toLowerCase().includes(q)
    );
  }, [fields, filter]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedEmbeddableCount = embeddable.filter((f) => selectedSet.has(f.slug)).length;

  function toggle(slug: string) {
    if (disabled) return;
    if (selectedSet.has(slug)) {
      onChange(selected.filter((s) => s !== slug));
    } else {
      onChange([...selected, slug]);
    }
  }

  function selectSlugs(slugs: string[]) {
    if (disabled) return;
    onChange(slugs);
  }

  return (
    <div className="embed-field-picker">
      <div className="embed-field-picker__head">
        <div>
          <label className="embed-field-picker__label">Searchable fields</label>
          <p className="caption text-muted" style={{ margin: "2px 0 0" }}>
            Selected fields are combined and embedded for semantic search.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm embed-field-picker__toggle"
          disabled={disabled}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide" : "Show"} fields
        </button>
      </div>

      <div className="embed-field-picker__summary">
        <span className="gap-summary-pill">
          {selectedEmbeddableCount} of {embeddable.length} embeddable selected
        </span>
        {fields.length > embeddable.length && (
          <span className="caption text-muted">
            {fields.length - embeddable.length} media/reference field
            {fields.length - embeddable.length === 1 ? "" : "s"} skipped
          </span>
        )}
      </div>

      {expanded && (
        <>
          <div className="embed-field-picker__toolbar">
            <input
              type="search"
              className="text-input embed-field-picker__search"
              placeholder="Filter fields…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              disabled={disabled}
            />
            <div className="embed-field-picker__actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={disabled}
                onClick={() => selectSlugs(embeddable.map((f) => f.slug))}
              >
                Select all
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={disabled}
                onClick={() =>
                  selectSlugs(fields.filter((f) => TEXT_TYPES.has(f.type ?? "")).map((f) => f.slug))
                }
              >
                Text only
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={disabled}
                onClick={() => selectSlugs([])}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="embed-field-picker__grid" role="group" aria-label="Searchable CMS fields">
            {filtered.length === 0 ? (
              <p className="caption text-muted embed-field-picker__empty">No fields match your filter.</p>
            ) : (
              filtered.map((field) => {
                const on = selectedSet.has(field.slug);
                const embeddableField = isEmbeddableFieldType(field.type);
                return (
                  <button
                    key={field.slug}
                    type="button"
                    className={`embed-field-chip${on ? " embed-field-chip--on" : ""}${
                      !embeddableField ? " embed-field-chip--muted" : ""
                    }`}
                    disabled={disabled || !embeddableField}
                    title={
                      embeddableField
                        ? `${fieldLabel(field)} (${field.type ?? "Field"})`
                        : `${fieldLabel(field)} — not used for embeddings`
                    }
                    onClick={() => toggle(field.slug)}
                  >
                    <span className="embed-field-chip__check" aria-hidden>
                      {on ? "✓" : ""}
                    </span>
                    <span className="embed-field-chip__name">{fieldLabel(field)}</span>
                    {field.type && (
                      <span className="embed-field-chip__type">{field.type}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
