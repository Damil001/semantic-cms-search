import { getServiceClient } from "../lib/supabase.js";
import { getPromptAnalytics } from "./prompt-analytics.js";
import OpenAI from "openai";

export type AnswerReadiness = "ready" | "partial" | "weak";

export interface AeoPageScore {
  id: string;
  title: string;
  url: string;
  contentType: string;
  score: number;
  readiness: AnswerReadiness;
  strengths: string[];
  fixes: string[];
  wordCount: number;
  publishedAt: string | null;
}

export interface AeoBrief {
  question: string;
  searchDemand: number;
  opportunity: string;
  suggestedTitle: string;
  format: string;
  outline: string[];
  factsToInclude: string[];
  schemaHint: string;
  rationale: string;
}

export interface AeoReport {
  analyzedAt: string;
  days: number;
  summary: string;
  stats: {
    pagesScored: number;
    readyCount: number;
    partialCount: number;
    weakCount: number;
    avgScore: number;
    gapCount: number;
    briefCount: number;
  };
  pages: AeoPageScore[];
  briefs: AeoBrief[];
  tips: string[];
}

type ItemRow = {
  id: string;
  title: string;
  excerpt: string | null;
  url: string;
  content_type: string;
  published_at: string | null;
};

type ChunkRow = {
  item_id: string;
  content: string;
};

function readinessFromScore(score: number): AnswerReadiness {
  if (score >= 70) return "ready";
  if (score >= 45) return "partial";
  return "weak";
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function scorePage(
  item: ItemRow,
  body: string
): Omit<AeoPageScore, "id" | "title" | "url" | "contentType" | "publishedAt"> {
  const title = item.title ?? "";
  const excerpt = item.excerpt ?? "";
  const text = `${title}\n${excerpt}\n${body}`.trim();
  const words = wordCount(text);
  const strengths: string[] = [];
  const fixes: string[] = [];
  let score = 20;

  const questionTitle =
    /\?$/.test(title.trim()) ||
    /^(how|what|why|when|where|who|which|can|does|is|are)\b/i.test(title.trim());
  if (questionTitle) {
    score += 18;
    strengths.push("Title reads like a clear question or answer prompt");
  } else {
    fixes.push("Reframe the title as the question people ask (or a direct answer)");
  }

  if (/\b(how to|step|steps|guide|faq|what is|vs\.?|versus)\b/i.test(text)) {
    score += 12;
    strengths.push("Contains how-to / FAQ / comparison language models can quote");
  } else {
    fixes.push("Add a short FAQ or numbered steps AIs can lift as an answer");
  }

  if (/\d/.test(text)) {
    score += 10;
    strengths.push("Includes specific numbers or facts");
  } else {
    fixes.push("Add concrete facts (numbers, dates, named products) for citability");
  }

  if (words >= 400) {
    score += 16;
    strengths.push("Enough depth for an answer engine to cite");
  } else if (words >= 150) {
    score += 8;
    fixes.push("Expand thin sections — aim for a full answer, not a teaser");
  } else {
    fixes.push("Content is too thin for reliable AI citations — expand the body");
  }

  if (excerpt && excerpt.trim().length >= 80) {
    score += 8;
    strengths.push("Has a usable excerpt / summary");
  } else {
    fixes.push("Add a 1–2 sentence summary that directly answers the page intent");
  }

  if (item.published_at) {
    const ageDays =
      (Date.now() - new Date(item.published_at).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 365) {
      score += 8;
      strengths.push("Relatively fresh publish date");
    } else if (ageDays > 730) {
      fixes.push("Update or refresh stale content so answer engines trust it");
    }
  } else {
    fixes.push("Set a publish date in CMS when possible");
  }

  if (/https?:\/\//i.test(body)) {
    score += 4;
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    readiness: readinessFromScore(score),
    strengths: strengths.slice(0, 4),
    fixes: fixes.slice(0, 4),
    wordCount: words,
  };
}

async function fetchPages(siteId: string): Promise<AeoPageScore[]> {
  const supabase = getServiceClient();
  const { data: items, error } = await supabase
    .from("content_items")
    .select("id, title, excerpt, url, content_type, published_at")
    .eq("site_id", siteId)
    .order("updated_at", { ascending: false })
    .limit(60);

  if (error) throw new Error(error.message);
  const rows = (items ?? []) as ItemRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: chunks } = await supabase
    .from("content_chunks")
    .select("item_id, content")
    .in("item_id", ids)
    .order("chunk_index", { ascending: true })
    .limit(400);

  const bodyByItem = new Map<string, string>();
  for (const chunk of (chunks ?? []) as ChunkRow[]) {
    const prev = bodyByItem.get(chunk.item_id) ?? "";
    if (prev.length > 6000) continue;
    bodyByItem.set(chunk.item_id, `${prev}\n${chunk.content}`.trim());
  }

  return rows
    .map((item) => {
      const scored = scorePage(item, bodyByItem.get(item.id) ?? "");
      return {
        id: item.id,
        title: item.title,
        url: item.url,
        contentType: item.content_type,
        publishedAt: item.published_at,
        ...scored,
      };
    })
    .sort((a, b) => a.score - b.score);
}

