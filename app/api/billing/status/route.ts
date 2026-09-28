import type { NextRequest } from "next/server";
import { runVercelHandler } from "@/lib/vercel-adapter";
import handler from "@/src/handlers/billing/status";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return runVercelHandler(handler, request);
}
