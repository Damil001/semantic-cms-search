import type { NextRequest } from "next/server";
import { runVercelHandler } from "@/lib/vercel-adapter";
import handler from "@/api/search";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  return runVercelHandler(handler, request);
}

export async function POST(request: NextRequest) {
  return runVercelHandler(handler, request);
}
