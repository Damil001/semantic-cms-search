import type { NextResponse } from "next/server";

export const AUTH_ACCESS_COOKIE = "sb_access";
export const AUTH_REFRESH_COOKIE = "sb_refresh";

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.VERCEL === "1",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
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
