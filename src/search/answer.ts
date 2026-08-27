import OpenAI from "openai";
import type { SearchResult } from "../types.js";

export type AnswerStatus = "matched" | "empty";

export interface SearchAnswer {
  answer: string;
  status: AnswerStatus;
}

function openaiClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

function fallbackAnswer(status: AnswerStatus, query: string): string {
  if (status === "empty") {
    return `We couldn't find content that matches “${query}”. Try a different phrase or browse related topics on the site.`;
  }
  return `Here are the most relevant resources we found for “${query}”.`;
}

/**
 * Short AI intro above CMS results. Grounded only in retrieved items for this site.
 * Zero hits → honest no-match copy (still model-generated when possible).
 */
export async function generateSearchAnswer(opts: {
  query: string;
  results: SearchResult[];
}): Promise<SearchAnswer> {
  const query = opts.query.trim();
  const status: AnswerStatus = opts.results.length > 0 ? "matched" : "empty";

  const sources = opts.results.slice(0, 5).map((r, i) => ({
    n: i + 1,
    type: r.type,
    title: r.title,
    snippet: (r.snippet || r.excerpt || "").slice(0, 280),
    url: r.url,
  }));

  try {
    const openai = openaiClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: status === "empty" ? 0.5 : 0.4,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content:
            status === "empty"
              ? `You write brief search feedback for a marketing website.
There are ZERO matching CMS items for this visitor query.
Write 1–2 friendly sentences: acknowledge the query and say nothing relevant was found.
Do not invent articles, products, links, or facts.
Do not mention AI, models, or other websites.
Do not suggest contacting support unless the query asks for help.`
              : `You write a short intro above CMS search results on a marketing website.
Use ONLY the provided source items. Acknowledge the visitor's query and briefly point to what is available (titles/types).
2–3 sentences max. Be helpful and natural, not salesy.
Do not invent content that is not in the list.
Do not mention AI or that you are a language model.
Do not list every URL; refer to items by title.`,
        },
        {
          role: "user",
          content:
            status === "empty"
              ? `Visitor query: ${query}`
              : `Visitor query: ${query}\n\nSources (JSON):\n${JSON.stringify(sources)}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      return { answer: fallbackAnswer(status, query), status };
    }
    return { answer: text, status };
  } catch (err) {
    console.error("generateSearchAnswer failed", err);
    return { answer: fallbackAnswer(status, query), status };
  }
}
