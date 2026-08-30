"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { fmtShortDate } from "@/lib/format";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
);

interface Point {
  date: string;
  count: number;
}

export function VolumeChart({ points }: { points: Point[] }) {
  const hasData = points.some((p) => p.count > 0);
  if (!hasData) {
    return (
      <p className="prompt-chart-empty">No volume data yet for this period.</p>
    );
  }

  return (
    <div className="prompt-chart-wrap">
      <Line
        data={{
          labels: points.map((p) => fmtShortDate(p.date)),
          datasets: [
            {
              label: "Prompts",
              data: points.map((p) => p.count),
              borderColor: "#181d26",
              backgroundColor: "rgba(24, 29, 38, 0.1)",
              fill: true,
              tension: 0.38,
              borderWidth: 2.5,
              pointRadius: points.map((p) => (p.count > 0 ? 4 : 0)),
              pointHoverRadius: 6,
              pointBackgroundColor: "#181d26",
              pointBorderColor: "#ffffff",
              pointBorderWidth: 2,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: "index" },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#181d26",
              displayColors: false,
              callbacks: {
                title: (items) => points[items[0]?.dataIndex ?? 0]?.date ?? "",
                label: (item) =>
                  `${item.raw} prompt${item.raw === 1 ? "" : "s"}`,
              },
            },
          },
          scales: {
            x: { grid: { display: false }, border: { display: false } },
            y: { beginAtZero: true, border: { display: false } },
          },
        }}
      />
    </div>
  );
}

export function SparklineChart({
  points,
  color,
}: {
  points: Point[];
  color: string;
}) {
  const values = points.map((p) => p.count);
  if (!values.some((v) => v > 0)) return null;

  return (
    <div className="insights-stat-card__spark">
      <Line
        data={{
          labels: values.map((_, i) => i),
          datasets: [
            {
              data: values,
              borderColor: color,
              backgroundColor: `${color}22`,
              fill: true,
              tension: 0.42,
              borderWidth: 2,
              pointRadius: 0,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false, min: 0 } },
        }}
      />
    </div>
  );
}
