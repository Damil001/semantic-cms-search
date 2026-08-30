import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthUser } from "../../app/auth.js";
import { getInstallForUser } from "../../app/session.js";
import { getSite, listSites } from "../../app/webflow-admin.js";
import { getServiceClient } from "../../lib/supabase.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "Log in first" });
    return;
  }

  const install = await getInstallForUser(req, user.id);
  if (!install) {
    res.status(401).json({ error: "Connect a Webflow site first" });
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
    .eq("id", install.id)
    .eq("user_id", user.id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ ok: true, siteId });
}
