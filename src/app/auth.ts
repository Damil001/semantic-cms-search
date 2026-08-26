import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "../lib/supabase.js";
import {
  AUTH_ACCESS_COOKIE,
  readCookie,
  setCookie,
  clearCookie,
  AUTH_REFRESH_COOKIE,
} from "./session.js";

function authClient() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set for auth");
  }
  return createClient(normalizeSupabaseUrl(url), anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function setAuthCookies(
  res: VercelResponse,
  accessToken: string,
  refreshToken: string
): void {
  setCookie(res, AUTH_ACCESS_COOKIE, accessToken);
  setCookie(res, AUTH_REFRESH_COOKIE, refreshToken);
}

export function clearAuthCookies(res: VercelResponse): void {
  clearCookie(res, AUTH_ACCESS_COOKIE);
  clearCookie(res, AUTH_REFRESH_COOKIE);
}

export async function getAuthUser(req: VercelRequest): Promise<User | null> {
  const token = readCookie(req, AUTH_ACCESS_COOKIE);
  if (!token) return null;

  const client = authClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function signUp(
  email: string,
  password: string
): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const client = authClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error || !data.session || !data.user) {
    throw new Error(error?.message ?? "Sign up failed");
  }
  return {
    user: data.user,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session || !data.user) {
    throw new Error(error?.message ?? "Invalid email or password");
  }
  return {
    user: data.user,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}
