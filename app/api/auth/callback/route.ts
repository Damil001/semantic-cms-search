import { NextRequest, NextResponse } from "next/server";
import { setAuthCookiesOnResponse } from "@/src/app/auth-cookies";
import { exchangePkceCode } from "@/src/app/goauth";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const SITE = "https://www.talaash.org";

function loginWithError(message: string): NextResponse {
  const res = NextResponse.redirect(`${SITE}/login?error=${encodeURIComponent(message)}`);
  res.cookies.set("sb_pkce", "", { path: "/api/auth", maxAge: 0 });
  res.cookies.set("sb_oauth_next", "", { path: "/api/auth", maxAge: 0 });
  return res;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const providerError = params.get("error_description") || params.get("error");
  if (providerError) {
    return loginWithError(
      providerError === "access_denied"
        ? "Google sign-in was cancelled."
        : `Google sign-in failed: ${providerError}`.slice(0, 180)
    );
  }

  const code = params.get("code");
  const verifier = request.cookies.get("sb_pkce")?.value;
  if (!code || !verifier) {
    return loginWithError("Google sign-in expired. Please try again.");
  }

  const rawNext = request.cookies.get("sb_oauth_next")?.value ?? "/app";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app";

  try {
    const session = await exchangePkceCode(code, verifier);
    const res = NextResponse.redirect(`${SITE}${next}`);
    setAuthCookiesOnResponse(res, session.accessToken, session.refreshToken);
    res.cookies.set("sb_pkce", "", { path: "/api/auth", maxAge: 0 });
    res.cookies.set("sb_oauth_next", "", { path: "/api/auth", maxAge: 0 });
    return res;
  } catch (err) {
    console.error("google callback error", err);
    return loginWithError("Google sign-in failed. Please try again or use email and password.");
  }
}
