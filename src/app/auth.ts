import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl, getServiceClient } from "../lib/supabase.js";
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  authCookieOptions,
  readCookie,
  setCookie,
  clearCookie,
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

export function setAuthCookiesOnResponse(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): void {
  const opts = authCookieOptions();
  response.cookies.set(AUTH_ACCESS_COOKIE, accessToken, opts);
  response.cookies.set(AUTH_REFRESH_COOKIE, refreshToken, opts);
}

export function clearAuthCookies(res: VercelResponse): void {
  clearCookie(res, AUTH_ACCESS_COOKIE);
  clearCookie(res, AUTH_REFRESH_COOKIE);
}

export async function getAuthUser(req: VercelRequest): Promise<User | null> {
  const token = readCookie(req, AUTH_ACCESS_COOKIE);
  return getAuthUserFromAccessToken(token);
}

export async function getAuthUserFromAccessToken(
  token: string | null | undefined
): Promise<User | null> {
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
  const admin = getServiceClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return signIn(email, password);
    }
    throw new Error(error.message);
  }

  return signIn(email, password);
}

async function confirmUserEmail(email: string): Promise<void> {
  const admin = getServiceClient();
  const normalized = email.trim().toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(error.message);

    const user = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (user) {
      const { error: updateError } = await admin.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );
      if (updateError) throw new Error(updateError.message);
      return;
    }

    if (data.users.length < 1000) return;
    page += 1;
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const client = authClient();
  let { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (
    error?.message?.toLowerCase().includes("email not confirmed")
  ) {
    await confirmUserEmail(email);
    ({ data, error } = await client.auth.signInWithPassword({
      email,
      password,
    }));
  }

  if (error || !data.session || !data.user) {
    throw new Error(error?.message ?? "Invalid email or password");
  }
  return {
    user: data.user,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}
