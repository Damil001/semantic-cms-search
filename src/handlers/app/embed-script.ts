import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthUser } from "../../app/auth.js";
import { getInstallForUser } from "../../app/session.js";
import { installSearchScript } from "../../app/webflow-custom-code.js";

function publicOrigin(req: VercelRequest): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  const host = req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Register + apply search.js on the connected Webflow site via Custom Code API.
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
  if (!install?.access_token || !install.site_id || !install.search_token) {
    res.status(400).json({ error: "Connect Webflow first" });
    return;
  }

  const origin = publicOrigin(req);
  try {
    const result = await installSearchScript({
      accessToken: install.access_token,
      siteId: install.site_id,
      scriptUrl: `${origin}/search.js`,
      searchEndpoint: `${origin}/search`,
      searchToken: install.search_token,
    });
    res.status(200).json({
      ok: true,
      ...result,
      message:
        "Search script registered on your Webflow site. Publish the site in Webflow for it to go live.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to install script";
    console.error("embed-script error", message);
    res.status(500).json({ error: message });
  }
}
