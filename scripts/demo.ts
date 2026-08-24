/**
 * Local proof of hybrid ranking — no API keys, no network.
 *
 * Builds tiny bag-of-words vectors as a stand-in for embeddings, runs a
 * keyword rank, fuses with RRF (k=60), then collapses to one hit per item.
 * Types stay mixed in a single ranked list (blog / webinar / ebook).
 */
import { chunksForItem } from "../src/lib/chunk.js";
import { collapseToItems, reciprocalRankFusion } from "../src/lib/rrf.js";

interface MockItem {
  id: string;
  type: string;
  title: string;
  body: string;
}

const CORPUS: MockItem[] = [
  {
    id: "webflow:blogs:1",
    type: "blog",
    title: "Powering the next generation of AI data centers",
    body: "Hyperscale operators are building GPU clusters and liquid cooling to host large language models. Power density and grid interconnects now define site selection.",
  },
  {
    id: "webflow:webinars:2",
    type: "webinar",
    title: "GPU cooling for hyperscale facilities",
    body: "A live session on rear-door heat exchangers, liquid cooling loops, and how AI training racks change data hall design.",
  },
  {
    id: "webflow:ebooks:3",
    type: "ebook",
    title: "Enterprise AI infrastructure guide",
    body: "An ebook covering cluster networking, storage, and the facilities layer that AI data centers need before models go to production.",
  },
  {
    id: "webflow:blogs:4",
    type: "blog",
    title: "How to bake sourdough at home",
    body: "Starter feeding schedules, oven spring, and scoring patterns. Flour, water, salt — no servers involved.",
  },
  {
    id: "webflow:webinars:5",
    type: "webinar",
    title: "Marketing your SaaS product",
    body: "Positioning, lifecycle email, and paid acquisition for B2B software teams.",
  },
];

const QUERY = "AI data centers";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function termVector(tokens: string[], vocab: Map<string, number>): number[] {
  const vec = new Array(vocab.size).fill(0);
  for (const t of tokens) {
    const i = vocab.get(t);
    if (i !== undefined) vec[i] += 1;
  }
  return vec;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function keywordScore(queryTokens: string[], docTokens: string[]): number {
  const df = new Map<string, number>();
  for (const t of docTokens) df.set(t, (df.get(t) ?? 0) + 1);
  let s = 0;
  for (const t of queryTokens) {
    const c = df.get(t) ?? 0;
    if (c > 0) s += 1 + Math.log(1 + c);
  }
  return s;
}

interface ChunkRec {
  chunkId: string;
  itemId: string;
  type: string;
  title: string;
  content: string;
  tokens: string[];
}

function buildChunks(): ChunkRec[] {
  const out: ChunkRec[] = [];
  for (const item of CORPUS) {
    const texts = chunksForItem(item.title, item.body);
    texts.forEach((content, idx) => {
      out.push({
        chunkId: `${item.id}#${idx}`,
        itemId: item.id,
        type: item.type,
        title: item.title,
        content,
        tokens: tokenize(content),
      });
    });
  }
  return out;
}

function main(): void {
  const chunks = buildChunks();
  const vocab = new Map<string, number>();
  for (const c of chunks) {
    for (const t of c.tokens) {
      if (!vocab.has(t)) vocab.set(t, vocab.size);
    }
  }
  for (const t of tokenize(QUERY)) {
    if (!vocab.has(t)) vocab.set(t, vocab.size);
  }

  const qVec = termVector(tokenize(QUERY), vocab);
  const qTok = tokenize(QUERY);

  const semantic = [...chunks]
    .map((c) => ({
      ...c,
      sim: cosine(qVec, termVector(c.tokens, vocab)),
    }))
    .sort((a, b) => b.sim - a.sim);

  const keyword = [...chunks]
    .map((c) => ({
      ...c,
      kw: keywordScore(qTok, c.tokens),
    }))
    .filter((c) => c.kw > 0)
    .sort((a, b) => b.kw - a.kw);

  const fused = reciprocalRankFusion(
    [semantic.map((c) => c.chunkId), keyword.map((c) => c.chunkId)],
    60
  );

  const byId = new Map(chunks.map((c) => [c.chunkId, c]));
  const ordered = fused
    .map((f) => {
      const c = byId.get(f.id);
      return c ? { ...c, score: f.score } : null;
    })
    .filter((x): x is ChunkRec & { score: number } => x !== null);

  const collapsed = collapseToItems(ordered);

  console.log(`Query: "${QUERY}"`);
  console.log("Semantic order (chunk titles):");
  semantic.forEach((c, i) => {
    console.log(`  ${i + 1}. [${c.type}] ${c.title}  cos=${c.sim.toFixed(3)}`);
  });
  console.log("Keyword order:");
  keyword.forEach((c, i) => {
    console.log(`  ${i + 1}. [${c.type}] ${c.title}  kw=${c.kw.toFixed(3)}`);
  });
  console.log("RRF collapsed (one row per item, mixed types):");
  collapsed.forEach((c, i) => {
    console.log(`  ${i + 1}. [${c.type}] ${c.title}  rrf=${c.score.toFixed(4)}`);
  });

  const onTopic = new Set([
    "webflow:blogs:1",
    "webflow:webinars:2",
    "webflow:ebooks:3",
  ]);
  const topIds = collapsed.map((c) => c.itemId);
  const topThree = topIds.slice(0, 3);
  const types = new Set(collapsed.slice(0, 3).map((c) => c.type));
  const onTopicFirst = topThree.every((id) => onTopic.has(id));
  const mixedTop = types.size >= 2;
  const firstOnTopic = onTopic.has(topIds[0]);

  if (!mixedTop || !onTopicFirst || !firstOnTopic) {
    console.error("Demo assertions failed", { mixedTop, onTopicFirst, firstOnTopic, topIds });
    process.exit(1);
  }

  console.log("OK — cross-type list, RRF fusion, off-topic items rank last.");
}

main();
