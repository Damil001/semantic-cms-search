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
import { purgeInstallData } from "../../app/purge.js";

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

  try {
    await purgeInstallData(install);
  } catch (err) {
    console.error("disconnect purge failed", err);
    // Never keep a usable token if the full purge failed; the daily cleanup job retries the rest.
    await getServiceClient()
      .from("webflow_installs")
      .update({ access_token: "", updated_at: new Date().toISOString() })
      .eq("id", install.id)
      .eq("user_id", user.id);
    res.status(500).json({
      error:
        "Webflow access was revoked, but some site data could not be deleted right now. It will be removed automatically within 24 hours.",
      customCodeRemoved,
    });
    return;
  }

  clearCookie(res, SESSION_COOKIE);
  res.status(200).json({
    ok: true,
    disconnected: true,
    customCodeRemoved,
    customCodeError,
    message: customCodeRemoved
      ? "Disconnected. Your Webflow token and this site’s indexed content and search analytics were deleted. Publish your Webflow site so the search script removal goes live."
      : "Disconnected and site data deleted. The search script may still be on your site — in Webflow open Site settings → Custom code, remove TalaashSearch, then publish. See /support.",
  });
}
