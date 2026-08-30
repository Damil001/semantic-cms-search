import type { NextRequest } from "next/server";
import { runVercelHandler } from "@/lib/vercel-adapter";
import handler from "@/src/handlers/auth/session";

export async function GET(request: NextRequest) {
  return runVercelHandler(handler, request);
}

export async function POST(request: NextRequest) {
  return runVercelHandler(handler, request);
}
