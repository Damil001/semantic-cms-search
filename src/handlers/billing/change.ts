import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthUser } from "../../app/auth.js";
import { getEntitlement } from "../../app/billing.js";
import { getPaddle, priceIdFor } from "../../app/paddle-server.js";

const MAX_EXTRA_COLLECTIONS = 50;

/**
 * Switches the caller's own subscription between Starter and Growth and/or changes the
 * number of extra collections. Prorated immediately; the webhook records the result.
 */
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

  const plan = req.body?.plan;
  const extras = Number(req.body?.extraCollections);
  if ((plan !== "starter" && plan !== "growth") || !Number.isInteger(extras) || extras < 0 || extras > MAX_EXTRA_COLLECTIONS) {
    res.status(400).json({ error: "Choose Starter or Growth and 0–50 extra collections." });
    return;
  }

  const ent = await getEntitlement(user.id);
  if (ent.source !== "paddle" || !ent.subscriptionId || !ent.billingCycle) {
    res.status(404).json({ error: "No active Talaash subscription found for this account." });
    return;
  }
  if (ent.status !== "active" && ent.status !== "trialing") {
    res.status(409).json({ error: "Update your payment method before changing plans." });
    return;
  }

  const planPrice = priceIdFor(plan, ent.billingCycle);
  const extraPrice = priceIdFor("extra_collection", ent.billingCycle);
  if (!planPrice || (extras > 0 && !extraPrice)) {
    res.status(503).json({ error: "Plan changes are not available right now. Contact support." });
    return;
  }

  const items = [{ priceId: planPrice, quantity: 1 }];
  if (extras > 0) items.push({ priceId: extraPrice!, quantity: extras });

  try {
    await getPaddle().subscriptions.update(ent.subscriptionId, {
      items,
      prorationBillingMode: "prorated_immediately",
      onPaymentFailure: "prevent_change",
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("paddle subscription change failed", err instanceof Error ? err.message : err);
    res.status(502).json({
      error: "Paddle could not apply that change. Check your payment method and try again.",
    });
  }
}
