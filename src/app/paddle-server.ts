import { Environment, LogLevel, Paddle } from "@paddle/paddle-node-sdk";

let instance: Paddle | null = null;

export function paddleEnvironment(): Environment {
  return process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox"
    ? Environment.sandbox
    : Environment.production;
}

/** Server-side Paddle client. Uses PADDLE_API_KEY, which must never reach the browser. */
export function getPaddle(): Paddle {
  if (instance) return instance;
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY is not set");
  instance = new Paddle(apiKey, { environment: paddleEnvironment(), logLevel: LogLevel.error });
  return instance;
}

type PriceRole =
  | { kind: "plan"; plan: "starter" | "growth"; cycle: "month" | "year" }
  | { kind: "extra_collection"; cycle: "month" | "year" };

/** Maps our Paddle price IDs to what they sell. Unknown prices grant nothing. */
export function priceRoles(): Map<string, PriceRole> {
  const env = process.env;
  const entries: [string | undefined, PriceRole][] = [
    [env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTHLY, { kind: "plan", plan: "starter", cycle: "month" }],
    [env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_YEARLY, { kind: "plan", plan: "starter", cycle: "year" }],
    [env.NEXT_PUBLIC_PADDLE_PRICE_GROWTH_MONTHLY, { kind: "plan", plan: "growth", cycle: "month" }],
    [env.NEXT_PUBLIC_PADDLE_PRICE_GROWTH_YEARLY, { kind: "plan", plan: "growth", cycle: "year" }],
    [env.NEXT_PUBLIC_PADDLE_PRICE_EXTRA_COLLECTION_MONTHLY, { kind: "extra_collection", cycle: "month" }],
    [env.NEXT_PUBLIC_PADDLE_PRICE_EXTRA_COLLECTION_YEARLY, { kind: "extra_collection", cycle: "year" }],
  ];
  const map = new Map<string, PriceRole>();
  for (const [id, role] of entries) if (id) map.set(id, role);
  return map;
}

/** Inverse of `priceRoles`: the price ID that sells a plan or extra collection on a cycle. */
export function priceIdFor(
  item: "starter" | "growth" | "extra_collection",
  cycle: "month" | "year"
): string | null {
  for (const [id, role] of priceRoles()) {
    if (role.cycle !== cycle) continue;
    if (item === "extra_collection" ? role.kind === "extra_collection" : role.kind === "plan" && role.plan === item) {
      return id;
    }
  }
  return null;
}
