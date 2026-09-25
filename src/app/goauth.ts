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

/** Error shown to users; `code` lets the form offer the right next step. */
export class AuthUserError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_credentials" | "account_exists" | "weak_password" | "invalid_email"
  ) {
    super(message);
    this.name = "AuthUserError";
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isInvalidCredentials(message: string): boolean {
  return /invalid login credentials|invalid email or password|invalid_grant/i.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Sign in with a user-facing error when the email/password pair is wrong. */
export async function signInFriendly(
  email: string,
  password: string
): Promise<{ user: { id: string; email?: string }; accessToken: string; refreshToken: string }> {
  try {
    return await signInWithPasswordFast(normalizeEmail(email), password);
  } catch (err) {
    if (err instanceof Error && isInvalidCredentials(err.message)) {
      throw new AuthUserError(
        "That email and password don’t match an account. Check the password, create an account, or reset your password.",
        "invalid_credentials"
      );
    }
    throw err;
  }
}

/** Create account via admin API, then sign in. Edge-safe (fetch only). */
export async function signUpFast(
  rawEmail: string,
  password: string
): Promise<{ user: { id: string; email?: string }; accessToken: string; refreshToken: string }> {
  const email = normalizeEmail(rawEmail);
  if (password.length < 6) {
    throw new AuthUserError("Use a password with at least 6 characters.", "weak_password");
  }

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
      error_code?: string;
    };
    const raw = payload.msg || payload.message || "";
    const msg = raw.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || payload.error_code === "email_exists") {
      try {
        return await signInWithPasswordFast(email, password);
      } catch {
        throw new AuthUserError(
          "An account with this email already exists. Sign in, or reset your password if you’ve forgotten it.",
          "account_exists"
        );
      }
    }
    if (msg.includes("password")) {
      throw new AuthUserError(raw || "Choose a stronger password.", "weak_password");
    }
    if (msg.includes("email")) {
      throw new AuthUserError(raw || "Enter a valid email address.", "invalid_email");
    }
    throw new Error(raw || `Sign up failed (${createRes.status})`);
  }

  // A just-created user can briefly be unavailable to the password grant.
  let lastError: unknown;
  for (const delay of [0, 400, 900, 1600]) {
    if (delay) await sleep(delay);
    try {
      return await signInWithPasswordFast(email, password);
    } catch (err) {
      lastError = err;
      if (!(err instanceof Error) || !isInvalidCredentials(err.message)) throw err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Account created, but sign-in failed. Try signing in.");
}

/** Send a password-reset email. Always resolves so callers can't enumerate accounts. */
export async function requestPasswordReset(rawEmail: string, redirectTo: string): Promise<void> {
  const { url, anonKey } = requireSupabaseAuthEnv();
  const res = await fetch(
    `${url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
    {
      method: "POST",
      headers: authHeaders(anonKey),
      body: JSON.stringify({ email: normalizeEmail(rawEmail), redirect_to: redirectTo }),
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    }
  );
  if (!res.ok && res.status !== 429) {
    console.error("password recover failed", res.status, await res.text().catch(() => ""));
  }
  if (res.status === 429) {
    throw new Error("Too many reset requests. Wait a few minutes and try again.");
  }
}

/** Set a new password using the access token from the recovery link. */
export async function updatePasswordWithRecoveryToken(
  accessToken: string,
  password: string
): Promise<void> {
  if (password.length < 6) {
    throw new AuthUserError("Use a password with at least 6 characters.", "weak_password");
  }
  const { url, anonKey } = requireSupabaseAuthEnv();
  const res = await fetch(`${url}/auth/v1/user`, {
    method: "PUT",
    headers: authHeaders(anonKey, accessToken),
    body: JSON.stringify({ password }),
    signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { msg?: string; message?: string };
    const msg = payload.msg || payload.message || "";
    if (res.status === 401 || res.status === 403) {
      throw new Error("This reset link has expired or was already used. Request a new one.");
    }
    throw new Error(msg || `Password update failed (${res.status})`);
  }
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

/** Exchange refresh token for a new session (keeps login alive across long OAuth). */
export async function refreshSessionFast(
  refreshToken: string
): Promise<{
  user: { id: string; email?: string };
  accessToken: string;
  refreshToken: string;
} | null> {
  if (!refreshToken) return null;
  const { url, anonKey } = requireSupabaseAuthEnv();

  let res: Response;
  try {
    res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: authHeaders(anonKey),
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
  } catch {
    return null;
  }

  const parsed = await readAuthResponse(res);
  if (!parsed.ok || !parsed.accessToken || !parsed.refreshToken || !parsed.user) {
    return null;
  }

  return {
    user: parsed.user,
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
  };
}
