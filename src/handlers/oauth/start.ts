import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthUser } from "../../app/auth.js";
import { OAUTH_STATE_COOKIE, newToken, setCookie } from "../../app/session.js";
import { oauthAuthorizeUrl } from "../../app/webflow-oauth.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }

  const user = await getAuthUser(req);
  if (!user) {
    res.redirect(302, "/login?next=/api/oauth/start");
    return;
  }

  const state = newToken();
  setCookie(res, OAUTH_STATE_COOKIE, state);
  res.redirect(302, oauthAuthorizeUrl(state));
}
