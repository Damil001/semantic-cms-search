"use client";

import type { PromptAnalytics } from "@/lib/types";
import { fmtChange } from "@/lib/format";
import { SparklineChart } from "@/components/charts/AnalyticsCharts";

const STAT_META = [
  {
    key: "totalPrompts",
    label: "Total prompts",
    surface: "peach",
    color: "#c45a20",
    scroll: "#contentGapsPanel",
  },
  {
    key: "uniquePrompts",
    label: "Unique prompts",
    surface: "mint",
    color: "#2d8a5e",
    scroll: "#newReturningPanel",
  },
  {
    key: "searchesPerVisitor",
    label: "Searches / visitor",
    surface: "mustard",
    color: "#9a7200",
    scroll: "#volumePanel",
  },
  {
    key: "searchesPerSession",
    label: "Searches / session",
    surface: "cream",
    color: "#6b5a45",
    scroll: "#volumePanel",
  },
] as const;

const SVG_PROPS = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function StatIcon({ iconKey }: { iconKey: (typeof STAT_META)[number]["key"] }) {
  switch (iconKey) {
    case "totalPrompts":
      return (
        <svg {...SVG_PROPS}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "uniquePrompts":
      return (
        <svg {...SVG_PROPS}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    case "searchesPerVisitor":
      return (
        <svg {...SVG_PROPS}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "searchesPerSession":
      return (
        <svg {...SVG_PROPS}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
  }
}

export function StatCards({ data }: { data: PromptAnalytics }) {
  const metrics = [
    data.totalPrompts,
    data.uniquePrompts,
    data.searchesPerVisitor,
    data.searchesPerSession,
  ];

  const scrollTo = (sel: string) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    el.classList.add("insights-panel--highlight");
    window.setTimeout(() => el.classList.remove("insights-panel--highlight"), 1200);
  };

  return (
    <div className="prompt-stat-grid mb-lg">
      {STAT_META.map((meta, i) => {
        const m = metrics[i];
        const change = fmtChange(m);
        const spark =
          data.statSparklines?.[meta.key] ?? data.volumeOverTime ?? [];
        return (
          <button
            key={meta.key}
            type="button"
            className={`insights-stat-card insights-stat-card--${meta.surface}`}
            style={{ ["--stat-i" as string]: i }}
            onClick={() => scrollTo(meta.scroll)}
          >
            <div className="insights-stat-card__shine" aria-hidden="true" />
            <div className="insights-stat-card__top">
              <span className="insights-stat-card__icon">
                <StatIcon iconKey={meta.key} />
              </span>
              <span className="insights-stat-card__label">{meta.label}</span>
            </div>
            <div className="insights-stat-card__value">{m?.display ?? "—"}</div>
            <div className="insights-stat-card__foot">
              <div className="insights-stat-card__change">
                <span className={change.className}>{change.label}</span>
              </div>
              <SparklineChart points={spark} color={meta.color} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
