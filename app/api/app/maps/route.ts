import type { NextRequest } from "next/server";
import { runVercelHandler } from "@/lib/vercel-adapter";
import handler from "@/src/handlers/app/maps";

export async function PUT(request: NextRequest) {
  return runVercelHandler(handler, request);
}
