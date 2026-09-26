import { NextRequest, NextResponse } from "next/server";
import { setAuthCookiesOnResponse } from "@/src/app/auth-cookies";
import { signInWithGoogleCode } from "@/src/app/goauth";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const SITE = "https://www.talaash.org";
const TEMP_COOKIES = ["g_state", "g_nonce", "g_next"];

function clearTemp(res: NextResponse): NextResponse {
  for (const name of TEMP_COOKIES) res.cookies.set(name, "", { path: "/api/auth", maxAge: 0 });
  return res;
}

function loginWithError(message: string): NextResponse {
  return clearTemp(NextResponse.redirect(`${SITE}/login?error=${encodeURIComponent(message)}`));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const providerError = params.get("error");
  if (providerError) {
    return loginWithError(
      providerError === "access_denied"
        ? "Google sign-in was cancelled."
        : `Google sign-in failed: ${providerError}`.slice(0, 180)
    );
  }

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get("g_state")?.value;
  const nonce = request.cookies.get("g_nonce")?.value;
  if (!code || !state || !expectedState || state !== expectedState || !nonce) {
    return loginWithError("Google sign-in expired. Please try again.");
  }

  const rawNext = request.cookies.get("g_next")?.value ?? "/app";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app";

  try {
    const session = await signInWithGoogleCode(code, nonce);
    const res = NextResponse.redirect(`${SITE}${next}`);
    setAuthCookiesOnResponse(res, session.accessToken, session.refreshToken);
    return clearTemp(res);
  } catch (err) {
    console.error("google callback error", err);
    return loginWithError("Google sign-in failed. Please try again or use email and password.");
  }
}
