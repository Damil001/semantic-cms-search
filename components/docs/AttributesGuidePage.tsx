import Link from "next/link";
import { TopNav } from "@/components/TopNav";

const REQUIRED = [
  {
    name: "data-search",
    element: "Div Block (wrapper)",
    value: "(empty or true)",
    why: "Marks the search root. Everything for this search UI lives inside this wrapper.",
  },
  {
    name: "data-search-input",
    element: "Search / Text Input",
    value: "(empty or true)",
    why: "The field visitors type into. Place it inside the wrapper.",
  },
  {
    name: "data-search-results",
    element: "Div or Collection List",
    value: "(empty or true)",
    why: "Container where ranked results are injected.",
  },
  {
    name: "data-search-result",
    element: "Link / Div (result card)",
    value: "(empty or true)",
    why: "Template for one result. Keep it inside a hidden source block (see below).",
  },
] as const;

const RESULT_FIELDS = [
  { name: "data-search-result-title", element: "Heading / Text" },
  { name: "data-search-result-snippet", element: "Paragraph / Text" },
  { name: "data-search-result-type", element: "Text (collection type label)" },
  { name: "data-search-result-image", element: "Image" },
] as const;

const OPTIONAL = [
  {
    name: "data-search-result-source",
    note: "Put on a Div that wraps your result card template. Keep it hidden in Designer so empty cards never flash.",
  },
  {
    name: "data-search-answer",
    note: "Optional Text/Div for the AI answer grounded in hits.",
  },
  {
    name: "data-search-loading",
    note: "Shown while a full search runs (Enter / submit).",
  },
  {
    name: "data-search-empty",
    note: "Shown when a search returns no results.",
  },
  {
    name: "data-search-filter",
    note: 'Optional filter controls. Value = content type slug (e.g. blog).',
  },
  {
    name: "data-search-mode",
    note: 'On the wrapper: submit (default) or live (suggest while typing; Enter still runs full search).',
  },
] as const;

export function AttributesGuidePage() {
  return (
    <div className="landing">
      <TopNav showAuth={false} />

      <section className="hero-band" style={{ paddingBottom: 32 }}>
        <div className="container" style={{ padding: 0 }}>
          <p className="caption text-muted">
            <Link href="/">Talaash</Link>
            {" · "}
            <Link href="/docs/attributes">Attributes</Link>
          </p>
          <h1 className="display-md" style={{ marginTop: 8, maxWidth: "18ch" }}>
            Search attributes
          </h1>
          <p className="body-md text-muted mt-md" style={{ maxWidth: "56ch" }}>
            Build search UI in the Webflow Designer with custom attributes — the same pattern as
            Finsweet Attributes. The search script is installed from Talaash Setup via the Custom
            Code API (no footer paste, no Embed HTML paste).
          </p>
          <div className="landing-hero__actions mt-lg">
            <Link className="btn btn-primary" href="/app">
              Open Setup
            </Link>
            <Link className="btn btn-secondary" href="/support">
              Support
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-band">
        <div className="container" style={{ padding: 0, maxWidth: 820 }}>
          <h2 className="title-lg">How installation works</h2>
          <ol className="body-md mt-md" style={{ paddingLeft: 20, lineHeight: 1.7, maxWidth: "56ch" }}>
            <li>
              In Talaash <strong>Setup</strong>, map collections, index CMS, then click{" "}
              <strong>Install search on site</strong>.
            </li>
            <li>
              Talaash registers a pinned <code>search.js</code> through Webflow Custom Code (with
              integrity). Site credentials are applied on that script.
            </li>
            <li>
              In the Designer, add native elements and the attributes below. Style them like any
              other Webflow UI.
            </li>
            <li>
              <strong>Publish</strong> so the script and layout go live.
            </li>
          </ol>
          <p className="body-md text-muted mt-md" style={{ maxWidth: "56ch" }}>
            You do <strong>not</strong> paste a full HTML snippet into an Embed for required setup.
            Credentials come from the Custom Code install; you only add Designer attributes for
            layout.
          </p>
        </div>
      </section>

      <section className="landing-band landing-band--soft" id="required">
        <div className="container" style={{ padding: 0, maxWidth: 820 }}>
          <h2 className="title-lg">Required for minimum setup</h2>
          <p className="body-md text-muted mt-md" style={{ maxWidth: "52ch" }}>
            Add these custom attributes in the Designer (Element settings → Custom attributes).
          </p>

          <div className="attr-card-grid mt-lg">
            {REQUIRED.map((item) => (
              <article key={item.name} className="attr-card">
                <p className="attr-card__label">Attribute</p>
                <code className="attr-card__name">{item.name}</code>
                <p className="attr-card__meta">
                  <strong>Element:</strong> {item.element}
                </p>
                <p className="attr-card__meta">
                  <strong>Value:</strong> {item.value}
                </p>
                <p className="body-md" style={{ margin: "12px 0 0", fontSize: 14 }}>
                  {item.why}
                </p>
              </article>
            ))}
          </div>

          <h3 className="title-sm mt-lg">Result card fields</h3>
          <p className="body-md text-muted mt-sm" style={{ maxWidth: "52ch" }}>
            Inside the element with <code>data-search-result</code>, add children for the fields you
            want filled:
          </p>
          <div className="attr-card-grid mt-md">
            {RESULT_FIELDS.map((item) => (
              <article key={item.name} className="attr-card attr-card--compact">
                <code className="attr-card__name">{item.name}</code>
                <p className="attr-card__meta" style={{ marginTop: 8 }}>
                  {item.element}
                </p>
              </article>
            ))}
          </div>

          <div className="insights-callout mt-lg">
            <strong>Recommended structure:</strong> wrap your result card in a Div with{" "}
            <code>data-search-result-source</code>, set that Div to Hidden in Designer, and keep{" "}
            <code>data-search-results</code> as the empty list container. Talaash clones the hidden
            card for each hit.
          </div>
        </div>
      </section>

      <section className="landing-band" id="optional">
        <div className="container" style={{ padding: 0, maxWidth: 820 }}>
          <h2 className="title-lg">More attributes</h2>
          <p className="body-md text-muted mt-md" style={{ maxWidth: "52ch" }}>
            Optional attributes for answers, empty states, and filters.
          </p>
          <div className="attr-list mt-lg">
            {OPTIONAL.map((item) => (
              <div key={item.name} className="attr-list__row">
                <code>{item.name}</code>
                <p className="body-md text-muted" style={{ margin: 0 }}>
                  {item.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-band landing-band--soft">
        <div className="container" style={{ padding: 0, maxWidth: 820 }}>
          <h2 className="title-lg">Quick Designer checklist</h2>
          <ol className="body-md mt-md" style={{ paddingLeft: 20, lineHeight: 1.7 }}>
            <li>
              Div Block → attribute <code>data-search</code>
            </li>
            <li>
              Inside it: Form Search or Text Input → <code>data-search-input</code>
            </li>
            <li>
              Div → <code>data-search-results</code> (results mount)
            </li>
            <li>
              Hidden Div → <code>data-search-result-source</code> containing a Link/Div with{" "}
              <code>data-search-result</code> and title/snippet/type/image children
            </li>
            <li>
              Publish after <strong>Install search on site</strong> in Talaash Setup
            </li>
          </ol>
          <p className="caption text-muted mt-lg">
            Need help? See <Link href="/support">Support</Link> or continue in{" "}
            <Link href="/app">Setup</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
