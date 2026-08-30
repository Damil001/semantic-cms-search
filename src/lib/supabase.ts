import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "./supabase-url.js";

export { normalizeSupabaseUrl } from "./supabase-url.js";

function ensureWebSocketPolyfill(): void {
  if (typeof globalThis.WebSocket !== "undefined") return;
  // Lazy-load ws so auth/login routes don't pay cold-start cost.
  const { WebSocket } = require("ws") as typeof import("ws");
  Object.assign(globalThis, { WebSocket });
}

export function getServiceClient(): SupabaseClient {
  ensureWebSocketPolyfill();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (server-side only)");
  }
  return createClient(normalizeSupabaseUrl(url), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
