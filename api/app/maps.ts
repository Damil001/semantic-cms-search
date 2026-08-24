import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getInstall } from "../../src/app/session.js";
import { getServiceClient } from "../../src/lib/supabase.js";

interface MapBody {
  collectionId: string;
  contentType: string;
  enabled: boolean;
  urlPattern: string;
  mapping: Record<string, string>;
  collectionName?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "PUT") {
    res.status(405).json({ error: "PUT only" });
    return;
  }
  const install = await getInstall(req);
  if (!install) {
    res.status(401).json({ error: "Connect Webflow first" });
    return;
  }
  const maps = (req.body?.maps ?? []) as MapBody[];
  const supabase = getServiceClient();
  const rows = maps.map((m) => ({
    site_id: install.site_id,
    collection_id: m.collectionId,
    collection_name: m.collectionName ?? null,
    content_type: m.contentType || "cms",
    enabled: Boolean(m.enabled),
    url_pattern: m.urlPattern,
    fields: m.mapping ?? {},
  }));
  const { error } = await supabase.from("webflow_collection_maps").upsert(rows, {
    onConflict: "site_id,collection_id",
  });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(200).json({ ok: true });
}
