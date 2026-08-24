import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  newToken,
  readCookie,
  setCookie,
} from "../../src/app/session.js";
import { listSites } from "../../src/app/webflow-admin.js";
import { exchangeCode } from "../../src/app/webflow-oauth.js";
import { getServiceClient } from "../../src/lib/supabase.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const expected = readCookie(req, OAUTH_STATE_COOKIE);
  if (!code || !state || !expected || state !== expected) {
    res.status(400).send("Invalid OAuth state. Start again from /app.");
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
    const { error } = await supabase.from("webflow_installs").insert({
      site_id: primary.id,
      site_name: primary.displayName ?? primary.shortName ?? primary.id,
      short_name: primary.shortName ?? null,
      preview_url: primary.previewUrl ?? null,
      access_token: accessToken,
      session_token: sessionToken,
    });
    if (error) throw new Error(error.message);

    setCookie(res, SESSION_COOKIE, sessionToken);
    res.redirect(302, "/app.html");
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth failed";
    res.status(500).send(message);
  }
}
