"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function LandingPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <div className={`talaash${ready ? " talaash--ready" : ""}`}>
      <header className="talaash-nav">
        <Link className="talaash-nav__brand" href="/">
          Talaash
        </Link>
        <div className="talaash-nav__links">
          <Link href="/pricing">Pricing</Link>
          <Link href="/support">Support</Link>
          <Link className="talaash-nav__cta" href="/install">
            Install
          </Link>
        </div>
      </header>

      <section className="talaash-hero" aria-label="Talaash">
        <div className="talaash-hero__atmosphere" aria-hidden="true">
          <div className="talaash-hero__wash" />
          <div className="talaash-hero__grid" />
          <svg className="talaash-hero__ripples" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="talaashRipple" cx="50%" cy="42%" r="55%">
                <stop offset="0%" stopColor="rgba(20, 140, 132, 0.35)" />
                <stop offset="55%" stopColor="rgba(15, 60, 72, 0.12)" />
                <stop offset="100%" stopColor="rgba(15, 60, 72, 0)" />
              </radialGradient>
            </defs>
            <rect width="1200" height="800" fill="url(#talaashRipple)" />
            <g className="talaash-hero__rings" fill="none" stroke="rgba(15, 55, 65, 0.28)" strokeWidth="1.25">
              <circle className="talaash-ring talaash-ring--1" cx="600" cy="340" r="70" />
              <circle className="talaash-ring talaash-ring--2" cx="600" cy="340" r="140" />
              <circle className="talaash-ring talaash-ring--3" cx="600" cy="340" r="230" />
              <circle className="talaash-ring talaash-ring--4" cx="600" cy="340" r="340" />
            </g>
            <g className="talaash-hero__nodes">
              <circle cx="420" cy="250" r="5" fill="#0f3741" />
              <circle cx="760" cy="220" r="4" fill="#148c84" />
              <circle cx="820" cy="400" r="6" fill="#0f3741" />
              <circle cx="380" cy="430" r="4.5" fill="#148c84" />
              <circle cx="540" cy="520" r="5" fill="#0f3741" />
              <circle cx="700" cy="500" r="3.5" fill="#0f3741" />
              <path
                d="M420 250 L540 340 L760 220 M540 340 L820 400 M540 340 L380 430 M540 340 L540 520 M540 340 L700 500"
                stroke="rgba(20, 140, 132, 0.45)"
                strokeWidth="1.5"
                fill="none"
              />
              <circle className="talaash-hero__pulse" cx="600" cy="340" r="10" fill="#148c84" />
            </g>
          </svg>
        </div>

        <div className="talaash-hero__copy">
          <p className="talaash-hero__brand">Talaash</p>
          <h1 className="talaash-hero__headline">One search across your Webflow CMS.</h1>
          <p className="talaash-hero__lede">
            Visitors ask in plain language. Talaash ranks blogs, webinars, and collections by meaning —
            then shows you what they looked for.
          </p>
          <div className="talaash-hero__actions">
            <Link className="talaash-btn talaash-btn--primary" href="/install">
              Get started
            </Link>
            <a className="talaash-btn talaash-btn--ghost" href="#how">
              See how it works
            </a>
          </div>
        </div>
      </section>

      <section className="talaash-section" id="how">
        <div className="talaash-section__inner">
          <h2 className="talaash-section__title">Connect. Index. Embed.</h2>
          <p className="talaash-section__lede">
            Install the Webflow app, map the fields that matter, and drop a Designer-native search
            onto your site — no rebuild of your layout.
          </p>
          <ol className="talaash-steps">
            <li>
              <span className="talaash-steps__num">01</span>
              <span className="talaash-steps__label">Connect Webflow</span>
              <span className="talaash-steps__text">Authorize CMS read access for your site.</span>
            </li>
            <li>
              <span className="talaash-steps__num">02</span>
              <span className="talaash-steps__label">Index collections</span>
              <span className="talaash-steps__text">Choose embed fields and build the vector index.</span>
            </li>
            <li>
              <span className="talaash-steps__num">03</span>
              <span className="talaash-steps__label">Publish search</span>
              <span className="talaash-steps__text">Add the script and attributes in Webflow Designer.</span>
            </li>
          </ol>
        </div>
      </section>

      <section className="talaash-section talaash-section--alt">
        <div className="talaash-section__inner">
          <h2 className="talaash-section__title">Search intelligence, not just a box.</h2>
          <p className="talaash-section__lede">
            After the widget is live, Insights surfaces popular prompts, trends, and content gaps so
            you know what to publish next.
          </p>
          <div className="talaash-split">
            <div>
              <h3 className="talaash-split__title">Meaning-ranked results</h3>
              <p>
                Semantic + keyword fusion returns one ranked list across CMS types — the answer
                visitors meant, not only exact keyword hits.
              </p>
            </div>
            <div>
              <h3 className="talaash-split__title">Designed in Webflow</h3>
              <p>
                Style a Collection Item once. Talaash clones your card for results — Finsweet-style
                attributes, your visual system.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="talaash-closing">
        <div className="talaash-closing__inner">
          <p className="talaash-closing__brand">Talaash</p>
          <h2 className="talaash-closing__title">Ready to put semantic search on your site?</h2>
          <p className="talaash-closing__lede">
            Start on Webflow Marketplace install, or open the dashboard and connect your site.
          </p>
          <div className="talaash-hero__actions">
            <Link className="talaash-btn talaash-btn--primary" href="/install">
              Install Talaash
            </Link>
            <Link className="talaash-btn talaash-btn--ghost" href="/login">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
