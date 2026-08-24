import { randomBytes } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getServiceClient } from "../lib/supabase.js";

export const SESSION_COOKIE = "wf_session";
export const OAUTH_STATE_COOKIE = "wf_oauth_state";

export interface InstallRow {
  id: string;
  site_id: string;
  site_name: string | null;
  short_name: string | null;
  preview_url: string | null;
  access_token: string;
  session_token: string;
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
  res.setHeader(
    "Set-Cookie",
    `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

export function readCookie(req: VercelRequest, name: string): string | undefined {
  return req.cookies?.[name];
}

export async function getInstall(
  req: VercelRequest
): Promise<InstallRow | null> {
  const session = readCookie(req, SESSION_COOKIE);
  if (!session) return null;
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("webflow_installs")
    .select("*")
    .eq("session_token", session)
    .maybeSingle();
  if (error || !data) return null;
  return data as InstallRow;
}
