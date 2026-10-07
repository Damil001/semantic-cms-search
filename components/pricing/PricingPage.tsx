"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { trackEvent } from "@/lib/analytics";
import { BILLING_ENABLED } from "@/lib/billing-flag";
import {
  isCheckoutAvailable,
  isSandbox,
  openCheckout,
  type BillingCycle,
  type PaidPlan,
} from "@/lib/paddle";

/** Price per extra CMS collection beyond a plan's included collections. */
const EXTRA_COLLECTION = { monthly: 5, yearly: 50 } as const;
const MAX_EXTRA_COLLECTIONS = 50;

type Tier = {
  id: PaidPlan | "scale";
  name: string;
  blurb: string;
  price: { monthly: number; yearly: number } | null;
  includedCollections: number | null;
  featured: boolean;
  scope: string;
  features: readonly string[];
};

const TIERS: readonly Tier[] = [
  {
    id: "starter",
    name: "Starter",
    blurb: "One site, core search — ideal to prove value quickly.",
    price: { monthly: 49, yearly: 490 },
    includedCollections: 10,
    featured: false,
    scope: "10 collections · 1 search page · 2 re-indexes/mo",
    features: [
      "Connect Webflow, automatic field mapping, one-click script install",
      "Semantic + keyword search across your CMS",
      "Hosted search API, embeddings, and index",
      "Designer-native result cards",
      "Search analytics: volume and popular prompts",
      "Content gap signals for SEO / AEO",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    blurb: "More collections and polish — the plan most sites choose.",
    price: { monthly: 79, yearly: 790 },
    includedCollections: 25,
    featured: true,
    scope: "25 collections · filters · 4 re-indexes/mo",
    features: [
      "Everything in Starter",
      "Type filters and styled result cards",
      "Priority re-index when CMS changes",
      "Content intelligence and AEO-oriented reports",
      "AI answers grounded in your indexed pages",
      "Email support with faster turnaround",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    blurb: "For agencies, multi-brand sites, or high search volume.",
    price: null,
    includedCollections: null,
    featured: false,
    scope: "Unlimited collections · SLA",
    features: [
      "Everything in Growth",
      "Unlimited CMS collections",
      "Custom relevance thresholds",
      "Agency / multi-brand options",
      "Priority support and uptime SLA",
      "Extra locales and search surfaces",
    ],
  },
];

const INCLUDED = [
  {
    title: "Meaning-based search",
    body: "Visitors ask in plain language; results rank by intent across CMS collections.",
  },
  {
    title: "SEO & AEO from real queries",
    body: "See what people searched, what’s missing, and what to publish next.",
  },
  {
    title: "Webflow-native",
    body: "Connect with Webflow, install the script in one click, and style results in the Designer.",
  },
  {
    title: "Hosted index",
    body: "Embeddings, search API, and re-indexing run on our infrastructure — nothing to host.",
  },
] as const;

const FAQS = [
  {
    q: "How does billing work?",
    a: "Plans are subscriptions billed monthly or yearly. Payments are processed by Paddle, our reseller and merchant of record, which also handles sales tax and VAT and sends your receipts.",
  },
  {
    q: "What if I need more collections?",
    a: "Add extra collections to Starter or Growth at checkout for $5/month each ($50/year). Your subscription price increases by that amount.",
  },
  {
    q: "Can I cancel or change plans?",
    a: "Yes. Cancel anytime and your plan stays active until the end of the period you paid for. You can move between plans when you need more collections or features.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Every new account gets 14 days of Growth free — index your CMS, install search on your live site and use every report. No card needed. Choose a plan before the trial ends to keep search running.",
  },
] as const;

const FAQS_NO_BILLING = [
  {
    q: "How do I get started?",
    a: "Create an account, connect your Webflow site, and Talaash maps and indexes your CMS. Install search on your site in one click, then style results in the Designer.",
  },
  {
    q: "What if I need more collections?",
    a: "Starter includes 10 CMS collections and Growth includes 25. Contact us if you need more, or ask about Scale for unlimited collections.",
  },
] as const;

function formatPrice(tier: Tier, cycle: BillingCycle, extras: number) {
  if (!tier.price) return null;
  const total = tier.price[cycle] + extras * EXTRA_COLLECTION[cycle];
  return `$${total.toLocaleString("en-US")}`;
}

function tierButtonClass(tier: Tier): string {
  return tier.featured
    ? "btn btn-pricing-pill btn-pricing-pill--filled mt-lg"
    : "btn btn-pricing-pill mt-lg";
}

function ScaleTier({ tier }: { tier: Tier }) {
  return (
    <>
      <div className="pricing-price pricing-display" style={{ fontSize: 36 }}>
        Custom
      </div>
      <p className="caption text-muted">From $149 / mo, billed monthly or yearly</p>
      <ul>
        {tier.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <Link
        className={tierButtonClass(tier)}
        href="/support"
        onClick={() => trackEvent("cta_click", { location: "pricing_tier", target: "scale" })}
      >
        Contact us
      </Link>
    </>
  );
}

type Account =
  | { authenticated: false }
  | {
      authenticated: true;
      userId: string;
      email: string | null;
      active: boolean;
      plan: "starter" | "growth" | "scale" | null;
      source: "paddle" | "grant" | "trial" | null;
    };

type Intent = { plan: PaidPlan; cycle: BillingCycle; extras: number };

function readIntent(): Intent | null {
  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan");
  if (plan !== "starter" && plan !== "growth") return null;
  const cycle: BillingCycle = params.get("cycle") === "yearly" ? "yearly" : "monthly";
  const n = Number.parseInt(params.get("extras") ?? "0", 10);
  const extras = Number.isFinite(n) ? Math.min(MAX_EXTRA_COLLECTIONS, Math.max(0, n)) : 0;
  return { plan, cycle, extras };
}

function signupUrl(plan: PaidPlan, cycle: BillingCycle, extras: number): string {
  const next = `/pricing?plan=${plan}&cycle=${cycle}&extras=${extras}`;
  return `/login?mode=signup&next=${encodeURIComponent(next)}`;
}

function TierCheckout({
  tier,
  cycle,
  account,
  intent,
}: {
  tier: Tier;
  cycle: BillingCycle;
  account: Account | null;
  intent: Intent | null;
}) {
  const [extras, setExtras] = useState(
    intent && intent.plan === tier.id ? intent.extras : 0
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoOpened = useRef(false);

  const buttonClass = tierButtonClass(tier);
  const plan = tier.id as PaidPlan;
  const price = tier.price!;
  const available = isCheckoutAvailable(plan, cycle, extras);
  const perExtra = EXTRA_COLLECTION[cycle];
  const cycleLabel = cycle === "monthly" ? "/ mo" : "/ yr";
  const paying = account?.authenticated && account.active && account.source === "paddle";

  async function subscribe() {
    if (!account) return;
    trackEvent("cta_click", { location: "pricing_tier", target: `${plan}_${cycle}` });
    if (!account.authenticated) {
      window.location.href = signupUrl(plan, cycle, extras);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await openCheckout({
        plan,
        cycle,
        extraCollections: extras,
        userId: account.userId,
        email: account.email,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout could not open. Try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!BILLING_ENABLED) return;
    if (autoOpened.current || !intent || intent.plan !== plan || intent.cycle !== cycle) return;
    if (!account?.authenticated || paying || !available) return;
    autoOpened.current = true;
    window.history.replaceState({}, "", "/pricing#plans");
    void subscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, intent, plan, cycle, available, paying]);

  return (
    <>
      <div className="pricing-price pricing-display" style={{ fontSize: 36 }}>
        {formatPrice(tier, cycle, extras)} <span>{cycleLabel}</span>
      </div>
      <p className="caption text-muted">
        {cycle === "yearly"
          ? `2 months free vs. monthly ($${price.monthly}/mo)`
          : `or $${price.yearly}/yr — 2 months free`}
      </p>

      {BILLING_ENABLED ? (
      <div className="qty-stepper mt-md">
        <span className="qty-stepper__label">
          Extra collections
          <span className="caption text-muted">
            {tier.includedCollections} included · +${perExtra} {cycleLabel} each
          </span>
        </span>
        <div className="qty-stepper__controls">
          <button
            type="button"
            aria-label={`Remove an extra collection from ${tier.name}`}
            disabled={extras === 0}
            onClick={() => setExtras((n) => Math.max(0, n - 1))}
          >
            −
          </button>
          <output aria-live="polite">{extras}</output>
          <button
            type="button"
            aria-label={`Add an extra collection to ${tier.name}`}
            disabled={extras >= MAX_EXTRA_COLLECTIONS}
            onClick={() => setExtras((n) => Math.min(MAX_EXTRA_COLLECTIONS, n + 1))}
          >
            +
          </button>
        </div>
      </div>
      ) : null}

      <ul>
        {tier.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      {!BILLING_ENABLED ? (
        <Link
          className={buttonClass}
          href="/install"
          onClick={() => trackEvent("cta_click", { location: "pricing_tier", target: plan })}
        >
          Get started
        </Link>
      ) : paying ? (
        <Link className={buttonClass} href="/app?tab=billing">
          {account?.authenticated && account.plan === plan ? "Your current plan" : "Change plan"}
        </Link>
      ) : available ? (
        <button
          type="button"
          className={buttonClass}
          disabled={busy || !account}
          onClick={subscribe}
        >
          {busy
            ? "Opening checkout…"
            : account && !account.authenticated
              ? `Create account & subscribe`
              : `Subscribe to ${tier.name}`}
        </button>
      ) : (
        <Link
          className={buttonClass}
          href="/support"
          onClick={() => trackEvent("cta_click", { location: "pricing_tier", target: plan })}
        >
          Contact us to subscribe
        </Link>
      )}
      {error ? (
        <p className="caption mt-sm" role="alert" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
    </>
  );
}

export function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [account, setAccount] = useState<Account | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);

  useEffect(() => {
    const found = readIntent();
    if (found) {
      setIntent(found);
      setCycle(found.cycle);
    }
    if (!BILLING_ENABLED) return;
    fetch("/api/billing/status", { credentials: "same-origin", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data: Account) => setAccount(data))
      .catch(() => setAccount({ authenticated: false }));
  }, []);

  return (
    <div className="landing">
      <TopNav showAuth={false} />

      <section className="hero-band">
        <div className="container" style={{ padding: 0 }}>
          <p className="caption text-muted landing-fade-up">Plans</p>
          <h1 className="pricing-display landing-fade-up" style={{ animationDelay: "60ms" }}>
            Pricing
          </h1>
          <p
            className="body-md text-muted mt-md landing-fade-up"
            style={{ maxWidth: "56ch", animationDelay: "120ms" }}
          >
            Natural-language search for your Webflow site — plus the insights that turn visitor
            queries into better SEO and AEO content.
            {BILLING_ENABLED
              ? " Every new account starts with a 14-day free trial — no card needed, no setup fees."
              : " No setup fees."}
          </p>
          <div
            className="landing-hero__actions mt-lg landing-fade-up"
            style={{ animationDelay: "180ms" }}
          >
            <Link
              className="btn btn-primary"
              href="/install"
              onClick={() => trackEvent("cta_click", { location: "pricing_hero", target: "install" })}
            >
              Get started
            </Link>
            <a className="btn btn-secondary" href="#plans">
              Compare plans
            </a>
          </div>
        </div>
      </section>

      <section className="landing-band landing-band--soft" id="plans">
        <div className="container" style={{ padding: 0 }}>
          {BILLING_ENABLED && isSandbox ? (
            <div className="checkout-notice mb-lg" role="note">
              <strong>Test mode.</strong> Checkout uses the Paddle sandbox — no real charges. Pay
              with card 4242 4242 4242 4242, any future expiry and any CVC.
            </div>
          ) : null}
          {account && !account.authenticated ? (
            <p className="body-md text-muted mb-md">
              Already have an account? <Link href="/login?next=/pricing">Sign in</Link> so your
              plan is added to it.
            </p>
          ) : null}

          <h2 className="pricing-section mb-md">Plans</h2>
          <p className="body-md text-muted mb-lg" style={{ maxWidth: "52ch" }}>
            One subscription covers hosting, search, and intelligence. Pay monthly, or yearly
            and get 2 months free.
          </p>

          <div className="billing-toggle mb-lg" role="radiogroup" aria-label="Billing period">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={cycle === c}
                className={cycle === c ? "active" : undefined}
                onClick={() => setCycle(c)}
              >
                {c === "monthly" ? "Monthly" : "Yearly · 2 months free"}
              </button>
            ))}
          </div>

          <div className="pricing-grid mb-lg">
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className={
                  tier.featured
                    ? "pricing-tier-card pricing-tier-card--featured"
                    : "pricing-tier-card"
                }
              >
                {tier.featured ? <span className="pricing-badge">Most popular</span> : null}
                <h3 className="pricing-card-title">{tier.name}</h3>
                <p className="body-md text-muted mt-sm">{tier.blurb}</p>
                <p className="caption text-muted mt-sm">{tier.scope}</p>
                {tier.price ? (
                  <TierCheckout tier={tier} cycle={cycle} account={account} intent={intent} />
                ) : (
                  <ScaleTier tier={tier} />
                )}
              </div>
            ))}
          </div>
          {BILLING_ENABLED ? (
            <p className="caption text-muted">
              Prices in USD. Sales tax or VAT is added at checkout where applicable. Payments are
              processed by Paddle.com, our merchant of record. See our{" "}
              <Link href="/refunds">refund policy</Link> and <Link href="/terms">terms</Link>.
            </p>
          ) : (
            <p className="caption text-muted">
              Prices in USD. See our <Link href="/terms">terms</Link>.
            </p>
          )}
        </div>
      </section>

      <section className="landing-band">
        <div className="container" style={{ padding: 0 }}>
          <h2 className="pricing-section mb-md">Every plan includes</h2>
          <p className="body-md text-muted mb-lg" style={{ maxWidth: "52ch" }}>
            Search that helps visitors find answers — and helps you write the right pages.
          </p>
          <div className="landing-panel-grid landing-panel-grid--2">
            {INCLUDED.map((item) => (
              <div key={item.title} className="insights-panel">
                <div className="insights-panel__head">
                  <h3 className="title-sm">{item.title}</h3>
                </div>
                <p className="body-md">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-band landing-band--soft">
        <div className="container" style={{ padding: 0 }}>
          <h2 className="pricing-section mb-lg">FAQ</h2>
          <div className="pricing-faq-grid">
            {(BILLING_ENABLED ? FAQS : FAQS_NO_BILLING).map((item) => (
              <div key={item.q} className="feature-card">
                <h3 className="pricing-card-title mb-md">{item.q}</h3>
                <p className="body-md text-muted" style={{ margin: 0 }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section--tight">
        <div className="container" style={{ padding: 0 }}>
          <div className="cta-band-light">
            <h2 className="display-md mb-md">Ready for your next search experience?</h2>
            <p className="body-md text-muted mb-lg" style={{ maxWidth: "48ch" }}>
              Connect Webflow, index your CMS, and ship natural-language search — with insights
              that improve SEO and AEO over time.
            </p>
            <div className="landing-hero__actions">
              <Link
                className="btn btn-primary"
                href="/install"
                onClick={() =>
                  trackEvent("cta_click", { location: "pricing_footer", target: "install" })
                }
              >
                Install Talaash
              </Link>
              <Link
                className="btn btn-secondary"
                href="/support"
                onClick={() =>
                  trackEvent("cta_click", { location: "pricing_footer", target: "support" })
                }
              >
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
