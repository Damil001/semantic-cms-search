import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthUser } from "../../app/auth.js";
import {
  SESSION_COOKIE,
  clearCookie,
  getInstallForUser,
} from "../../app/session.js";
import { revokeAccessToken } from "../../app/webflow-oauth.js";
import { uninstallSearchScript } from "../../app/webflow-custom-code.js";
import { getServiceClient } from "../../lib/supabase.js";

/**
 * Disconnect Webflow: remove Custom Code we applied, revoke token, clear DB.
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
    res.status(200).json({ ok: true, disconnected: false, customCodeRemoved: false });
    return;
  }

  let customCodeRemoved = false;
  let customCodeError: string | null = null;

  if (install.access_token && install.site_id) {
    try {
      await uninstallSearchScript({
        accessToken: install.access_token,
        siteId: install.site_id,
      });
      customCodeRemoved = true;
    } catch (err) {
      customCodeError = err instanceof Error ? err.message : "Custom Code uninstall failed";
      console.error("custom code uninstall failed", err);
    }
  } else if (install.site_id) {
    customCodeError =
      "No Webflow access token left to remove Custom Code automatically. Remove TalaashSearch under Site settings → Custom Code, then publish.";
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
  res.status(200).json({
    ok: true,
    disconnected: true,
    customCodeRemoved,
    customCodeError,
    message: customCodeRemoved
      ? "Disconnected. Publish your Webflow site so script removal goes live."
      : "Disconnected. Custom Code may still be on the site — remove TalaashSearch under Site settings → Custom Code, then publish. See /support.",
  });
}
