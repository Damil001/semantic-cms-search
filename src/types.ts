/**
 * Source-agnostic content model.
 *
 * Item ids are namespaced: `{source}:{collectionOrType}:{nativeId}`
 * e.g. webflow:{collectionId}:{itemId}
 * Future Sanity/Contentful connectors write the same shape with a different `source`.
 */

export type ContentType = string;

export interface ContentItem {
  id: string;
  source: string;
  contentType: ContentType;
  title: string;
  excerpt: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface ContentChunk {
  id?: string;
  itemId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}

export interface SearchHit {
  chunkId: string;
  itemId: string;
  chunkIndex: number;
  content: string;
  score: number;
  source: string;
  contentType: string;
  title: string;
  excerpt: string | null;
  url: string;
  imageUrl: string | null;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  excerpt: string | null;
  url: string;
  image_url: string | null;
  snippet: string;
}

export function makeItemId(
  source: string,
  collectionKey: string,
  nativeId: string
): string {
  return `${source}:${collectionKey}:${nativeId}`;
}
