"use client";

import { initializePaddle, type Environments, type Paddle } from "@paddle/paddle-js";

export type BillingCycle = "monthly" | "yearly";
export type PaidPlan = "starter" | "growth";

// NEXT_PUBLIC_* values are inlined at build time, so each must be referenced literally.
const CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";
const ENVIRONMENT: Environments =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox" ? "sandbox" : "production";

const PRICE_IDS: Record<PaidPlan | "extra_collection", Record<BillingCycle, string>> = {
  starter: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTHLY ?? "",
    yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_YEARLY ?? "",
  },
  growth: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_GROWTH_MONTHLY ?? "",
    yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_GROWTH_YEARLY ?? "",
  },
  extra_collection: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_EXTRA_COLLECTION_MONTHLY ?? "",
    yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_EXTRA_COLLECTION_YEARLY ?? "",
  },
};

export const isSandbox = ENVIRONMENT === "sandbox";

export function isCheckoutAvailable(
  plan: PaidPlan,
  cycle: BillingCycle,
  extraCollections = 0
): boolean {
  if (!CLIENT_TOKEN || !PRICE_IDS[plan][cycle]) return false;
  return extraCollections === 0 || Boolean(PRICE_IDS.extra_collection[cycle]);
}

// initializePaddle refuses a second call, so share one instance across the page.
let paddlePromise: Promise<Paddle> | null = null;

function getPaddle(): Promise<Paddle> {
  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      token: CLIENT_TOKEN,
      environment: ENVIRONMENT,
      eventCallback: (event) => {
        if (event.name === "checkout.error") console.error("Paddle checkout error", event.data);
      },
    }).then((paddle) => {
      if (!paddle) throw new Error("Could not reach Paddle checkout");
      return paddle;
    });
    paddlePromise.catch(() => {
      paddlePromise = null;
    });
  }
  return paddlePromise;
}

/** Opens checkout for a signed-in account; `userId` links the subscription to it via webhook. */
export async function openCheckout(opts: {
  plan: PaidPlan;
  cycle: BillingCycle;
  extraCollections: number;
  userId: string;
  email: string | null;
}): Promise<void> {
  const paddle = await getPaddle();
  const items = [{ priceId: PRICE_IDS[opts.plan][opts.cycle], quantity: 1 }];
  if (opts.extraCollections > 0) {
    items.push({
      priceId: PRICE_IDS.extra_collection[opts.cycle],
      quantity: opts.extraCollections,
    });
  }
  paddle.Checkout.open({
    items,
    ...(opts.email ? { customer: { email: opts.email } } : {}),
    customData: { user_id: opts.userId, plan: opts.plan, cycle: opts.cycle },
    settings: {
      displayMode: "overlay",
      variant: "one-page",
      theme: "light",
      locale: "en",
      allowLogout: !opts.email,
      successUrl: `${window.location.origin}/app?tab=billing&checkout=success`,
    },
  });
}
