"use client";

import Image from "next/image";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { trackEvent } from "@/lib/analytics";

export function LandingPage() {
  return (
    <div className="landing">
      <TopNav showAuth={false} />

      <section className="hero-band landing-hero">
        <div className="container" style={{ padding: 0 }}>
          <div className="landing-hero__brand">
            <Image
              src="/brand/talaash-logo.png"
              alt="Talaash"
              width={72}
              height={72}
              className="landing-logo landing-logo--hero"
              priority
            />
            <p className="landing-hero__name">Talaash</p>
          </div>
          <h1 className="display-lg landing-hero__headline">
            One search across your Webflow CMS.
          </h1>
          <p className="body-md text-muted landing-hero__lede">
            Visitors ask in plain language. Talaash ranks blogs, webinars, and collections by
            meaning — then shows you what they looked for.
          </p>
          <div className="landing-hero__actions">
            <Link
              className="btn btn-primary"
              href="/install"
              onClick={() => trackEvent("cta_click", { location: "hero", target: "install" })}
            >
              Get started
            </Link>
            <a
              className="btn btn-secondary"
              href="#how"
              onClick={() => trackEvent("cta_click", { location: "hero", target: "how" })}
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      <section className="landing-band" id="how">
        <div className="container" style={{ padding: 0 }}>
          <h2 className="title-lg">Connect. Index. Embed.</h2>
          <p className="body-md text-muted mt-md" style={{ maxWidth: "52ch" }}>
            The same setup flow as the dashboard — authorize Webflow, map fields, and drop a
            Designer-native search onto your site.
          </p>

          <div className="setup-steps-grid landing-steps mt-lg">
            <div className="setup-step-card setup-step-card--mint">
              <span className="setup-step-card__num">1</span>
              <span className="setup-step-card__label">Connect Webflow</span>
              <span className="setup-step-card__hint">Authorize CMS read access</span>
            </div>
            <div className="setup-step-card setup-step-card--peach">
              <span className="setup-step-card__num">2</span>
              <span className="setup-step-card__label">Index CMS</span>
              <span className="setup-step-card__hint">Choose fields and build the index</span>
            </div>
            <div className="setup-step-card setup-step-card--mustard">
              <span className="setup-step-card__num">3</span>
              <span className="setup-step-card__label">Embed widget</span>
              <span className="setup-step-card__hint">Add script in Webflow Designer</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-band landing-band--soft">
        <div className="container" style={{ padding: 0 }}>
          <h2 className="title-lg">Search intelligence, not just a box.</h2>
          <p className="body-md text-muted mt-md" style={{ maxWidth: "52ch" }}>
            After the widget is live, Insights surfaces popular prompts, trends, and content gaps so
            you know what to publish next.
          </p>

          <div className="landing-panel-grid mt-lg">
            <div className="insights-panel">
              <div className="insights-panel__head">
                <h3 className="title-sm">Meaning-ranked results</h3>
                <p className="caption text-muted">
                  Semantic + keyword fusion across CMS types
                </p>
              </div>
              <p className="body-md">
                One ranked list for blogs, webinars, and collections — the answer visitors meant,
                not only exact keyword hits.
              </p>
            </div>
            <div className="insights-panel">
              <div className="insights-panel__head">
                <h3 className="title-sm">Designed in Webflow</h3>
                <p className="caption text-muted">Finsweet-style attributes</p>
              </div>
              <p className="body-md">
                Style a Collection Item once. Talaash clones your card for results — your layout,
                your visual system.
              </p>
            </div>
            <div className="insights-panel">
              <div className="insights-panel__head">
                <h3 className="title-sm">Prompt analytics</h3>
                <p className="caption text-muted">Same Insights tab as the app</p>
              </div>
              <p className="body-md">
                See volume, popular queries, and content gaps in the dashboard you already use to
                index and embed.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-band">
        <div className="container" style={{ padding: 0 }}>
          <div className="insights-panel landing-cta-panel">
            <div className="landing-cta-panel__row">
              <Image
                src="/brand/talaash-logo.png"
                alt=""
                width={48}
                height={48}
                className="landing-logo"
              />
              <div>
                <h2 className="title-lg" style={{ marginBottom: 8 }}>
                  Ready to put semantic search on your site?
                </h2>
                <p className="body-md text-muted" style={{ margin: 0, maxWidth: "48ch" }}>
                  Install Talaash, connect Webflow, and embed from Setup — same style guide as the
                  dashboard.
                </p>
              </div>
            </div>
            <div className="landing-hero__actions mt-lg">
              <Link
                className="btn btn-primary"
                href="/install"
                onClick={() => trackEvent("cta_click", { location: "footer", target: "install" })}
              >
                Install Talaash
              </Link>
              <Link
                className="btn btn-secondary"
                href="/login"
                onClick={() => trackEvent("cta_click", { location: "footer", target: "login" })}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
