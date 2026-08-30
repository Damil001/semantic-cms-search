import type { VercelRequest, VercelResponse } from "@vercel/node";
import { installOrigin, loadCachedCollections } from "../../app/collection-schema.js";
import { requireAuthInstall } from "../../app/guard.js";

/** GET — return cached CMS field schemas from Supabase (no Webflow calls). */
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
  const install = ctx.install;
  const origin = installOrigin(install);

  try {
    const payload = await loadCachedCollections(install.site_id, origin);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load collections";
    res.status(500).json({ error: message });
  }
}
