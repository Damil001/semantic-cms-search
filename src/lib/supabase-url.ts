/** Project URL only — no /rest/v1, /graphql, or trailing slash. */
export function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "")
    .replace(/\/graphql\/v1$/i, "");
}

export function requireSupabaseAuthEnv(): { url: string; anonKey: string } {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set for auth");
  }
  return { url: normalizeSupabaseUrl(url), anonKey };
}
