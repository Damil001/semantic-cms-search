import { NextRequest, NextResponse } from "next/server";
import { setAuthCookiesOnResponse } from "@/src/app/auth-cookies";
import {
  AuthTimeoutError,
  AuthUserError,
  getUserFromAccessTokenFast,
  refreshSessionFast,
  signInFriendly,
  signUpFast,
} from "@/src/app/goauth";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET(request: NextRequest) {
  const access = request.cookies.get("sb_access")?.value;
  if (access) {
    try {
      const user = await getUserFromAccessTokenFast(access);
      if (user) {
        return NextResponse.json({
          authenticated: true,
          email: user.email,
          userId: user.id,
        });
      }
    } catch {
      /* try refresh below */
    }
  }

  const refresh = request.cookies.get("sb_refresh")?.value;
  if (refresh) {
    const renewed = await refreshSessionFast(refresh);
    if (renewed) {
      const response = NextResponse.json({
        authenticated: true,
        email: renewed.user.email,
        userId: renewed.user.id,
      });
      setAuthCookiesOnResponse(
        response,
        renewed.accessToken,
        renewed.refreshToken
      );
      return response;
    }
  }

  return NextResponse.json({ authenticated: false });
}

export async function POST(request: NextRequest) {
  let body: { action?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = String(body.action ?? "login");
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  try {
    const result =
      action === "signup"
        ? await signUpFast(email, password)
        : await signInFriendly(email, password);

    const response = NextResponse.json({
      ok: true,
      email: result.user.email,
      userId: result.user.id,
    });
    setAuthCookiesOnResponse(response, result.accessToken, result.refreshToken);
    return response;
  } catch (err) {
    if (err instanceof AuthTimeoutError) {
      return NextResponse.json({ error: err.message }, { status: 504 });
    }
    if (err instanceof AuthUserError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Auth failed";
    console.error("auth session error", action, message);
    const status =
      message.includes("SUPABASE_ANON_KEY") || message.includes("SUPABASE_URL")
        ? 503
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
