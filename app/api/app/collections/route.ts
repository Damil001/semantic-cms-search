import { NextRequest, NextResponse } from "next/server";
import { getUserFromAccessTokenFast } from "@/src/app/goauth";
import { buildCollectionsPayload, type CachedCmsField } from "@/src/app/collection-schema";
import { supabaseRestGet } from "@/src/lib/supabase-rest";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type InstallRow = {
  site_id: string;
  site_name: string | null;
  short_name: string | null;
  preview_url: string | null;
};

type MapRow = {
  collection_id: string;
  collection_name: string | null;
  content_type: string;
  enabled: boolean;
  url_pattern: string;
  fields: Record<string, unknown>;
  cms_fields?: CachedCmsField[] | null;
  cms_fields_synced_at?: string | null;
};

function installOrigin(install: InstallRow): string {
  if (install.preview_url) return install.preview_url.replace(/\/$/, "");
  if (install.short_name) return `https://${install.short_name}.webflow.io`;
  return "";
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("sb_access")?.value;
  const user = token ? await getUserFromAccessTokenFast(token) : null;
  if (!user) {
    return NextResponse.json({ error: "Log in first" }, { status: 401 });
  }

  try {
    const installs = await supabaseRestGet<InstallRow[]>(
      `webflow_installs?user_id=eq.${encodeURIComponent(user.id)}&order=updated_at.desc&limit=1&select=site_id,site_name,short_name,preview_url`,
      { timeoutMs: 6000 }
    );
    const install = installs[0];
    if (!install) {
      return NextResponse.json({ error: "Connect a Webflow site first" }, { status: 401 });
    }

    const origin = installOrigin(install);
    let rows: MapRow[] = [];

    try {
      rows = await supabaseRestGet<MapRow[]>(
        `webflow_collection_maps?site_id=eq.${encodeURIComponent(install.site_id)}&order=collection_name.asc&select=collection_id,collection_name,content_type,enabled,url_pattern,fields,cms_fields,cms_fields_synced_at`,
        { timeoutMs: 6000 }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/cms_fields/i.test(message)) {
        rows = await supabaseRestGet<MapRow[]>(
          `webflow_collection_maps?site_id=eq.${encodeURIComponent(install.site_id)}&order=collection_name.asc&select=collection_id,collection_name,content_type,enabled,url_pattern,fields`,
          { timeoutMs: 6000 }
        );
      } else {
        throw err;
      }
    }

    const collections = buildCollectionsPayload(
      rows.map((r) => ({
        ...r,
        cms_fields: r.cms_fields ?? [],
        cms_fields_synced_at: r.cms_fields_synced_at ?? null,
      })),
      origin
    );
    const needsSchemaRefresh =
      rows.length === 0 ||
      rows.some((r) => !r.cms_fields?.length || !r.cms_fields_synced_at);

    return NextResponse.json({
      collections,
      origin,
      needsSchemaRefresh,
      cached: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load collections";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
