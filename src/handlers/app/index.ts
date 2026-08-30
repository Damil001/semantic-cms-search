import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { CollectionConfig } from "../../config/webflow.js";
import { requireAuthInstall } from "../../app/guard.js";
import { fetchCollectionPage } from "../../ingest/webflow-api.js";
import { mapCmsItem, upsertItemWithChunks } from "../../ingest/upsert.js";
import { getServiceClient } from "../../lib/supabase.js";

export const config = { maxDuration: 60 };

const BATCH = 4;

type FieldMap = {
  title: string;
  body: string;
  excerpt: string;
  slug: string;
  image: string;
  date: string;
};

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

  const collectionId = String(req.body?.collectionId ?? "");
  const offset = Number(req.body?.offset ?? 0);
  if (!collectionId) {
    res.status(400).json({ error: "collectionId required" });
    return;
  }

  const supabase = getServiceClient();
  const { data: mapRow, error: mapErr } = await supabase
    .from("webflow_collection_maps")
    .select("*")
    .eq("site_id", install.site_id)
    .eq("collection_id", collectionId)
    .maybeSingle();
  if (mapErr || !mapRow || !mapRow.enabled) {
    res.status(400).json({ error: "Save and enable this collection first" });
    return;
  }

  const fields = mapRow.fields as FieldMap;
  const config: CollectionConfig = {
    collectionId,
    contentType: mapRow.content_type as string,
    urlPattern: mapRow.url_pattern as string,
    fields: {
      title: fields.title || "name",
      body: fields.body || "name",
      excerpt: fields.excerpt || "",
      slug: fields.slug || "slug",
      image: fields.image || "",
      date: fields.date || "",
    },
  };

  const page = await fetchCollectionPage(
    install.access_token,
    collectionId,
    offset,
    BATCH
  );

  let chunks = 0;
  for (const raw of page.items) {
    chunks += await upsertItemWithChunks(
      mapCmsItem(config, raw, install.site_id)
    );
  }

  const nextOffset = offset + page.items.length;
  const done =
    page.items.length < BATCH ||
    (page.total != null && nextOffset >= page.total);

  if (done) {
    await supabase
      .from("webflow_installs")
      .update({ last_indexed_at: new Date().toISOString() })
      .eq("id", install.id);
  }

  res.status(200).json({
    processed: page.items.length,
    chunks,
    nextOffset,
    total: page.total,
    done,
  });
}
