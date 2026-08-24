import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getInstall } from "../../src/app/session.js";
import { getSite, listSites } from "../../src/app/webflow-admin.js";
import { getServiceClient } from "../../src/lib/supabase.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const install = await getInstall(req);
  if (!install) {
    res.status(401).json({ error: "Connect Webflow first" });
    return;
  }

  const siteId = String(req.body?.siteId ?? "");
  if (!siteId) {
    res.status(400).json({ error: "siteId required" });
    return;
  }

  const sites = await listSites(install.access_token);
  if (!sites.some((s) => s.id === siteId)) {
    res.status(403).json({ error: "Site not on this Webflow token" });
    return;
  }
  const site = await getSite(install.access_token, siteId);
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("webflow_installs")
    .update({
      site_id: siteId,
      site_name: site.displayName ?? site.shortName ?? siteId,
      short_name: site.shortName ?? null,
      preview_url: site.previewUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", install.id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ ok: true, siteId });
}
