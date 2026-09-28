import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthUser } from "../../app/auth.js";
import { getEntitlement, PAST_DUE_GRACE_DAYS, PLAN_LABELS } from "../../app/billing.js";
import { getInstallForUser } from "../../app/session.js";
import { getServiceClient } from "../../lib/supabase.js";

async function enabledCollectionCount(siteId: string): Promise<number> {
  const { count } = await getServiceClient()
    .from("webflow_collection_maps")
    .select("collection_id", { count: "exact", head: true })
    .eq("site_id", siteId)
    .eq("enabled", true);
  return count ?? 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "GET only" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");

  const user = await getAuthUser(req);
  if (!user) {
    res.status(200).json({ authenticated: false });
    return;
  }

  const [ent, install] = await Promise.all([
    getEntitlement(user.id),
    getInstallForUser(req, user.id),
  ]);

  res.status(200).json({
    authenticated: true,
    userId: user.id,
    email: user.email ?? null,
    active: ent.active,
    plan: ent.plan,
    planLabel: ent.plan ? PLAN_LABELS[ent.plan] : null,
    source: ent.source,
    status: ent.status,
    billingCycle: ent.billingCycle,
    collectionLimit: ent.collectionLimit,
    extraCollections: ent.extraCollections,
    collectionsInUse: install?.site_id ? await enabledCollectionCount(install.site_id) : 0,
    renewsAt: ent.renewsAt,
    cancelsAt: ent.cancelsAt,
    graceEndsAt: ent.graceEndsAt,
    graceDays: PAST_DUE_GRACE_DAYS,
    grantExpiresAt: ent.grantExpiresAt,
    canManage: Boolean(ent.customerId),
  });
}
