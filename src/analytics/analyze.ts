import OpenAI from "openai";
import {
  buildAnalysisPayload,
  fetchQueryDataset,
  type QueryDataset,
} from "./fetch-queries.js";

export interface TopicTrend {
  topic: string;
  description: string;
  volume: "high" | "medium" | "low";
  exampleQueries: string[];
}

export interface ContentGap {
  query: string;
  searches: number;
  note: string;
}

export interface MarketingSuggestion {
  title: string;
  format: string;
  rationale: string;
  targetQueries: string[];
}

export interface ContentInsights {
  analyzedAt: string;
  eventsAnalyzed: number;
  uniqueQueries: number;
  summary: string;
  trends: TopicTrend[];
  contentGaps: ContentGap[];
  marketingSuggestions: MarketingSuggestion[];
}

interface RawInsights {
  summary?: string;
  trends?: TopicTrend[];
  contentGaps?: ContentGap[];
  marketingSuggestions?: MarketingSuggestion[];
}

function openaiClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

function normalizeInsights(raw: RawInsights, dataset: QueryDataset): ContentInsights {
  return {
    analyzedAt: new Date().toISOString(),
    eventsAnalyzed: dataset.eventsFetched,
    uniqueQueries: dataset.uniqueQueries,
    summary: String(raw.summary ?? "No summary generated."),
    trends: Array.isArray(raw.trends) ? raw.trends.slice(0, 8) : [],
    contentGaps: Array.isArray(raw.contentGaps) ? raw.contentGaps.slice(0, 10) : [],
    marketingSuggestions: Array.isArray(raw.marketingSuggestions)
      ? raw.marketingSuggestions.slice(0, 8)
      : [],
  };
}

export async function analyzeSearchQueries(siteId: string): Promise<ContentInsights> {
  const dataset = await fetchQueryDataset(siteId);

  if (dataset.eventsFetched === 0) {
    return {
      analyzedAt: new Date().toISOString(),
      eventsAnalyzed: 0,
      uniqueQueries: 0,
      summary:
        "No search data yet. Embed search on your site and collect queries before running analysis.",
      trends: [],
      contentGaps: [],
      marketingSuggestions: [],
    };
  }

  const payload = buildAnalysisPayload(dataset);
  const openai = openaiClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a search intelligence analyst for a marketing/CMS team.
Given aggregated site search logs, identify topic trends, content gaps (especially zero-result searches), and concrete content ideas.

Return JSON only with this shape:
{
  "summary": "2-3 sentence executive overview",
  "trends": [{ "topic": "...", "description": "...", "volume": "high|medium|low", "exampleQueries": ["..."] }],
  "contentGaps": [{ "query": "...", "searches": number, "note": "why this is a gap" }],
  "marketingSuggestions": [{ "title": "...", "format": "blog|webinar|guide|case study|FAQ|landing page", "rationale": "...", "targetQueries": ["..."] }]
}

Rules:
- Group similar queries into themes; do not list every raw query as its own trend.
- Prioritize zero-result and low-result queries as content gaps.
- Marketing suggestions must be actionable titles the team could publish next.
- Be specific to the actual queries provided; avoid generic SEO advice.`,
      },
      {
        role: "user",
        content: payload,
      },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Analysis returned empty response");

  let parsed: RawInsights;
  try {
    parsed = JSON.parse(text) as RawInsights;
  } catch {
    throw new Error("Analysis returned invalid JSON");
  }

  return normalizeInsights(parsed, dataset);
}
