import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getInstall } from "../../src/app/session.js";
import { listSites } from "../../src/app/webflow-admin.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const install = await getInstall(req);
  if (!install) {
    res.status(200).json({ connected: false });
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
    connected: true,
    siteId: install.site_id,
    siteName: install.site_name,
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
