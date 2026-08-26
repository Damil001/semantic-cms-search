import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { User } from "@supabase/supabase-js";
import { getAuthUser } from "./auth.js";
import { getInstallForUser, type InstallRow } from "./session.js";

export async function requireAuthInstall(
  req: VercelRequest,
  res: VercelResponse
): Promise<{ user: User; install: InstallRow } | null> {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "Log in first" });
    return null;
  }
  const install = await getInstallForUser(req, user.id);
  if (!install) {
    res.status(401).json({ error: "Connect a Webflow site first" });
    return null;
  }
  return { user, install };
}
