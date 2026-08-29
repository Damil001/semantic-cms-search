import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  extractSearchCredentials,
  verifySearchAuth,
} from "../src/search/auth.js";
import { runSuggest } from "../src/search/suggest.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function parseLimit(raw: unknown): number | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  for (const [key, value] of Object.entries(CORS)) {
    res.setHeader(key, value);
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const q = typeof req.query.q === "string" ? req.query.q : "";
  if (!q.trim()) {
    res.status(400).json({ error: "Missing query parameter q" });
    return;
  }

  const { siteId, token } = extractSearchCredentials(req);
  if (!siteId || !token) {
    res.status(401).json({
      error:
        "Missing site and token. Add data-search-site and data-search-token from /app.",
    });
    return;
  }

  const auth = await verifySearchAuth(siteId, token);
  if (!auth) {
    res.status(403).json({ error: "Invalid site or search token" });
    return;
  }

  try {
    const body = await runSuggest({
      q,
      siteId: auth.siteId,
      limit: parseLimit(req.query.limit),
    });
    res.setHeader("Cache-Control", "public, max-age=15");
    res.status(200).json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Suggest failed";
    console.error(err);
    res.status(500).json({ error: message });
  }
}
