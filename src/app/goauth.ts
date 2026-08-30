import { requireSupabaseAuthEnv } from "../lib/supabase-url.js";

const AUTH_TIMEOUT_MS = 10_000;

export class AuthTimeoutError extends Error {
  constructor() {
    super("Sign-in timed out. Check SUPABASE_URL / keys on Vercel, then try again.");
    this.name = "AuthTimeoutError";
  }
}

function authHeaders(anonKey: string, accessToken?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    apikey: anonKey,
    Authorization: `Bearer ${accessToken ?? anonKey}`,
  };
}

async function readAuthResponse(res: Response): Promise<{
  ok: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  user?: { id: string; email?: string };
}> {
  const payload = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    user?: { id: string; email?: string };
    error_description?: string;
    msg?: string;
    message?: string;
  };

  if (!res.ok) {
    const message =
      payload.error_description ||
      payload.msg ||
      payload.message ||
      `Auth failed (${res.status})`;
    return { ok: false, message };
  }

  if (!payload.access_token || !payload.user) {
    return { ok: false, message: "Invalid email or password" };
  }

  return {
    ok: true,
    message: "ok",
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    user: payload.user,
  };
}

/** Fast password sign-in via GoTrue fetch — no ws / heavy Supabase client. */
export async function signInWithPasswordFast(
  email: string,
  password: string
): Promise<{ user: { id: string; email?: string }; accessToken: string; refreshToken: string }> {
  const { url, anonKey } = requireSupabaseAuthEnv();

  let res: Response;
  try {
    res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: authHeaders(anonKey),
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new AuthTimeoutError();
    }
    throw err;
  }

  const parsed = await readAuthResponse(res);
  if (!parsed.ok || !parsed.accessToken || !parsed.refreshToken || !parsed.user) {
    throw new Error(parsed.message);
  }

  return {
    user: parsed.user,
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
  };
}

/** Create account via admin API, then sign in. Edge-safe (fetch only). */
export async function signUpFast(
  email: string,
  password: string
): Promise<{ user: { id: string; email?: string }; accessToken: string; refreshToken: string }> {
  const { url } = requireSupabaseAuthEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_KEY must be set (server-side only)");
  }

  const createRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
    signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
  });

  if (!createRes.ok) {
    const payload = (await createRes.json().catch(() => ({}))) as {
      msg?: string;
      message?: string;
    };
    const msg = (payload.msg || payload.message || "").toLowerCase();
    if (!msg.includes("already") && !msg.includes("registered")) {
      throw new Error(payload.msg || payload.message || `Sign up failed (${createRes.status})`);
    }
  }

  return signInWithPasswordFast(email, password);
}

export async function getUserFromAccessTokenFast(
  accessToken: string
): Promise<{ id: string; email?: string } | null> {
  const { url, anonKey } = requireSupabaseAuthEnv();

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: authHeaders(anonKey, accessToken),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return null;

  const payload = (await res.json().catch(() => null)) as {
    id?: string;
    email?: string;
  } | null;

  if (!payload?.id) return null;
  return { id: payload.id, email: payload.email };
}
