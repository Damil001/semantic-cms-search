import type { InstallRow } from "./session.js";
import {
  getCollection,
  getSite,
  guessFields,
  listCollections,
  publicSiteOrigin,
  type WfCollection,
  type WfField,
} from "./webflow-admin.js";
import { getServiceClient } from "../lib/supabase.js";

export type CachedCmsField = {
  slug: string;
  displayName: string;
  type: string;
};

type MapRow = {
  collection_id: string;
  collection_name: string | null;
  content_type: string;
  enabled: boolean;
  url_pattern: string;
  fields: Record<string, unknown>;
  cms_fields: CachedCmsField[] | null;
  cms_fields_synced_at: string | null;
};

export function installOrigin(install: InstallRow): string {
  if (install.preview_url) {
    return install.preview_url.replace(/\/$/, "");
  }
  if (install.short_name) {
    return `https://${install.short_name}.webflow.io`;
  }
  return "";
}

export function serializeCmsFields(fields: WfField[] | undefined): CachedCmsField[] {
  return (fields ?? []).map((f) => ({
    slug: f.slug,
    displayName: f.displayName,
    type: f.type,
  }));
}

export async function fetchWebflowCollectionDetails(
  accessToken: string,
  siteId: string
): Promise<{ origin: string; collections: WfCollection[] }> {
  const site = await getSite(accessToken, siteId);
  const origin = publicSiteOrigin(site);
  const listed = await listCollections(accessToken, siteId);
  const collections = await Promise.all(
    listed.map(async (c) => {
      try {
        const full = await getCollection(accessToken, c.id);
        const fields =
          full.fields && full.fields.length > 0 ? full.fields : c.fields ?? [];
        return { ...c, ...full, fields };
      } catch {
        return c;
      }
    })
  );
  return { origin, collections };
}

function mergeMapping(
  existing: Record<string, unknown> | undefined,
  guessed: ReturnType<typeof guessFields>
): Record<string, unknown> {
  if (!existing) return guessed;
  return {
    ...guessed,
    ...existing,
    embedFields: Array.isArray(existing.embedFields)
      ? existing.embedFields
      : guessed.embedFields,
  };
}

export async function syncWebflowSchemasToDb(
  siteId: string,
  origin: string,
  webflowCollections: WfCollection[]
): Promise<{ synced: number; newFieldCount: number }> {
  const supabase = getServiceClient();
  const { data: saved } = await supabase
    .from("webflow_collection_maps")
    .select("*")
    .eq("site_id", siteId);
  const byId = new Map((saved ?? []).map((row) => [row.collection_id as string, row as MapRow]));

  const now = new Date().toISOString();
  let newFieldCount = 0;
  const rows = webflowCollections.map((col) => {
    const existing = byId.get(col.id);
    const previousSlugs = new Set(
      ((existing?.cms_fields ?? []) as CachedCmsField[]).map((f) => f.slug)
    );
    const cmsFields = serializeCmsFields(col.fields);
    for (const field of cmsFields) {
      if (!previousSlugs.has(field.slug)) newFieldCount += 1;
    }

    const guessed = guessFields(col.fields);
    const slug = col.slug || "page";
    const mapping = mergeMapping(existing?.fields as Record<string, unknown>, guessed);

    return {
      site_id: siteId,
      collection_id: col.id,
      collection_name: col.displayName,
      content_type: existing?.content_type ?? slug,
      enabled: existing?.enabled ?? true,
      url_pattern: existing?.url_pattern ?? `${origin}/${slug}/{slug}`,
      fields: mapping,
      cms_fields: cmsFields,
      cms_fields_synced_at: now,
    };
  });

  if (rows.length > 0) {
    const { error } = await supabase.from("webflow_collection_maps").upsert(rows, {
      onConflict: "site_id,collection_id",
    });
    if (error) throw new Error(error.message);
  }

  return { synced: rows.length, newFieldCount };
}

export function buildCollectionsPayload(rows: MapRow[], origin: string) {
  return rows.map((row) => {
    const cmsFields = (row.cms_fields ?? []) as CachedCmsField[];
    const guessed = guessFields(
      cmsFields.map((f) => ({
        id: f.slug,
        slug: f.slug,
        displayName: f.displayName,
        type: f.type,
      }))
    );
    const saved = row.fields ?? {};
    const mapping = mergeMapping(saved, guessed);

    return {
      collectionId: row.collection_id,
      name: row.collection_name ?? row.collection_id,
      fields: cmsFields,
      contentType: row.content_type,
      enabled: row.enabled,
      urlPattern: row.url_pattern,
      mapping,
      cmsFieldsSyncedAt: row.cms_fields_synced_at,
    };
  });
}

export async function loadCachedCollections(siteId: string, origin: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("webflow_collection_maps")
    .select("*")
    .eq("site_id", siteId)
    .order("collection_name", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MapRow[];
  const collections = buildCollectionsPayload(rows, origin);
  const needsSchemaRefresh =
    rows.length === 0 ||
    rows.some((r) => !r.cms_fields?.length || !r.cms_fields_synced_at);

  return { collections, origin, needsSchemaRefresh, cached: true as const };
}
