import type { NextResponse } from "next/server";

export const AUTH_ACCESS_COOKIE = "sb_access";
export const AUTH_REFRESH_COOKIE = "sb_refresh";

export function authCookieOptions() {
  const opts: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
    domain?: string;
  } = {
    httpOnly: true,
    secure: process.env.VERCEL === "1" || Boolean(process.env.VERCEL),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    opts.domain = ".talaash.org";
  }
  return opts;
}

export function setAuthCookiesOnResponse(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): void {
  const opts = authCookieOptions();
  response.cookies.set(AUTH_ACCESS_COOKIE, accessToken, opts);
  response.cookies.set(AUTH_REFRESH_COOKIE, refreshToken, opts);
}
