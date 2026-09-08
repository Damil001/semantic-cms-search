import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserFromAccessTokenFast } from "@/src/app/goauth";
import { createOAuthState } from "@/src/app/oauth-state";
import { oauthAuthorizeUrl } from "@/src/app/webflow-oauth";
import { newToken } from "@/src/app/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function htmlRedirect(url: string, setCookie?: string): NextResponse {
  const safe = url.replace(/"/g, "&quot;");
  const body = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta http-equiv="refresh" content="0;url=${safe}"/><title>Connecting to Webflow…</title></head><body><p>Redirecting to Webflow…</p><p><a href="${safe}">Continue</a></p><script>location.replace(${JSON.stringify(url)});</script></body></html>`;
  const res = new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
  if (setCookie) res.headers.append("set-cookie", setCookie);
  return res;
}

function cookieDomain(): string {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return "; Domain=.talaash.org";
  }
  return "";
}

/**
 * OAuth must be a full document navigation. Returning HTML (not only 302)
 * avoids Next.js RSC client fetches that trip CORS on webflow.com.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("sb_access")?.value;
  const user = token ? await getUserFromAccessTokenFast(token) : null;
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/api/oauth/start", "https://www.talaash.org"),
      302
    );
  }

  try {
    const state = newToken();
    await createOAuthState(user.id, state);
    const authorizeUrl = oauthAuthorizeUrl(state);
    const secure = process.env.VERCEL ? "; Secure" : "";
    const setCookie = `wf_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}${cookieDomain()}`;
    return htmlRedirect(authorizeUrl, setCookie);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth start failed";
    console.error(message);
    const q = new URLSearchParams({ oauth: "error", message });
    return NextResponse.redirect(
      `https://www.talaash.org/install?${q.toString()}`,
      302
    );
  }
}
