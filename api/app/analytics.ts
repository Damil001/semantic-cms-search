import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthUser } from "../../src/app/auth.js";
import { getInstallForUser } from "../../src/app/session.js";
import { getSearchAnalytics } from "../../src/analytics/summary.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "GET only" });
    return;
  }

  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "Log in first" });
    return;
  }

  const install = await getInstallForUser(req, user.id);
  if (!install) {
    res.status(400).json({ error: "Connect a Webflow site first" });
    return;
  }

  const daysRaw = typeof req.query.days === "string" ? req.query.days : "30";
  const days = Math.min(Math.max(Number.parseInt(daysRaw, 10) || 30, 1), 90);

  try {
    const analytics = await getSearchAnalytics(install.site_id, days);
    res.status(200).json(analytics);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analytics failed";
    res.status(500).json({ error: message });
  }
}
