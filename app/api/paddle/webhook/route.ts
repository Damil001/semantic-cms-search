import type { NextRequest } from "next/server";
import { processPaddleEvent } from "@/src/app/billing-sync";
import { getPaddle } from "@/src/app/paddle-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();
  const secret = process.env.PADDLE_WEBHOOK_SECRET ?? "";

  if (!signature || !rawBody) {
    return Response.json({ error: "Missing signature or body" }, { status: 400 });
  }

  // Any non-2xx makes Paddle retry, so a bad signature or a transient DB error never loses an event.
  try {
    const event = await getPaddle().webhooks.unmarshal(rawBody, secret, signature);
    await processPaddleEvent(event);
    return Response.json({ received: true });
  } catch (err) {
    console.error("paddle webhook error", err instanceof Error ? err.message : err);
    return Response.json({ error: "Webhook not processed" }, { status: 500 });
  }
}
