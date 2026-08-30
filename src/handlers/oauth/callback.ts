import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthUser } from "../../app/auth.js";
import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  newToken,
  readCookie,
  setCookie,
} from "../../app/session.js";
import { listSites } from "../../app/webflow-admin.js";
import { exchangeCode } from "../../app/webflow-oauth.js";
import { getServiceClient } from "../../lib/supabase.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const user = await getAuthUser(req);
  if (!user) {
    res.redirect(302, "/login?next=/api/oauth/start");
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const expected = readCookie(req, OAUTH_STATE_COOKIE);
  if (!code || !state || !expected || state !== expected) {
    res.status(400).send("Invalid OAuth state. Start again from the dashboard.");
    return;
  }

  try {
    const accessToken = await exchangeCode(code);
    const sites = await listSites(accessToken);
    const sessionToken = newToken();
    const primary = sites[0];
    if (!primary) {
      res.status(400).send("This Webflow account has no sites.");
      return;
    }

    const supabase = getServiceClient();
    const { data: existing } = await supabase
      .from("webflow_installs")
      .select("id, search_token")
      .eq("user_id", user.id)
      .eq("site_id", primary.id)
      .maybeSingle();

    const row = {
      user_id: user.id,
      site_id: primary.id,
      site_name: primary.displayName ?? primary.shortName ?? primary.id,
      short_name: primary.shortName ?? null,
      preview_url: primary.previewUrl ?? null,
      access_token: accessToken,
      session_token: sessionToken,
      search_token:
        (existing?.search_token as string | undefined) || newToken(),
      updated_at: new Date().toISOString(),
    };

    const { error } = existing
      ? await supabase.from("webflow_installs").update(row).eq("id", existing.id)
      : await supabase.from("webflow_installs").insert(row);

    if (error) {
      throw new Error(`Supabase: ${error.message}`);
    }

    setCookie(res, SESSION_COOKIE, sessionToken);
    res.redirect(302, "/app?connected=1");
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth failed";
    res.status(500).send(message);
  }
}
