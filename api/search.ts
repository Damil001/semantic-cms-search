import type { VercelRequest, VercelResponse } from "@vercel/node";
import { logSearchEvent } from "../src/analytics/log.js";
import { generateSearchAnswer } from "../src/search/answer.js";
import {
  extractSearchCredentials,
  verifySearchAuth,
} from "../src/search/auth.js";
import { runSearch } from "../src/search/run.js";
import type { SearchResponse } from "../src/types.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

  const { siteId, token } = extractSearchCredentials(req);
  if (!siteId || !token) {
    res.status(401).json({
      error: "Missing site and token. Add data-search-site and data-search-token from /app.",
    });
    return;
  }

  const auth = await verifySearchAuth(siteId, token);
  if (!auth) {
    res.status(403).json({ error: "Invalid site or search token" });
    return;
  }

  try {
    const results = await runSearch({
      q,
      types: parseTypes(req.query.types),
      limit: parseLimit(req.query.limit),
      siteId: auth.siteId,
    });

    const { answer, status } = await generateSearchAnswer({
      query: q.trim(),
      results,
    });

    void logSearchEvent({
      siteId: auth.siteId,
      query: q.trim(),
      resultCount: results.length,
    });

    const body: SearchResponse = {
      query: q.trim(),
      answer,
      answerStatus: status,
      results,
    };
    res.status(200).json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    console.error(err);
    res.status(500).json({ error: message });
  }
}
