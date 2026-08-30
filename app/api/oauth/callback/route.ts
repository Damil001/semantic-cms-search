import type { NextRequest } from "next/server";
import { runVercelHandler } from "@/lib/vercel-adapter";
import handler from "@/src/handlers/oauth/callback";

export async function GET(request: NextRequest) {
  return runVercelHandler(handler, request);
}
