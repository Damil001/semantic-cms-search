import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthUser } from "../../app/auth.js";
import { getInstallForUser } from "../../app/session.js";
import { listSites } from "../../app/webflow-admin.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(200).json({ authenticated: false });
    return;
  }

  const install = await getInstallForUser(req, user.id);
  if (!install) {
    res.status(200).json({
      authenticated: true,
      email: user.email,
      connected: false,
    });
    return;
  }

  let sites: { id: string; name: string }[] = [];
  try {
    sites = (await listSites(install.access_token)).map((s) => ({
      id: s.id,
      name: s.displayName ?? s.shortName ?? s.id,
    }));
  } catch {
    sites = [
      {
        id: install.site_id,
        name: install.site_name ?? install.site_id,
      },
    ];
  }

  res.status(200).json({
    authenticated: true,
    email: user.email,
    connected: true,
    siteId: install.site_id,
    siteName: install.site_name,
    searchToken: install.search_token,
    lastIndexedAt: install.last_indexed_at,
    searchEndpoint: `${publicOrigin(req)}/search`,
    scriptUrl: `${publicOrigin(req)}/search.js`,
    sites,
  });
}

function publicOrigin(req: VercelRequest): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  const host = req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}
