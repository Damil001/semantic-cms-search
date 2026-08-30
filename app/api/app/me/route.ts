import { NextRequest, NextResponse } from "next/server";
import { getUserFromAccessTokenFast } from "@/src/app/goauth";
import { normalizeSupabaseUrl } from "@/src/lib/supabase-url";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type InstallRow = {
  site_id: string;
  site_name: string | null;
  search_token: string;
  last_indexed_at: string | null;
};

export async function GET(request: NextRequest) {
  const token = request.cookies.get("sb_access")?.value;
  const user = token ? await getUserFromAccessTokenFast(token) : null;

  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({
      authenticated: true,
      email: user.email,
      connected: false,
    });
  }

  const url = normalizeSupabaseUrl(supabaseUrl);
  let install: InstallRow | null = null;

  try {
    const installRes = await fetch(
      `${url}/rest/v1/webflow_installs?user_id=eq.${encodeURIComponent(user.id)}&order=updated_at.desc&limit=1&select=site_id,site_name,search_token,last_indexed_at`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (installRes.ok) {
      const installs = (await installRes.json()) as InstallRow[];
      install = installs[0] ?? null;
    }
  } catch (err) {
    console.error("me install lookup failed", err);
  }

  if (!install) {
    return NextResponse.json({
      authenticated: true,
      email: user.email,
      connected: false,
    });
  }

  const origin = new URL(request.url).origin;

  return NextResponse.json({
    authenticated: true,
    email: user.email,
    connected: true,
    siteId: install.site_id,
    siteName: install.site_name,
    searchToken: install.search_token,
    lastIndexedAt: install.last_indexed_at,
    searchEndpoint: `${origin}/search`,
    scriptUrl: `${origin}/search.js`,
    sites: [
      {
        id: install.site_id,
        name: install.site_name ?? install.site_id,
      },
    ],
  });
}
