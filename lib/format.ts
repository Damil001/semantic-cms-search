import type { MetricWithChange } from "./types";

export function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;");
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function fmtShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fmtChange(m?: MetricWithChange | null): {
  label: string;
  className: string;
} {
  if (!m || m.changePercent == null) {
    return { label: "— vs prev", className: "trend-badge trend-badge--neutral" };
  }
  const arrow = m.direction === "up" ? "↑" : m.direction === "down" ? "↓" : "→";
  const cls =
    m.direction === "up"
      ? "trend-badge--up"
      : m.direction === "down"
        ? "trend-badge--down"
        : "trend-badge--neutral";
  return {
    label: `${arrow} ${Math.abs(m.changePercent)}%`,
    className: `trend-badge ${cls}`,
  };
}

export function trendBadge(pct: number | null): {
  label: string;
  className: string;
} {
  if (pct == null) return { label: "—", className: "trend-badge trend-badge--neutral" };
  if (pct >= 0) {
    return {
      label: `↑ ${Math.abs(pct)}%`,
      className: "trend-badge trend-badge--up",
    };
  }
  return {
    label: `↓ ${Math.abs(pct)}%`,
    className: "trend-badge trend-badge--down",
  };
}

export function relativeUpdatedTime(fetchedAt: number): string {
  if (!fetchedAt) return "";
  const sec = Math.floor((Date.now() - fetchedAt) / 1000);
  if (sec < 15) return "Updated just now";
  if (sec < 60) return `Updated ${sec}s ago`;
  if (sec < 3600) return `Updated ${Math.floor(sec / 60)} min ago`;
  return `Updated ${fmtDate(new Date(fetchedAt).toISOString())}`;
}
