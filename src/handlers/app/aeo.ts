import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuthInstall } from "../../app/guard.js";
import { buildAeoReport } from "../../analytics/aeo.js";
import { loadInstallReport, saveInstallReport } from "../../app/report-cache.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "GET only" });
    return;
  }

  const ctx = await requireAuthInstall(req, res);
  if (!ctx) return;

  const daysRaw = typeof req.query.days === "string" ? req.query.days : "30";
  const days = Math.min(Math.max(Number.parseInt(daysRaw, 10) || 30, 7), 90);
  const refresh =
    req.query.refresh === "1" ||
    req.query.refresh === "true" ||
    req.query.force === "1";

  try {
    if (!refresh) {
      const cached = await loadInstallReport(ctx.install.id, "aeo");
      if (cached) {
        const report =
          cached.report && typeof cached.report === "object"
            ? (cached.report as Record<string, unknown>)
            : {};
        res.status(200).json({
          ...report,
          cached: true,
          savedAt: cached.savedAt,
        });
        return;
      }
    }

    const report = await Promise.race([
      buildAeoReport(ctx.install.site_id, days),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AEO analysis timed out")), 45_000)
      ),
    ]);

    await saveInstallReport(ctx.install.id, "aeo", report);
    res.status(200).json({ ...report, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AEO analysis failed";
    console.error("aeo error", message);
    res.status(500).json({ error: message });
  }
}
