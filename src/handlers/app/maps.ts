import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuthInstall } from "../../app/guard.js";
import { getServiceClient } from "../../lib/supabase.js";

interface MapBody {
  collectionId: string;
  contentType: string;
  enabled: boolean;
  urlPattern: string;
  mapping: Record<string, unknown>;
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
  const ctx = await requireAuthInstall(req, res);
  if (!ctx) return;
  const install = ctx.install;
  const maps = (req.body?.maps ?? []) as MapBody[];
  const supabase = getServiceClient();

  const { data: existingRows } = await supabase
    .from("webflow_collection_maps")
    .select("collection_id, cms_fields, cms_fields_synced_at")
    .eq("site_id", install.site_id);
  const schemaById = new Map(
    (existingRows ?? []).map((row) => [
      row.collection_id as string,
      {
        cms_fields: row.cms_fields,
        cms_fields_synced_at: row.cms_fields_synced_at as string | null,
      },
    ])
  );

  const rows = maps.map((m) => {
    const cached = schemaById.get(m.collectionId);
    return {
      site_id: install.site_id,
      collection_id: m.collectionId,
      collection_name: m.collectionName ?? null,
      content_type: m.contentType || "cms",
      enabled: Boolean(m.enabled),
      url_pattern: m.urlPattern,
      fields: m.mapping ?? {},
      cms_fields: cached?.cms_fields ?? [],
      cms_fields_synced_at: cached?.cms_fields_synced_at ?? null,
    };
  });
  const { error } = await supabase.from("webflow_collection_maps").upsert(rows, {
    onConflict: "site_id,collection_id",
  });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(200).json({ ok: true });
}
