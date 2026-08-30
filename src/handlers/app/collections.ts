import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuthInstall } from "../../app/guard.js";
import {
  getCollection,
  getSite,
  guessFields,
  listCollections,
  publicSiteOrigin,
} from "../../app/webflow-admin.js";
import { getServiceClient } from "../../lib/supabase.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const ctx = await requireAuthInstall(req, res);
  if (!ctx) return;
  const install = ctx.install;

  const token = install.access_token;
  const site = await getSite(token, install.site_id);
  const origin = publicSiteOrigin(site);

  const collections = await listCollections(token, install.site_id);
  const detailed = await Promise.all(
    collections.map((c) => getCollection(token, c.id).catch(() => c))
  );

  const supabase = getServiceClient();
  const { data: saved } = await supabase
    .from("webflow_collection_maps")
    .select("*")
    .eq("site_id", install.site_id);
  const byId = new Map(
    (saved ?? []).map((row) => [row.collection_id as string, row])
  );

  const payload = detailed.map((col) => {
    const existing = byId.get(col.id);
    const guessed = guessFields(col.fields);
    const slug = col.slug || "page";
    return {
      collectionId: col.id,
      name: col.displayName,
      slug,
      fields: col.fields ?? [],
      contentType: (existing?.content_type as string) || slug,
      enabled: existing?.enabled ?? true,
      urlPattern:
        (existing?.url_pattern as string) || `${origin}/${slug}/{slug}`,
      mapping: (existing?.fields as Record<string, string>) || guessed,
    };
  });

  res.status(200).json({ collections: payload, origin });
}
