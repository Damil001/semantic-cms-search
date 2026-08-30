import type { NextRequest } from "next/server";
import { runVercelHandler } from "@/lib/vercel-adapter";
import handler from "@/src/handlers/app/content-insights";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return runVercelHandler(handler, request);
}
