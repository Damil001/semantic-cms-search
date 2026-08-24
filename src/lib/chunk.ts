export const DEFAULT_CHUNK_WORDS = 400;
export const DEFAULT_CHUNK_OVERLAP = 60;

/**
 * Split plain text into overlapping word windows.
 * Title is prepended to every chunk so title terms influence embeddings and FTS.
 */
export function chunkText(
  text: string,
  chunkSize = DEFAULT_CHUNK_WORDS,
  overlap = DEFAULT_CHUNK_OVERLAP
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length <= chunkSize) return [words.join(" ")];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end >= words.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

export function chunksForItem(title: string, body: string): string[] {
  const windows = chunkText(body);
  if (windows.length === 0) {
    return title.trim() ? [title.trim()] : [];
  }
  return windows.map((chunk) => `${title.trim()}\n\n${chunk}`);
}
