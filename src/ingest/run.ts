import { WEBFLOW_COLLECTIONS } from "../config/webflow.js";
import { fetchCollectionItems } from "./webflow-api.js";
import { mapCmsItem, upsertItemWithChunks } from "./upsert.js";

export async function ingestWebflow(): Promise<void> {
  const token = process.env.WEBFLOW_TOKEN;
  if (!token) {
    throw new Error(
      "WEBFLOW_TOKEN is not set. Prefer the hosted app at /app (Connect Webflow) instead of a static token."
    );
  }

  const siteId = process.env.WEBFLOW_SITE_ID ?? null;

  const placeholders = WEBFLOW_COLLECTIONS.filter((c) =>
    c.collectionId.startsWith("REPLACE_")
  );
  if (placeholders.length > 0) {
    console.warn(
      "Warning: collection IDs still look like placeholders. Use /app to map collections from the live CMS."
    );
  }

  let items = 0;
  let chunks = 0;

  for (const config of WEBFLOW_COLLECTIONS) {
    if (config.collectionId.startsWith("REPLACE_")) {
      console.warn(`Skipping ${config.contentType}: set collectionId first`);
      continue;
    }

    console.log(`Fetching ${config.contentType} (${config.collectionId})…`);
    const cmsItems = await fetchCollectionItems(token, config.collectionId);
    console.log(`  ${cmsItems.length} items`);

    for (const raw of cmsItems) {
      const mapped = mapCmsItem(config, raw, siteId);
      const n = await upsertItemWithChunks(mapped);
      items += 1;
      chunks += n;
      console.log(`  indexed ${mapped.id} (${n} chunks)`);
    }
  }

  console.log(`Done. ${items} items, ${chunks} chunks.`);
}
