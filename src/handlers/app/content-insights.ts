import type { VercelRequest, VercelResponse } from "@vercel/node";
import { analyzeSearchQueries } from "../../analytics/analyze.js";
import { requireAuthInstall } from "../../app/guard.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  const ctx = await requireAuthInstall(req, res);
  if (!ctx) return;

  try {
    const insights = await analyzeSearchQueries(ctx.install.site_id);
    res.status(200).json(insights);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("content-insights error", message);
    res.status(500).json({ error: message });
  }
}
