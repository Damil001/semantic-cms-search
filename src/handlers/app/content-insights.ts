import type { VercelRequest, VercelResponse } from "@vercel/node";
import { analyzeSearchQueries } from "../../analytics/analyze.js";
import { requireAuthInstall } from "../../app/guard.js";
import { loadInstallReport, saveInstallReport } from "../../app/report-cache.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const ctx = await requireAuthInstall(req, res);
  if (!ctx) return;

  if (req.method === "GET") {
    const cached = await loadInstallReport(ctx.install.id, "content_insights");
    if (!cached) {
      res.status(200).json({ cached: false, report: null });
      return;
    }
    res.status(200).json({
      cached: true,
      savedAt: cached.savedAt,
      report: cached.report,
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "GET or POST only" });
    return;
  }

  try {
    const insights = await analyzeSearchQueries(ctx.install.site_id);
    await saveInstallReport(ctx.install.id, "content_insights", insights);
    res.status(200).json(insights);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("content-insights error", message);
    res.status(500).json({ error: message });
  }
}
