import type { VercelRequest } from "@vercel/node";
import { getEntitlement } from "../app/billing.js";
import { getServiceClient } from "../lib/supabase.js";

export interface SearchAuth {
  siteId: string;
  installId: string;
  userId: string | null;
}

function bearerToken(req: VercelRequest): string | undefined {
  const header = req.headers.authorization;
  if (typeof header !== "string") return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || undefined;
}

export function extractSearchCredentials(req: VercelRequest): {
  siteId?: string;
  token?: string;
} {
  const siteId =
    typeof req.query.site === "string" ? req.query.site.trim() : undefined;
  const queryToken =
    typeof req.query.token === "string" ? req.query.token.trim() : undefined;
  const token = bearerToken(req) || queryToken;
  return {
    siteId: siteId || undefined,
    token: token || undefined,
  };
}

/**
 * Verifies site + search_token belong to the same install.
 * Prevents querying another tenant's CMS context with a guessed site id.
 */
export async function verifySearchAuth(
  siteId: string,
  token: string
): Promise<SearchAuth | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("webflow_installs")
    .select("id, site_id, user_id")
    .eq("site_id", siteId)
    .eq("search_token", token)
    .maybeSingle();

  if (error || !data) return null;
  return {
    siteId: data.site_id as string,
    installId: data.id as string,
    userId: (data.user_id as string | null) ?? null,
  };
}

const PLAN_CACHE_MS = 60_000;
const planCache = new Map<string, { active: boolean; at: number }>();

/**
 * Whether the site owner has an active plan. Cached per warm instance, and fails open
 * on lookup errors so a database blip never takes paying customers' search offline.
 */
export async function searchPlanActive(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const hit = planCache.get(userId);
  if (hit && Date.now() - hit.at < PLAN_CACHE_MS) return hit.active;
  try {
    const active = (await getEntitlement(userId)).active;
    planCache.set(userId, { active, at: Date.now() });
    return active;
  } catch (err) {
    console.error("[search] plan lookup failed", err instanceof Error ? err.message : err);
    return true;
  }
}
