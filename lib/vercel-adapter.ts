import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export async function runVercelHandler(
  handler: (req: VercelRequest, res: VercelResponse) => void | Promise<void>,
  request: NextRequest
): Promise<NextResponse> {
  const url = new URL(request.url);
  const query: Record<string, string | string[]> = {};
  url.searchParams.forEach((value, key) => {
    const existing = query[key];
    if (existing === undefined) query[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else query[key] = [existing, value];
  });

  let body: unknown = undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      body = await request.json().catch(() => ({}));
    } else {
      body = await request.text().catch(() => "");
    }
  }

  const vercelReq = {
    method: request.method,
    query,
    body,
    cookies: parseCookies(request.headers.get("cookie")),
    headers: Object.fromEntries(request.headers.entries()),
  } as VercelRequest;

  let statusCode = 200;
  const headers = new Headers();
  let bodyText: string | null = null;

  const vercelRes = {
    status(code: number) {
      statusCode = code;
      return vercelRes;
    },
    json(obj: unknown) {
      bodyText = JSON.stringify(obj);
      headers.set("content-type", "application/json");
      return vercelRes;
    },
    setHeader(name: string, value: string | number | string[]) {
      if (Array.isArray(value)) {
        headers.delete(name);
        for (const v of value) headers.append(name, String(v));
      } else {
        headers.set(name, String(value));
      }
      return vercelRes;
    },
    getHeader(name: string) {
      const lower = name.toLowerCase();
      if (lower === "set-cookie") {
        const all =
          typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
        if (all.length === 0) {
          const single = headers.get("set-cookie");
          return single ?? undefined;
        }
        if (all.length === 1) return all[0];
        return all;
      }
      return headers.get(name) ?? undefined;
    },
    redirect(statusOrUrl: number | string, url?: string) {
      if (typeof statusOrUrl === "string") {
        statusCode = 302;
        headers.set("location", statusOrUrl);
      } else {
        statusCode = statusOrUrl;
        headers.set("location", url ?? "/");
      }
      return vercelRes;
    },
    end(chunk?: string) {
      if (chunk != null) bodyText = chunk;
      return vercelRes;
    },
  } as VercelResponse;

  await handler(vercelReq, vercelRes);

  if (headers.get("location")) {
    return NextResponse.redirect(headers.get("location")!, statusCode);
  }

  return new NextResponse(bodyText, { status: statusCode, headers });
}
