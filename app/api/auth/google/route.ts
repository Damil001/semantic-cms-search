import { NextRequest, NextResponse } from "next/server";
import { googleAuthorizeUrl } from "@/src/app/goauth";

export const dynamic = "force-dynamic";
export const runtime = "edge";

/** Only same-site relative paths, so `next` can't become an open redirect. */
function safeNext(raw: string | null | undefined): string {
  const next = String(raw ?? "");
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/app";
}

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  let google: Awaited<ReturnType<typeof googleAuthorizeUrl>>;
  try {
    google = await googleAuthorizeUrl();
  } catch {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Google sign-in is not configured.")}`, request.url)
    );
  }

  const response = NextResponse.redirect(google.url);
  const opts = {
    httpOnly: true,
    secure: Boolean(process.env.VERCEL),
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: 600,
  };
  response.cookies.set("g_state", google.state, opts);
  response.cookies.set("g_nonce", google.nonce, opts);
  response.cookies.set("g_next", next, opts);
  return response;
}
