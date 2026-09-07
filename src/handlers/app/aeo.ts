import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuthInstall } from "../../app/guard.js";
import { buildAeoReport } from "../../analytics/aeo.js";

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

  try {
    const report = await Promise.race([
      buildAeoReport(ctx.install.site_id, days),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AEO analysis timed out")), 45_000)
      ),
    ]);
    res.status(200).json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AEO analysis failed";
    console.error("aeo error", message);
    res.status(500).json({ error: message });
  }
}
