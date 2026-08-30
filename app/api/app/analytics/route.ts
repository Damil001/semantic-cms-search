import { NextRequest, NextResponse } from "next/server";
import { getUserFromAccessTokenFast } from "@/src/app/goauth";
import {
  emptyPromptAnalytics,
  getPromptAnalytics,
} from "@/src/analytics/prompt-analytics";
import { supabaseRestGet } from "@/src/lib/supabase-rest";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type InstallRow = { site_id: string };

export async function GET(request: NextRequest) {
  const token = request.cookies.get("sb_access")?.value;
  const user = token ? await getUserFromAccessTokenFast(token) : null;
  if (!user) {
    return NextResponse.json({ error: "Log in first" }, { status: 401 });
  }

  const daysRaw = request.nextUrl.searchParams.get("days") ?? "30";
  const days = Math.min(Math.max(Number.parseInt(daysRaw, 10) || 30, 1), 90);

  try {
    const installs = await supabaseRestGet<InstallRow[]>(
      `webflow_installs?user_id=eq.${encodeURIComponent(user.id)}&order=updated_at.desc&limit=1&select=site_id`,
      { timeoutMs: 6000 }
    );
    const install = installs[0];
    if (!install) {
      return NextResponse.json(
        { error: "Connect a Webflow site first" },
        { status: 400 }
      );
    }

    const analytics = await Promise.race([
      getPromptAnalytics(install.site_id, days),
      new Promise<ReturnType<typeof emptyPromptAnalytics>>((resolve) =>
        setTimeout(() => resolve(emptyPromptAnalytics(days)), 12_000)
      ),
    ]);

    return NextResponse.json(analytics);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analytics failed";
    console.error("analytics error", message);
    return NextResponse.json(emptyPromptAnalytics(days));
  }
}
