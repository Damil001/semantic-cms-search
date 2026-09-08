import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public widget bootstrap: current search.js URL + SRI.
 * Used by search-loader.js so Custom Code never needs reinstall when search.js changes.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  let buf: Buffer;
  try {
    const filePath = path.join(process.cwd(), "public", "search.js");
    buf = await readFile(filePath);
  } catch {
    const res = await fetch(`${origin}/search.js`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "search.js unavailable" }, { status: 503 });
    }
    buf = Buffer.from(await res.arrayBuffer());
  }

  const digest = createHash("sha256").update(buf).digest("base64");
  const integrity = `sha256-${digest}`;
  const patch = createHash("sha256").update(buf).digest("hex").slice(0, 8);
  const version = `1.0.${Number.parseInt(patch, 16) % 1_000_000_000}`;

  return NextResponse.json(
    {
      src: `${origin}/search.js?v=${version}`,
      integrity,
      version,
    },
    {
      headers: {
        "cache-control": "public, max-age=60, stale-while-revalidate=600",
        "access-control-allow-origin": "*",
      },
    }
  );
}
