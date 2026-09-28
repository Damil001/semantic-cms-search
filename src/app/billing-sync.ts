import type { EventEntity, SubscriptionNotification } from "@paddle/paddle-node-sdk";
import { getServiceClient } from "../lib/supabase.js";
import type { SubscriptionRow } from "./billing.js";
import { priceRoles } from "./paddle-server.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FOREIGN_KEY_VIOLATION = "23503";

function summarizeItems(sub: SubscriptionNotification) {
  const roles = priceRoles();
  let plan: SubscriptionRow["plan"] = null;
  let cycle: SubscriptionRow["billing_cycle"] = null;
  let extras = 0;
  for (const item of sub.items) {
    if (item.status !== "active" && item.status !== "trialing") continue;
    const role = item.price ? roles.get(item.price.id) : undefined;
    if (!role) continue;
    if (role.kind === "plan") {
      plan = role.plan;
      cycle = role.cycle;
    } else {
      extras += item.quantity;
    }
  }
  return { plan, cycle, extras };
}

function userIdFrom(sub: SubscriptionNotification): string | null {
  const raw = sub.customData?.user_id;
  return typeof raw === "string" && UUID.test(raw) ? raw : null;
}

/**
 * Mirrors a Paddle subscription into billing_subscriptions. Idempotent and convergent:
 * retries and out-of-order deliveries never move a row back to an older state.
 */
export async function syncSubscription(sub: SubscriptionNotification, occurredAt: string): Promise<void> {
  const supabase = getServiceClient();
  const { data: existing, error: readErr } = await supabase
    .from("billing_subscriptions")
    .select("user_id, last_event_at, past_due_since")
    .eq("paddle_subscription_id", sub.id)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (existing && Date.parse(existing.last_event_at) > Date.parse(occurredAt)) return;

  const { plan, cycle, extras } = summarizeItems(sub);
  if (!plan) console.warn("Paddle subscription has no recognised plan price", sub.id);

  const row = {
    paddle_subscription_id: sub.id,
    user_id: userIdFrom(sub) ?? (existing?.user_id as string | null) ?? null,
    paddle_customer_id: sub.customerId,
    status: sub.status,
    plan,
    billing_cycle: cycle,
    extra_collections: extras,
    current_period_end: sub.currentBillingPeriod?.endsAt ?? sub.nextBilledAt ?? null,
    scheduled_change_action: sub.scheduledChange?.action ?? null,
    scheduled_change_at: sub.scheduledChange?.effectiveAt ?? null,
    past_due_since:
      sub.status === "past_due" ? ((existing?.past_due_since as string | null) ?? occurredAt) : null,
    last_event_at: occurredAt,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase.from("billing_subscriptions").upsert(row);
  if (error?.code === FOREIGN_KEY_VIOLATION && row.user_id) {
    console.warn("Paddle subscription references an unknown user; storing without owner", sub.id);
    ({ error } = await supabase.from("billing_subscriptions").upsert({ ...row, user_id: null }));
  }
  if (error) throw new Error(error.message);
}

export async function processPaddleEvent(event: EventEntity): Promise<void> {
  if (event.eventType.startsWith("subscription.")) {
    await syncSubscription(event.data as SubscriptionNotification, event.occurredAt);
  }
}
