import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthUser } from "../../app/auth.js";
import {
  SESSION_COOKIE,
  clearCookie,
  getInstallForUser,
} from "../../app/session.js";
import { revokeAccessToken } from "../../app/webflow-oauth.js";
import { getServiceClient } from "../../lib/supabase.js";

/**
 * Disconnect Webflow: revoke token when possible and delete the stored OAuth
 * access token from our database (Marketplace attestation requirement).
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "Log in first" });
    return;
  }

  const install = await getInstallForUser(req, user.id);
  if (!install) {
    res.status(200).json({ ok: true, disconnected: false });
    return;
  }

  if (install.access_token) {
    await revokeAccessToken(install.access_token);
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("webflow_installs")
    .update({
      access_token: "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", install.id)
    .eq("user_id", user.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  clearCookie(res, SESSION_COOKIE);
  res.status(200).json({ ok: true, disconnected: true });
}
