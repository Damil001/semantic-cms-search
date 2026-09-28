import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthUser } from "../../app/auth.js";
import { getEntitlement } from "../../app/billing.js";
import { getPaddle } from "../../app/paddle-server.js";

/** Signed, short-lived link to Paddle's customer portal for the caller's own subscription. */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "Log in first" });
    return;
  }

  const ent = await getEntitlement(user.id);
  if (!ent.customerId) {
    res.status(404).json({ error: "No Talaash subscription found for this account." });
    return;
  }

  try {
    const session = await getPaddle().customerPortalSessions.create(
      ent.customerId,
      ent.subscriptionId ? [ent.subscriptionId] : []
    );
    const url =
      session.urls.subscriptions[0]?.updateSubscriptionPaymentMethod && ent.status === "past_due"
        ? session.urls.subscriptions[0].updateSubscriptionPaymentMethod
        : session.urls.general.overview;
    res.status(200).json({ url });
  } catch (err) {
    console.error("paddle portal session failed", err instanceof Error ? err.message : err);
    res.status(502).json({ error: "Could not open billing. Try again in a moment." });
  }
}
