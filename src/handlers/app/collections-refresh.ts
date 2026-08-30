import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  fetchWebflowCollectionDetails,
  installOrigin,
  loadCachedCollections,
  syncWebflowSchemasToDb,
} from "../../app/collection-schema.js";
import { requireAuthInstall } from "../../app/guard.js";

/** POST — pull fresh collection schemas from Webflow and save to Supabase. */
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
  const install = ctx.install;

  try {
    const { origin, collections } = await fetchWebflowCollectionDetails(
      install.access_token,
      install.site_id
    );
    const { synced, newFieldCount } = await syncWebflowSchemasToDb(
      install.site_id,
      origin || installOrigin(install),
      collections
    );
    const payload = await loadCachedCollections(
      install.site_id,
      origin || installOrigin(install)
    );

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ...payload,
      cached: false,
      synced,
      newFieldCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webflow refresh failed";
    res.status(500).json({ error: message });
  }
}
