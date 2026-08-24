/**
 * Reciprocal Rank Fusion (Cormack et al.).
 * score(d) = Σ 1 / (k + rank_i(d)) across ranked lists. Default k=60.
 */
export function reciprocalRankFusion(
  rankedLists: string[][],
  k = 60
): { id: string; score: number }[] {
  const scores = new Map<string, number>();
  for (const list of rankedLists) {
    list.forEach((id, index) => {
      const rank = index + 1;
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank));
    });
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Keep fused chunk order but emit each parent item only once (best chunk wins).
 */
export function collapseToItems<T extends { itemId: string }>(ordered: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const hit of ordered) {
    if (seen.has(hit.itemId)) continue;
    seen.add(hit.itemId);
    out.push(hit);
  }
  return out;
}
