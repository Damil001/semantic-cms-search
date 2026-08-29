import { randomBytes } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getServiceClient } from "../lib/supabase.js";

export const SESSION_COOKIE = "wf_session";
export const OAUTH_STATE_COOKIE = "wf_oauth_state";
export const AUTH_ACCESS_COOKIE = "sb_access";
export const AUTH_REFRESH_COOKIE = "sb_refresh";

export interface InstallRow {
  id: string;
  user_id: string | null;
  site_id: string;
  site_name: string | null;
  short_name: string | null;
  preview_url: string | null;
  access_token: string;
  session_token: string;
  /** Public widget key — scopes /search to this site only. */
  search_token: string;
  last_indexed_at: string | null;
}

export function newToken(): string {
  return randomBytes(32).toString("hex");
}

function cookieSuffix(): string {
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`;
}

export function setCookie(res: VercelResponse, name: string, value: string): void {
  const prev = res.getHeader("Set-Cookie");
  const next = `${name}=${value}${cookieSuffix()}`;
  if (!prev) {
    res.setHeader("Set-Cookie", next);
  } else if (Array.isArray(prev)) {
    res.setHeader("Set-Cookie", [...prev, next]);
  } else {
    res.setHeader("Set-Cookie", [String(prev), next]);
  }
}

export function clearCookie(res: VercelResponse, name: string): void {
  // Must match setCookie attributes (incl. Secure on Vercel) or the browser
  // keeps the old cookie. Append — never overwrite — so logout can clear several.
  const secure = process.env.VERCEL ? "; Secure" : "";
  const next = `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  const prev = res.getHeader("Set-Cookie");
  if (!prev) {
    res.setHeader("Set-Cookie", next);
  } else if (Array.isArray(prev)) {
    res.setHeader("Set-Cookie", [...prev, next]);
  } else {
    res.setHeader("Set-Cookie", [String(prev), next]);
  }
}

export function readCookie(req: VercelRequest, name: string): string | undefined {
  return req.cookies?.[name];
}

export async function getInstallForUser(
  req: VercelRequest,
  userId: string
): Promise<InstallRow | null> {
  const session = readCookie(req, SESSION_COOKIE);
  const supabase = getServiceClient();

  if (session) {
    const { data, error } = await supabase
      .from("webflow_installs")
      .select("*")
      .eq("session_token", session)
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && data) return data as InstallRow;
  }

  const { data: latest } = await supabase
    .from("webflow_installs")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (latest as InstallRow | null) ?? null;
}

export async function userOwnsSite(
  userId: string,
  siteId: string
): Promise<boolean> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("webflow_installs")
    .select("id")
    .eq("user_id", userId)
    .eq("site_id", siteId)
    .maybeSingle();
  return Boolean(data);
}
