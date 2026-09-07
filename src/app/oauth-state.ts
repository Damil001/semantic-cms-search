import { getServiceClient } from "../lib/supabase.js";

const STATE_TTL_MS = 15 * 60 * 1000;

export async function createOAuthState(userId: string, state: string): Promise<void> {
  const supabase = getServiceClient();
  const expiresAt = new Date(Date.now() + STATE_TTL_MS).toISOString();
  const { error } = await supabase.from("oauth_states").insert({
    state,
    user_id: userId,
    expires_at: expiresAt,
  });
  if (error) throw new Error(`OAuth state save failed: ${error.message}`);
}

/**
 * Validates CSRF state: must exist, belong to user (or pending anonymous),
 * not expired, and not already used. Marks used atomically.
 */
export async function consumeOAuthState(
  state: string,
  userId: string
): Promise<boolean> {
  const supabase = getServiceClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("oauth_states")
    .select("state, user_id, expires_at, used_at")
    .eq("state", state)
    .maybeSingle();

  if (error || !data) return false;
  if (data.used_at) return false;
  if (data.user_id !== userId) return false;
  if (String(data.expires_at) < now) return false;

  const { data: updated, error: updErr } = await supabase
    .from("oauth_states")
    .update({ used_at: now })
    .eq("state", state)
    .is("used_at", null)
    .select("state")
    .maybeSingle();

  if (updErr || !updated) return false;
  return true;
}
