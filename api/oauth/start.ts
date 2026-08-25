import type { VercelRequest, VercelResponse } from "@vercel/node";
import { OAUTH_STATE_COOKIE, newToken, setCookie } from "../../src/app/session.js";
import { oauthAuthorizeUrl } from "../../src/app/webflow-oauth.js";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }
  const state = newToken();
  setCookie(res, OAUTH_STATE_COOKIE, state);
  res.redirect(302, oauthAuthorizeUrl(state));
}
