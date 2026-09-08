import { track } from "@vercel/analytics";

type Props = Record<string, string | number | boolean | null>;

/** Client-side custom event → Vercel Web Analytics. No-ops safely in dev. */
export function trackEvent(name: string, props?: Props): void {
  try {
    track(name, props);
  } catch {
    /* analytics must never break UX */
  }
}
