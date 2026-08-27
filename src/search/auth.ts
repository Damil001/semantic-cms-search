import type { VercelRequest } from "@vercel/node";
import { getServiceClient } from "../lib/supabase.js";

export interface SearchAuth {
  siteId: string;
  installId: string;
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
    .select("id, site_id")
    .eq("site_id", siteId)
    .eq("search_token", token)
    .maybeSingle();

  if (error || !data) return null;
  return { siteId: data.site_id as string, installId: data.id as string };
}
