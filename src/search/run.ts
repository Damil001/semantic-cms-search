import { embedQuery } from "../lib/embeddings.js";
import { collapseToItems, reciprocalRankFusion } from "../lib/rrf.js";
import { getServiceClient } from "../lib/supabase.js";
import type { SearchHit, SearchResult } from "../types.js";

const CANDIDATES = 40;
const RRF_K = 60;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

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
  siteId?: string;
}): Promise<SearchResult[]> {
  const q = opts.q.trim();
  if (!q) return [];

  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const filterTypes =
    opts.types && opts.types.length > 0 ? opts.types : null;
  const filterSite = opts.siteId?.trim() ? opts.siteId.trim() : null;

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

  const byChunk = new Map<string, SearchHit>();
  for (const row of semanticRows) {
    byChunk.set(row.chunk_id, toHit(row, row.similarity ?? 0));
  }
  for (const row of keywordRows) {
    if (!byChunk.has(row.chunk_id)) {
      byChunk.set(row.chunk_id, toHit(row, row.rank ?? 0));
    }
  }

  const fused = reciprocalRankFusion(
    [
      semanticRows.map((r) => r.chunk_id),
      keywordRows.map((r) => r.chunk_id),
    ],
    RRF_K
  );

  const orderedHits = fused
    .map((f) => {
      const hit = byChunk.get(f.id);
      if (!hit) return null;
      return { ...hit, score: f.score };
    })
    .filter((h): h is SearchHit => h !== null);

  const collapsed = collapseToItems(orderedHits).slice(0, limit);

  return collapsed.map((hit) => ({
    id: hit.itemId,
    type: hit.contentType,
    title: hit.title,
    excerpt: hit.excerpt,
    url: hit.url,
    image_url: hit.imageUrl,
    snippet: snippetFrom(hit.content) || hit.excerpt || "",
  }));
}
