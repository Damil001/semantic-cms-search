import type { NextRequest } from "next/server";
import { runVercelHandler } from "@/lib/vercel-adapter";
import handler from "@/api/app/collections";

export async function GET(request: NextRequest) {
  return runVercelHandler(handler, request);
}
