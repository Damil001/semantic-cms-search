import { getServiceClient } from "../lib/supabase.js";

export type Plan = "starter" | "growth" | "scale";

export const PLAN_LABELS: Record<Plan, string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

/** Collections included before extras. Scale is unlimited. */
export const PLAN_COLLECTIONS: Record<Plan, number> = {
  starter: 10,
  growth: 25,
  scale: Number.POSITIVE_INFINITY,
};

export const PAST_DUE_GRACE_DAYS = 7;
const GRACE_MS = PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000;

const PLAN_RANK: Record<Plan, number> = { starter: 1, growth: 2, scale: 3 };

export interface SubscriptionRow {
  paddle_subscription_id: string;
  user_id: string | null;
  paddle_customer_id: string;
  status: string;
  plan: "starter" | "growth" | null;
  billing_cycle: "month" | "year" | null;
  extra_collections: number;
  current_period_end: string | null;
  scheduled_change_action: string | null;
  scheduled_change_at: string | null;
  past_due_since: string | null;
  last_event_at: string;
}

interface GrantRow {
  plan: Plan;
  extra_collections: number;
  note: string | null;
  expires_at: string | null;
}

export interface Entitlement {
  active: boolean;
  plan: Plan | null;
  source: "paddle" | "grant" | null;
  /** Included + extra collections; `null` means unlimited. */
  collectionLimit: number | null;
  extraCollections: number;
  status: string | null;
  billingCycle: "month" | "year" | null;
  renewsAt: string | null;
  cancelsAt: string | null;
  /** Set while a renewal payment is failing; access ends at this time. */
  graceEndsAt: string | null;
  grantExpiresAt: string | null;
  customerId: string | null;
  subscriptionId: string | null;
}

const NONE: Entitlement = {
  active: false,
  plan: null,
  source: null,
  collectionLimit: 0,
  extraCollections: 0,
  status: null,
  billingCycle: null,
  renewsAt: null,
  cancelsAt: null,
  graceEndsAt: null,
  grantExpiresAt: null,
  customerId: null,
  subscriptionId: null,
};

function limitFor(plan: Plan, extras: number): number | null {
  const base = PLAN_COLLECTIONS[plan];
  return Number.isFinite(base) ? base + extras : null;
}

function graceEnd(row: SubscriptionRow): number | null {
  if (row.status !== "past_due") return null;
  const since = Date.parse(row.past_due_since ?? row.last_event_at);
  return Number.isFinite(since) ? since + GRACE_MS : null;
}

export function subscriptionGrantsAccess(row: SubscriptionRow, now = Date.now()): boolean {
  if (!row.plan) return false;
  if (row.status === "active" || row.status === "trialing") return true;
  const end = graceEnd(row);
  return end != null && now < end;
}

function fromSubscription(row: SubscriptionRow, active: boolean): Entitlement {
  const plan = row.plan;
  const end = graceEnd(row);
  return {
    active,
    plan,
    source: "paddle",
    collectionLimit: plan && active ? limitFor(plan, row.extra_collections) : 0,
    extraCollections: row.extra_collections,
    status: row.status,
    billingCycle: row.billing_cycle,
    renewsAt: row.scheduled_change_action === "cancel" ? null : row.current_period_end,
    cancelsAt: row.scheduled_change_action === "cancel" ? row.scheduled_change_at : null,
    graceEndsAt: end != null ? new Date(end).toISOString() : null,
    grantExpiresAt: null,
    customerId: row.paddle_customer_id,
    subscriptionId: row.paddle_subscription_id,
  };
}

/** What this account may use right now. Reads only our own tables (no Paddle API call). */
export async function getEntitlement(userId: string): Promise<Entitlement> {
  const supabase = getServiceClient();
  const [subs, grant] = await Promise.all([
    supabase
      .from("billing_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("last_event_at", { ascending: false }),
    supabase.from("plan_grants").select("plan, extra_collections, note, expires_at").eq("user_id", userId).maybeSingle(),
  ]);
  if (subs.error) throw new Error(`billing lookup failed: ${subs.error.message}`);
  if (grant.error) throw new Error(`plan grant lookup failed: ${grant.error.message}`);

  const now = Date.now();
  const rows = (subs.data ?? []) as SubscriptionRow[];
  const paying = rows
    .filter((row) => subscriptionGrantsAccess(row, now))
    .sort((a, b) => PLAN_RANK[b.plan!] - PLAN_RANK[a.plan!]);

  const g = grant.data as GrantRow | null;
  const grantActive = Boolean(g && (!g.expires_at || Date.parse(g.expires_at) > now));

  if (paying[0] && (!grantActive || PLAN_RANK[paying[0].plan!] >= PLAN_RANK[g!.plan])) {
    return fromSubscription(paying[0], true);
  }
  if (g && grantActive) {
    return {
      ...NONE,
      active: true,
      plan: g.plan,
      source: "grant",
      collectionLimit: limitFor(g.plan, g.extra_collections),
      extraCollections: g.extra_collections,
      status: "active",
      grantExpiresAt: g.expires_at,
      customerId: rows[0]?.paddle_customer_id ?? null,
      subscriptionId: rows[0]?.paddle_subscription_id ?? null,
    };
  }
  return rows[0] ? fromSubscription(rows[0], false) : NONE;
}

export function planRequiredMessage(ent: Entitlement): string {
  if (ent.status === "past_due") {
    return "Your last Talaash payment failed and the 7-day grace period has ended. Update your payment method on the Billing tab to continue.";
  }
  if (ent.status === "paused") {
    return "Your Talaash subscription is paused. Resume it on the Billing tab to continue.";
  }
  if (ent.status === "canceled") {
    return "Your Talaash subscription has ended. Choose a plan on the Billing tab to continue.";
  }
  return "A Talaash plan is required for this step. Choose a plan on the Billing tab — you can keep exploring the dashboard for free.";
}
