import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { WebSocket as NodeWebSocket } from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  Object.assign(globalThis, { WebSocket: NodeWebSocket });
}

/** Project URL only — no /rest/v1, /graphql, or trailing slash. */
export function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "")
    .replace(/\/graphql\/v1$/i, "");
}

export function getServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (server-side only)");
  }
  return createClient(normalizeSupabaseUrl(url), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
