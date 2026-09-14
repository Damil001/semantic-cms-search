"use client";

import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { trackEvent } from "@/lib/analytics";

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    blurb: "One site, core search — ideal to prove value quickly.",
    setup: "$499",
    mrr: "$49",
    featured: false,
    cta: "Get started",
    href: "/install",
    scope: "≤10 collections · 1 search page · 2 re-indexes/mo",
    features: [
      "Webflow OAuth, field mapping, and Custom Code install",
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
    setup: "$749",
    mrr: "$79",
    featured: true,
    cta: "Get started",
    href: "/install",
    scope: "≤25 collections · filters · 4 re-indexes/mo",
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
    blurb: "Custom scope for agencies, multi-brand, or high volume.",
    setup: "$999",
    mrr: "$149",
    featured: false,
    cta: "Contact us",
    href: "/support",
    scope: "Unlimited collections · SLA · quarterly review",
    features: [
      "Everything in Growth",
      "Custom relevance tuning and thresholds",
      "Agency / multi-brand options",
      "Dedicated support and SLA",
      "Extra locales and search surfaces",
      "Roadmap input for advanced needs",
    ],
  },
] as const;

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
    body: "OAuth connect, Custom Code install, and Designer-styled result cards.",
  },
  {
    title: "Hosted index",
    body: "Embeddings, search API, and re-indexing managed for you — no infra to run.",
  },
] as const;

const ADDONS = [
  { item: "Extra CMS collection (mapping + index)", price: "$150–300 each" },
  { item: "Extra re-index (beyond plan)", price: "$50 each" },
  { item: "Second search page / locale", price: "$400" },
  { item: "Custom relevance thresholds", price: "$300 one-time" },
] as const;

const FAQS = [
  {
    q: "What’s included in setup?",
    a: "Webflow connection, CMS field mapping, first index, search script install via Custom Code, and a working search experience on your site.",
  },
  {
    q: "What does the monthly fee cover?",
    a: "Hosted embeddings and search API, index hosting, analytics dashboard access, and the re-indexes included in your plan.",
  },
  {
    q: "Can I start on Starter and upgrade?",
    a: "Yes. Move to Growth or Scale when you need more collections, filters, priority indexing, or agency support.",
  },
  {
    q: "Is there a free trial?",
    a: "You can create a Talaash account and connect Webflow to explore the product. Paid plans cover production setup, hosting, and ongoing indexing.",
  },
] as const;

export function PricingPage() {
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
          <h2 className="pricing-section mb-md">Client plans</h2>
          <p className="body-md text-muted mb-lg" style={{ maxWidth: "52ch" }}>
            One-time setup to go live, then a simple monthly fee for hosting, search, and
            intelligence.
          </p>

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
                {tier.featured ? (
                  <span className="pricing-badge">Most popular</span>
                ) : null}
                <h3 className="pricing-card-title">{tier.name}</h3>
                <p className="body-md text-muted mt-sm">{tier.blurb}</p>
                <p className="caption text-muted mt-sm">{tier.scope}</p>
                <div className="pricing-price pricing-display" style={{ fontSize: 36 }}>
                  {tier.setup} <span>setup</span>
                </div>
                <div className="pricing-price title-md">
                  {tier.mrr} <span>/ mo</span>
                </div>
                <ul>
                  {tier.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link
                  className={
                    tier.featured
                      ? "btn btn-pricing-pill btn-pricing-pill--filled mt-lg"
                      : "btn btn-pricing-pill mt-lg"
                  }
                  href={tier.href}
                  onClick={() =>
                    trackEvent("cta_click", {
                      location: "pricing_tier",
                      target: tier.id,
                    })
                  }
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
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

      <section className="section--tight">
        <div className="container" style={{ padding: 0 }}>
          <h2 className="pricing-section mb-md">Add-ons</h2>
          <p className="body-md text-muted mb-lg" style={{ maxWidth: "52ch" }}>
            Extend any plan when you need more collections, locales, or indexing.
          </p>
          <div className="feature-card mb-lg">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {ADDONS.map((row) => (
                  <tr key={row.item}>
                    <td>{row.item}</td>
                    <td>{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="landing-band landing-band--soft">
        <div className="container" style={{ padding: 0 }}>
          <h2 className="pricing-section mb-lg">FAQ</h2>
          <div className="pricing-faq-grid">
            {FAQS.map((item) => (
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
