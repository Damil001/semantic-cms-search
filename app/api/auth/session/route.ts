import { NextRequest, NextResponse } from "next/server";
import { setAuthCookiesOnResponse } from "@/src/app/auth-cookies";
import {
  AuthTimeoutError,
  getUserFromAccessTokenFast,
  signInWithPasswordFast,
  signUpFast,
} from "@/src/app/goauth";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("sb_access")?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const user = await getUserFromAccessTokenFast(token);
    if (!user) {
      return NextResponse.json({ authenticated: false });
    }
    return NextResponse.json({
      authenticated: true,
      email: user.email,
      userId: user.id,
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
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
        : await signInWithPasswordFast(email, password);

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
    const message = err instanceof Error ? err.message : "Auth failed";
    console.error("auth session error", action, message);
    const status =
      message.includes("SUPABASE_ANON_KEY") || message.includes("SUPABASE_URL")
        ? 503
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
