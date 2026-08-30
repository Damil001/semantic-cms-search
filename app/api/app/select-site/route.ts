import type { NextRequest } from "next/server";
import { runVercelHandler } from "@/lib/vercel-adapter";
import handler from "@/src/handlers/app/select-site";

export async function POST(request: NextRequest) {
  return runVercelHandler(handler, request);
}