function heuristicBriefs(
  gaps: { query: string; count: number; opportunity: string }[]
): AeoBrief[] {
  return gaps.slice(0, 8).map((g) => {
    const q = g.query.trim();
    const isHow = /^how\b/i.test(q);
    const isWhat = /^what\b/i.test(q);
    return {
      question: q,
      searchDemand: g.count,
      opportunity: g.opportunity,
      suggestedTitle: isHow
        ? q.replace(/^how\s+/i, "How to ").replace(/\?$/, "")
        : isWhat
          ? q
          : `${q}: a clear answer`,
      format: isHow ? "How-to guide" : isWhat ? "Explainer / FAQ" : "Answer page",
      outline: [
        `Direct answer in the first 40–60 words`,
        `Key points or steps for “${q}”`,
        `Proof, examples, or data`,
        `Related questions (FAQ)`,
        `CTA / next step`,
      ],
      factsToInclude: [
        "Named product or service specifics",
        "At least one number, date, or measurable claim",
        "Who this is for / who it isn’t for",
      ],
      schemaHint: isHow ? "HowTo + FAQPage JSON-LD" : "FAQPage or Article JSON-LD",
      rationale: `On-site search shows ${g.count} request(s) with weak/no results — publish a page that answers this plainly for humans and answer engines.`,
    };
  });
}

async function enrichBriefsWithLlm(briefs: AeoBrief[]): Promise<AeoBrief[]> {
  if (briefs.length === 0 || !process.env.OPENAI_API_KEY) return briefs;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You improve AEO (answer engine optimization) content briefs.
Return JSON: { "briefs": [{ "question": "...", "suggestedTitle": "...", "format": "...", "outline": ["..."], "factsToInclude": ["..."], "schemaHint": "...", "rationale": "..." }] }
Keep the same questions. Make outlines specific and actionable for Webflow CMS pages. No generic SEO filler.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            briefs: briefs.map((b) => ({
              question: b.question,
              searchDemand: b.searchDemand,
              opportunity: b.opportunity,
            })),
          }),
        },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) return briefs;
    const parsed = JSON.parse(text) as { briefs?: Partial<AeoBrief>[] };
    if (!Array.isArray(parsed.briefs)) return briefs;

    return briefs.map((base) => {
      const match =
        parsed.briefs?.find(
          (b) =>
            String(b.question ?? "").toLowerCase() === base.question.toLowerCase()
        ) ?? parsed.briefs?.[briefs.indexOf(base)];
      if (!match) return base;
      return {
        ...base,
        suggestedTitle: String(match.suggestedTitle ?? base.suggestedTitle),
        format: String(match.format ?? base.format),
        outline: Array.isArray(match.outline)
          ? match.outline.map(String).slice(0, 8)
          : base.outline,
        factsToInclude: Array.isArray(match.factsToInclude)
          ? match.factsToInclude.map(String).slice(0, 6)
          : base.factsToInclude,
        schemaHint: String(match.schemaHint ?? base.schemaHint),
        rationale: String(match.rationale ?? base.rationale),
      };
    });
  } catch (err) {
    console.error("aeo llm briefs failed", err);
    return briefs;
  }
}

export async function buildAeoReport(siteId: string, days = 30): Promise<AeoReport> {
  const [pages, analytics] = await Promise.all([
    fetchPages(siteId),
    getPromptAnalytics(siteId, days).catch(() => null),
  ]);

  const gaps = (analytics?.contentGaps ?? [])
    .filter((g) => g.resultQuality !== "good")
    .slice(0, 10)
    .map((g) => ({
      query: g.query,
      count: g.count,
      opportunity: g.opportunity,
    }));

  let briefs = heuristicBriefs(gaps);
  briefs = await enrichBriefsWithLlm(briefs);

  const readyCount = pages.filter((p) => p.readiness === "ready").length;
  const partialCount = pages.filter((p) => p.readiness === "partial").length;
  const weakCount = pages.filter((p) => p.readiness === "weak").length;
  const avgScore =
    pages.length === 0
      ? 0
      : Math.round(pages.reduce((s, p) => s + p.score, 0) / pages.length);

  const tips = [
    "Lead with a direct answer in the first paragraph — answer engines often cite the opening.",
    "Turn high-demand gap questions into FAQ or how-to pages, then re-index in Setup.",
    "Add FAQPage / HowTo structured data in Webflow where the brief suggests it.",
    "Talaash scores pages from your index; publish and re-index after edits to refresh scores.",
  ];

  let summary: string;
  if (pages.length === 0) {
    summary =
      "No indexed pages yet. Map collections and run Index CMS in Setup, then return here for answer-readiness scores.";
  } else if (gaps.length === 0) {
    summary = `Scored ${pages.length} indexed pages (avg ${avgScore}/100). No major on-site search gaps in the last ${days} days — keep strengthening weak pages for answer engines.`;
  } else {
    summary = `Scored ${pages.length} pages (avg ${avgScore}/100). ${gaps.length} unanswered or weak on-site questions map to AEO briefs — publish clear answer pages, then re-index.`;
  }

  return {
    analyzedAt: new Date().toISOString(),
    days,
    summary,
    stats: {
      pagesScored: pages.length,
      readyCount,
      partialCount,
      weakCount,
      avgScore,
      gapCount: gaps.length,
      briefCount: briefs.length,
    },
    pages: pages.slice(0, 40),
    briefs,
    tips,
  };
}
