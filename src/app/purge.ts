import { getServiceClient } from "../lib/supabase.js";

/**
 * Delete an install and, when no other Talaash account still has the same Webflow site
 * connected, that site's indexed content (items + embeddings), field mappings and search analytics.
 */
export async function purgeInstallData(install: {
  id: string;
  site_id: string;
}): Promise<{ siteDataDeleted: boolean }> {
  const supabase = getServiceClient();

  const { error: delInstallErr } = await supabase
    .from("webflow_installs")
    .delete()
    .eq("id", install.id);
  if (delInstallErr) throw new Error(`Delete install: ${delInstallErr.message}`);

  const { count, error: countErr } = await supabase
    .from("webflow_installs")
    .select("id", { count: "exact", head: true })
    .eq("site_id", install.site_id);
  if (countErr) throw new Error(`Check other installs: ${countErr.message}`);
  if ((count ?? 0) > 0) return { siteDataDeleted: false };

  // content_chunks rows cascade from content_items.
  for (const table of ["content_items", "search_events", "webflow_collection_maps"] as const) {
    const { error } = await supabase.from(table).delete().eq("site_id", install.site_id);
    if (error) throw new Error(`Delete ${table}: ${error.message}`);
  }
  return { siteDataDeleted: true };
}
