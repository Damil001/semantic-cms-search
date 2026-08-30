import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { getServiceClient } from "../lib/supabase.js";
import { requireSupabaseAuthEnv } from "../lib/supabase-url.js";
import { getUserFromAccessTokenFast, signInWithPasswordFast } from "./goauth.js";
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  readCookie,
  setCookie,
  clearCookie,
} from "./session.js";
import { setAuthCookiesOnResponse } from "./auth-cookies.js";

export { setAuthCookiesOnResponse };

function authClient() {
  const { url, anonKey } = requireSupabaseAuthEnv();
  return createClient(url, anonKey, {
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
  return getAuthUserFromAccessToken(token);
}

export async function getAuthUserFromAccessToken(
  token: string | null | undefined
): Promise<User | null> {
  if (!token) return null;

  try {
    const fast = await getUserFromAccessTokenFast(token);
    if (fast) {
      return { id: fast.id, email: fast.email } as User;
    }
  } catch {
    // fall through to supabase client
  }

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
  const { url } = requireSupabaseAuthEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_KEY must be set (server-side only)");
  }

  const res = await fetch(
    `${url}/auth/v1/admin/users?email=${encodeURIComponent(normalized)}`,
    {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!res.ok) {
    throw new Error(`Could not look up user (${res.status})`);
  }

  const payload = (await res.json()) as {
    users?: { id: string; email?: string }[];
  };
  const user = payload.users?.find((u) => u.email?.toLowerCase() === normalized);
  if (!user) return;

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });
  if (updateError) throw new Error(updateError.message);
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  try {
    const fast = await signInWithPasswordFast(email, password);
    return {
      user: fast.user as User,
      accessToken: fast.accessToken,
      refreshToken: fast.refreshToken,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (!message.toLowerCase().includes("email not confirmed")) {
      throw err;
    }
  }

  await confirmUserEmail(email);
  const fast = await signInWithPasswordFast(email, password);
  return {
    user: fast.user as User,
    accessToken: fast.accessToken,
    refreshToken: fast.refreshToken,
  };
}
