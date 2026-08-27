import { embedQuery } from "../lib/embeddings.js";
import { collapseToItems, reciprocalRankFusion } from "../lib/rrf.js";
import { getServiceClient } from "../lib/supabase.js";
import type { SearchHit, SearchResult } from "../types.js";

const CANDIDATES = 40;
const RRF_K = 60;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;
/** Drop semantic-only hits below this cosine similarity (text-embedding-3-small). */
const MIN_SEMANTIC_SIM = 0.34;
/** With no keyword matches, require the best semantic hit at least this strong. */
const MIN_SEMANTIC_TOP = 0.36;
/** After ranking, drop tail results below this fraction of the top RRF score. */
const MIN_RRF_RELATIVE = 0.55;

interface RpcRow {
  chunk_id: string;
  item_id: string;
  chunk_index: number;
  content: string;
  similarity?: number;
  rank?: number;
  source: string;
  content_type: string;
  title: string;
  excerpt: string | null;
  url: string;
  image_url: string | null;
}

function snippetFrom(content: string, max = 220): string {
  const withoutTitle = content.includes("\n\n")
    ? content.slice(content.indexOf("\n\n") + 2)
    : content;
  const trimmed = withoutTitle.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function toHit(row: RpcRow, score: number): SearchHit {
  return {
    chunkId: row.chunk_id,
    itemId: row.item_id,
    chunkIndex: row.chunk_index,
    content: row.content,
    score,
    source: row.source,
    contentType: row.content_type,
    title: row.title,
    excerpt: row.excerpt,
    url: row.url,
    imageUrl: row.image_url,
  };
}

export async function runSearch(opts: {
  q: string;
  types?: string[];
  limit?: number;
  /** Required — unscoped search would mix tenant corpora. */
  siteId: string;
}): Promise<SearchResult[]> {
  const q = opts.q.trim();
  if (!q) return [];

  const filterSite = opts.siteId.trim();
  if (!filterSite) {
    throw new Error("siteId is required");
  }

  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const filterTypes =
    opts.types && opts.types.length > 0 ? opts.types : null;

  const supabase = getServiceClient();
  const queryEmbedding = await embedQuery(q);

  const [semanticRes, keywordRes] = await Promise.all([
    supabase.rpc("match_chunks_semantic", {
      query_embedding: queryEmbedding,
      match_count: CANDIDATES,
      filter_types: filterTypes,
      filter_site: filterSite,
    }),
    supabase.rpc("match_chunks_keyword", {
      query_text: q,
      match_count: CANDIDATES,
      filter_types: filterTypes,
      filter_site: filterSite,
    }),
  ]);

  if (semanticRes.error) {
    throw new Error(`semantic RPC: ${semanticRes.error.message}`);
  }
  if (keywordRes.error) {
    throw new Error(`keyword RPC: ${keywordRes.error.message}`);
  }

  const semanticRows = (semanticRes.data ?? []) as RpcRow[];
  const keywordRows = (keywordRes.data ?? []) as RpcRow[];

  const itemSemantic = new Map<string, number>();
  for (const row of semanticRows) {
    const sim = row.similarity ?? 0;
    itemSemantic.set(
      row.item_id,
      Math.max(itemSemantic.get(row.item_id) ?? 0, sim)
    );
  }
  const keywordItems = new Set(keywordRows.map((r) => r.item_id));
  const topSemantic =
    semanticRows.length > 0 ? (semanticRows[0].similarity ?? 0) : 0;

  if (keywordRows.length === 0 && topSemantic < MIN_SEMANTIC_TOP) {
    return [];
  }

  const semanticForFusion = semanticRows.filter(
    (r) => (r.similarity ?? 0) >= MIN_SEMANTIC_SIM
  );

  const byChunk = new Map<string, SearchHit & { semanticSim: number }>();
  for (const row of semanticForFusion) {
    byChunk.set(row.chunk_id, {
      ...toHit(row, row.similarity ?? 0),
      semanticSim: row.similarity ?? 0,
    });
  }
  for (const row of keywordRows) {
    const existing = byChunk.get(row.chunk_id);
    if (existing) continue;
    byChunk.set(row.chunk_id, {
      ...toHit(row, row.rank ?? 0),
      semanticSim: itemSemantic.get(row.item_id) ?? 0,
    });
  }

  if (byChunk.size === 0) return [];

  const fused = reciprocalRankFusion(
    [
      semanticForFusion.map((r) => r.chunk_id),
      keywordRows.map((r) => r.chunk_id),
    ],
    RRF_K
  );

  const topRrf = fused[0]?.score ?? 0;
  const minRrf = topRrf * MIN_RRF_RELATIVE;

  const orderedHits = fused
    .map((f) => {
      const hit = byChunk.get(f.id);
      if (!hit || f.score < minRrf) return null;
      return { ...hit, score: f.score };
    })
    .filter((h): h is SearchHit & { semanticSim: number } => h !== null);

  const collapsed = collapseToItems(orderedHits).filter((hit) => {
    if (keywordItems.has(hit.itemId)) return true;
    return (itemSemantic.get(hit.itemId) ?? 0) >= MIN_SEMANTIC_SIM;
  });

  return collapsed.slice(0, limit).map((hit) => ({
    id: hit.itemId,
    type: hit.contentType,
    title: hit.title,
    excerpt: hit.excerpt,
    url: hit.url,
    image_url: hit.imageUrl,
    snippet: snippetFrom(hit.content) || hit.excerpt || "",
  }));
}
