/**
 * Payments, plan limits and the Billing tab are off unless this is "true".
 * Inlined at build time, so changing it in Vercel needs a redeploy.
 */
export const BILLING_ENABLED = process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";
