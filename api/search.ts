import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runSearch } from "../src/search/run.js";
import { logSearchEvent } from "../src/analytics/log.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function parseTypes(raw: unknown): string[] | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

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

  try {
    const siteId =
      typeof req.query.site === "string" ? req.query.site : undefined;
    const results = await runSearch({
      q,
      types: parseTypes(req.query.types),
      limit: parseLimit(req.query.limit),
      siteId,
    });

    if (siteId) {
      void logSearchEvent({
        siteId,
        query: q.trim(),
        resultCount: results.length,
      });
    }

    res.status(200).json({ query: q.trim(), results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    console.error(err);
    res.status(500).json({ error: message });
  }
}
