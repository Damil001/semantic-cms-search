import { NextRequest, NextResponse } from "next/server";
import { createPkcePair, oauthProviderUrl } from "@/src/app/goauth";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const CALLBACK = "https://www.talaash.org/api/auth/callback";

/** Only same-site relative paths, so `next` can't become an open redirect. */
function safeNext(raw: string | null | undefined): string {
  const next = String(raw ?? "");
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/app";
}

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const { verifier, challenge } = await createPkcePair();

  let target: string;
  try {
    target = oauthProviderUrl("google", CALLBACK, challenge);
  } catch {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Google sign-in is not configured.")}`, request.url)
    );
  }

  const response = NextResponse.redirect(target);
  const opts = {
    httpOnly: true,
    secure: Boolean(process.env.VERCEL),
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: 600,
  };
  response.cookies.set("sb_pkce", verifier, opts);
  response.cookies.set("sb_oauth_next", next, opts);
  return response;
}
