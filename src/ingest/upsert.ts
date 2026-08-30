import type { CollectionConfig } from "../config/webflow.js";
import { chunksForItem } from "../lib/chunk.js";
import { embedTexts } from "../lib/embeddings.js";
import { stripHtml } from "../lib/html.js";
import { getServiceClient } from "../lib/supabase.js";
import { makeItemId } from "../types.js";
import {
  fieldDate,
  fieldImageUrl,
  fieldString,
  fieldValueForSearch,
  type WebflowItem,
} from "./webflow-api.js";

const SOURCE = "webflow";

function buildUrl(pattern: string, slug: string): string {
  return pattern.replaceAll("{slug}", encodeURIComponent(slug));
}

function buildEmbedBody(
  fieldData: Record<string, unknown>,
  embedSlugs: string[]
): string {
  const parts: string[] = [];
  for (const slug of embedSlugs) {
    const text = stripHtml(fieldValueForSearch(fieldData, slug)).trim();
    if (text) parts.push(text);
  }
  return parts.join("\n\n");
}

export function mapCmsItem(
  config: CollectionConfig,
  item: WebflowItem,
  siteId: string | null
) {
  const fd = item.fieldData ?? {};
  const title = fieldString(fd, config.fields.title) || "Untitled";
  const excerptRaw = fieldString(fd, config.fields.excerpt);
  const slug = fieldString(fd, config.fields.slug) || item.id;

  const embedSlugs =
    config.embedFields && config.embedFields.length > 0
      ? config.embedFields
      : config.fields.body
        ? [config.fields.body]
        : [];

  let body = buildEmbedBody(fd, embedSlugs);
  if (!body && config.fields.body) {
    body = stripHtml(fieldString(fd, config.fields.body));
  }

  const excerpt = stripHtml(excerptRaw) || body.slice(0, 240) || null;

  return {
    id: makeItemId(SOURCE, config.collectionId, item.id),
    source: SOURCE,
    site_id: siteId,
    content_type: config.contentType,
    title,
    excerpt,
    url: buildUrl(config.urlPattern, slug),
    image_url: fieldImageUrl(fd, config.fields.image),
    published_at: fieldDate(fd, config.fields.date),
    updated_at: item.lastUpdated ?? new Date().toISOString(),
    body,
  };
}

export async function upsertItemWithChunks(
  mapped: ReturnType<typeof mapCmsItem>
): Promise<number> {
  const supabase = getServiceClient();
  const { body, ...itemRow } = mapped;

  const { error: itemError } = await supabase
    .from("content_items")
    .upsert(itemRow, { onConflict: "id" });
  if (itemError) {
    throw new Error(`Upsert item ${itemRow.id}: ${itemError.message}`);
  }

  const texts = chunksForItem(itemRow.title, body);
  const embeddings = await embedTexts(texts);

  const { error: delError } = await supabase
    .from("content_chunks")
    .delete()
    .eq("item_id", itemRow.id);
  if (delError) {
    throw new Error(`Delete chunks ${itemRow.id}: ${delError.message}`);
  }

  if (texts.length === 0) return 0;

  const rows = texts.map((content, chunk_index) => ({
    item_id: itemRow.id,
    chunk_index,
    content,
    embedding: embeddings[chunk_index],
  }));

  const { error: insError } = await supabase.from("content_chunks").insert(rows);
  if (insError) {
    throw new Error(`Insert chunks ${itemRow.id}: ${insError.message}`);
  }

  return rows.length;
}
