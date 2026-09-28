"use client";

export type BillingCycle = "monthly" | "yearly";
export type PaidPlan = "starter" | "growth";

type PaddleItem = { priceId: string; quantity: number };

type PaddleGlobal = {
  Environment: { set(env: "sandbox"): void };
  Initialize(opts: { token: string }): void;
  Checkout: {
    open(opts: {
      items: PaddleItem[];
      customer?: { email: string };
      customData?: Record<string, string>;
      settings?: {
        displayMode?: "overlay";
        theme?: "light" | "dark";
        locale?: string;
        successUrl?: string;
        allowLogout?: boolean;
      };
    }): void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

const PADDLE_JS = "https://cdn.paddle.com/paddle/v2/paddle.js";

// NEXT_PUBLIC_* values are inlined at build time, so each must be referenced literally.
const CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";
const ENVIRONMENT = process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox" ? "sandbox" : "production";

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

export function isCheckoutAvailable(
  plan: PaidPlan,
  cycle: BillingCycle,
  extraCollections = 0
): boolean {
  if (!CLIENT_TOKEN || !PRICE_IDS[plan][cycle]) return false;
  return extraCollections === 0 || Boolean(PRICE_IDS.extra_collection[cycle]);
}

let loading: Promise<PaddleGlobal> | null = null;

function loadPaddle(): Promise<PaddleGlobal> {
  if (window.Paddle) return Promise.resolve(window.Paddle);
  if (loading) return loading;
  loading = new Promise<PaddleGlobal>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PADDLE_JS;
    script.async = true;
    script.onload = () => {
      const paddle = window.Paddle;
      if (!paddle) {
        reject(new Error("Paddle failed to load"));
        return;
      }
      if (ENVIRONMENT === "sandbox") paddle.Environment.set("sandbox");
      paddle.Initialize({ token: CLIENT_TOKEN });
      resolve(paddle);
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("Could not reach Paddle checkout"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export async function openCheckout(opts: {
  plan: PaidPlan;
  cycle: BillingCycle;
  extraCollections: number;
  email?: string;
}): Promise<void> {
  const paddle = await loadPaddle();
  const items: PaddleItem[] = [{ priceId: PRICE_IDS[opts.plan][opts.cycle], quantity: 1 }];
  if (opts.extraCollections > 0) {
    items.push({
      priceId: PRICE_IDS.extra_collection[opts.cycle],
      quantity: opts.extraCollections,
    });
  }
  paddle.Checkout.open({
    items,
    customer: opts.email ? { email: opts.email } : undefined,
    customData: { plan: opts.plan, cycle: opts.cycle },
    settings: {
      displayMode: "overlay",
      theme: "light",
      locale: "en",
      successUrl: `${window.location.origin}/pricing?checkout=success`,
    },
  });
}
