import { NextRequest, NextResponse } from "next/server";
import { purgeInstallData } from "@/src/app/purge";
import { getServiceClient } from "@/src/lib/supabase";
import { decryptToken, encryptToken, isEncryptedToken } from "@/src/lib/token-crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily: delete installs whose Webflow authorization was revoked (token cleared after a 401,
 * or rejected by Webflow's introspect endpoint), and encrypt any legacy plaintext tokens.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("webflow_installs")
    .select("id, site_id, access_token");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let purged = 0;
  let encrypted = 0;
  const failures: string[] = [];

  for (const row of data ?? []) {
    const install = row as { id: string; site_id: string; access_token: string | null };
    try {
      let token = "";
      try {
        token = await decryptToken(install.access_token);
      } catch {
        token = "";
      }

      let revoked = !token;
      if (token) {
        const res = await fetch("https://api.webflow.com/v2/token/introspect", {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        });
        revoked = res.status === 401;
      }

      if (revoked) {
        await purgeInstallData(install);
        purged += 1;
      } else if (!isEncryptedToken(install.access_token)) {
        await supabase
          .from("webflow_installs")
          .update({ access_token: await encryptToken(token) })
          .eq("id", install.id);
        encrypted += 1;
      }
    } catch (err) {
      failures.push(`${install.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (failures.length) console.error("purge cron failures", failures);
  return NextResponse.json({ ok: true, checked: data?.length ?? 0, purged, encrypted, failures: failures.length });
}
