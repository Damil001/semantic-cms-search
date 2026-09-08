import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthUser } from "../../app/auth.js";
import {
  OAUTH_PENDING_CODE_COOKIE,
  OAUTH_PENDING_STATE_COOKIE,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  clearCookie,
  newToken,
  readCookie,
  setCookie,
} from "../../app/session.js";
import { consumeOAuthState } from "../../app/oauth-state.js";
import { listSites } from "../../app/webflow-admin.js";
import { exchangeCode } from "../../app/webflow-oauth.js";
import { getServiceClient } from "../../lib/supabase.js";

function failRedirect(res: VercelResponse, message: string): void {
  const q = new URLSearchParams({ oauth: "error", message });
  res.redirect(302, `https://www.talaash.org/install?${q.toString()}`);
}

async function finishInstall(
  res: VercelResponse,
  userId: string,
  accessToken: string
): Promise<void> {
  const sites = await listSites(accessToken);
  const sessionToken = newToken();
  const primary = sites[0];
  if (!primary) {
    failRedirect(res, "This Webflow account has no sites.");
    return;
  }

  const supabase = getServiceClient();
  const { data: existing } = await supabase
    .from("webflow_installs")
    .select("id, search_token")
    .eq("user_id", userId)
    .eq("site_id", primary.id)
    .maybeSingle();

  const row = {
    user_id: userId,
    site_id: primary.id,
    site_name: primary.displayName ?? primary.shortName ?? primary.id,
    short_name: primary.shortName ?? null,
    preview_url: primary.previewUrl ?? null,
    access_token: accessToken,
    session_token: sessionToken,
    search_token: (existing?.search_token as string | undefined) || newToken(),
    updated_at: new Date().toISOString(),
  };

  const { error } = existing
    ? await supabase.from("webflow_installs").update(row).eq("id", existing.id)
    : await supabase.from("webflow_installs").insert(row);

  if (error) {
    throw new Error(`Supabase: ${error.message}`);
  }

  clearCookie(res, OAUTH_STATE_COOKIE);
  clearCookie(res, OAUTH_PENDING_CODE_COOKIE);
  clearCookie(res, OAUTH_PENDING_STATE_COOKIE);
  setCookie(res, SESSION_COOKIE, sessionToken);
  res.redirect(302, "https://www.talaash.org/app?connected=1");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const oauthError =
    typeof req.query.error === "string" ? req.query.error : "";
  if (oauthError) {
    clearCookie(res, OAUTH_STATE_COOKIE);
    clearCookie(res, OAUTH_PENDING_CODE_COOKIE);
    clearCookie(res, OAUTH_PENDING_STATE_COOKIE);
    if (oauthError === "access_denied") {
      res.redirect(302, "https://www.talaash.org/install?oauth=denied");
      return;
    }
    const desc =
      typeof req.query.error_description === "string"
        ? req.query.error_description
        : oauthError;
    failRedirect(res, `Webflow authorization error: ${desc}`.slice(0, 180));
    return;
  }

  const user = await getAuthUser(req);
  const codeFromQuery = typeof req.query.code === "string" ? req.query.code : "";
  const stateFromQuery =
    typeof req.query.state === "string" ? req.query.state : "";
  const resume = req.query.resume === "1" || req.query.resume === "true";

  const pendingCode = readCookie(req, OAUTH_PENDING_CODE_COOKIE) ?? "";
  const pendingState = readCookie(req, OAUTH_PENDING_STATE_COOKIE) ?? "";
  const code = codeFromQuery || (resume ? pendingCode : "");
  const state = stateFromQuery || (resume ? pendingState : "");

  if (!user) {
    if (code && state) {
      setCookie(res, OAUTH_PENDING_CODE_COOKIE, code);
      setCookie(res, OAUTH_PENDING_STATE_COOKIE, state);
      setCookie(res, OAUTH_STATE_COOKIE, state);
      res.redirect(
        302,
        "https://www.talaash.org/login?next=" +
          encodeURIComponent("/api/oauth/callback?resume=1")
      );
      return;
    }
    res.redirect(302, "https://www.talaash.org/install");
    return;
  }

  if (!code || !state) {
    failRedirect(
      res,
      "Missing OAuth code. Start again from https://www.talaash.org/install"
    );
    return;
  }

  try {
    const ok = await consumeOAuthState(state, user.id);
    if (!ok) {
      failRedirect(
        res,
        "Invalid or expired OAuth state. Start again from Install (do not reuse an old authorize tab)."
      );
      return;
    }

    const accessToken = await exchangeCode(code);
    await finishInstall(res, user.id, accessToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth failed";
    console.error("oauth callback error", message);
    failRedirect(res, message.slice(0, 180));
  }
}
