import { LegalPage } from "@/components/LegalPage";

export const metadata = {
  title: "Support · Talaash",
};

export default function SupportPage() {
  return (
    <LegalPage title="Support">
      <p>
        Step-by-step setup for Talaash on Webflow: connect your site, index CMS content, install
        the search script, insert the Designer layout, and publish.
      </p>

      <h2 className="title-sm">Before you start (prerequisites)</h2>
      <ul>
        <li>A Webflow site with CMS collections you want searchable</li>
        <li>
          Permission to install Marketplace apps and approve OAuth (
          <code>sites</code>, <code>cms:read</code>, <code>custom_code</code>)
        </li>
        <li>Access to the Webflow Designer on that site</li>
        <li>
          Ability to <strong>Publish</strong> the site after Install or Disconnect (Custom Code
          only goes live on publish)
        </li>
      </ul>
      <p>
        You do <strong>not</strong> paste a footer script or Embed HTML for required setup. The
        app installs the script via Custom Code and inserts the layout via the Designer Extension.
      </p>

      <h2 className="title-sm">Full setup guide</h2>
      <ol>
        <li>
          <strong>Create your Talaash account</strong> — Open{" "}
          <a href="/install">https://www.talaash.org/install</a> (or Install from the Webflow
          Marketplace). Sign up with email and password, or sign in if you already have an
          account.
        </li>
        <li>
          <strong>Connect Webflow</strong> — When prompted, approve access so Talaash can list
          your sites, read CMS content to index, and manage the search script on your site. If
          you deny access, return to Install and try again when ready.
        </li>
        <li>
          <strong>Open Setup</strong> — Go to{" "}
          <a href="/app">https://www.talaash.org/app</a> and open the <strong>Setup</strong>{" "}
          tab. Select the Webflow site you want to use if more than one is connected.
        </li>
        <li>
          <strong>Map collections</strong> — Turn on each CMS collection to include. For each
          collection, choose which fields to index (title, body, and other text fields). Save
          your mapping.
        </li>
        <li>
          <strong>Index CMS</strong> — Click <strong>Index CMS</strong> (or Re-index). Wait until
          indexing finishes. Without a successful index, the live search box will return no
          useful results.
        </li>
        <li>
          <strong>Install search on site</strong> — Click{" "}
          <strong>Install search on site</strong>. Talaash registers a pinned{" "}
          <code>search.js</code> through Webflow’s Custom Code API (integrity hash / SRI). Site
          ID, search token, and endpoint are applied as attributes on that script. Default
          widget CSS is bundled inside the script (no separate stylesheet to install). After
          Install, Setup shows the exact versioned script URL and integrity hash.
        </li>
        <li>
          <strong>Insert the search layout in the Designer</strong> — Open your site in the
          Webflow Designer → Apps → <strong>Talaash</strong> → <strong>Launch App</strong> →{" "}
          <strong>Insert search layout</strong>. Select a parent on the canvas first (or Body is
          used). This adds native elements and <code>data-search-*</code> attributes via Designer
          APIs — no Embed HTML paste. Style the input and result card like any other Webflow UI.
          Optional attribute reference:{" "}
          <a href="/docs/attributes">Search attributes</a>.
        </li>
        <li>
          <strong>Publish</strong> — Publish the Webflow site so both the Custom Code script and
          the Designer layout go live. Test search on the published page.
        </li>
      </ol>

      <h2 className="title-sm">Optional controls</h2>
      <ul>
        <li>
          <code>data-search-analytics=&quot;off&quot;</code> on the search root (or script) —
          skip anonymous visitor/session ids (queries may still be logged).
        </li>
        <li>
          <code>data-search-suggest=&quot;off&quot;</code> — disable autocomplete so typed text
          is not sent to suggest before Enter.
        </li>
        <li>
          After Talaash ships a widget update, click <strong>Install search on site</strong> again
          so Webflow registers a new pinned script version, then publish.
        </li>
      </ul>

      <h2 className="title-sm">Using the product</h2>
      <ul>
        <li>
          <strong>Insights</strong> — volume, popular prompts, and content gaps from live visitor
          searches.
        </li>
        <li>
          <strong>Content intelligence / AEO</strong> — optional AI reports based on indexed CMS
          content and search patterns.
        </li>
        <li>
          <strong>Re-index</strong> after major CMS or mapping changes so results stay fresh.
        </li>
      </ul>

      <h2 className="title-sm">Disconnect &amp; remove</h2>
      <ol>
        <li>
          In Setup, choose <strong>Disconnect Webflow</strong>. Talaash tries to remove the Custom
          Code script it applied, then revokes the OAuth token.
        </li>
        <li>
          <strong>Publish</strong> your Webflow site so removal goes live. You can also delete
          leftover search layout elements / <code>data-search-*</code> attributes in the Designer
          if you no longer want the UI markup.
        </li>
      </ol>

      <h3 className="title-sm">If Disconnect cannot remove Custom Code</h3>
      <p>
        If Webflow access was already revoked (or the token expired) before Disconnect ran,
        automatic script removal may fail. Recover manually without touching unrelated site code:
      </p>
      <ol>
        <li>
          In Webflow: open the site → <strong>Site settings</strong> →{" "}
          <strong>Custom Code</strong> (or the registered Custom Code / apps scripts area).
        </li>
        <li>
          Remove only the script named <strong>TalaashSearch</strong> (or legacy{" "}
          <strong>TalaashLoader</strong>). Leave other scripts unchanged.
        </li>
        <li>
          <strong>Publish</strong> the site.
        </li>
        <li>Optionally delete the search layout in the Designer.</li>
      </ol>

      <h2 className="title-sm">Troubleshooting</h2>
      <ul>
        <li>
          <strong>Can’t create an account</strong> — use a valid email and password (at least 6
          characters). If signup fails, email support with the exact error message.
        </li>
        <li>
          <strong>Connect fails or loops</strong> — always use{" "}
          <a href="https://www.talaash.org/install">https://www.talaash.org/install</a> (include{" "}
          <code>www</code>), allow pop-ups for Webflow, and try again. Do not reuse an old
          authorize tab.
        </li>
        <li>
          <strong>No search results</strong> — confirm Index CMS finished, Install search on site
          ran, Insert search layout was used (or attributes are present), and the site was
          published afterward.
        </li>
        <li>
          <strong>Script works but styles look wrong</strong> — default styles ship inside{" "}
          <code>search.js</code>. Override in Designer, or set{" "}
          <code>data-search-unstyled</code> on the root if you want full manual styling.
        </li>
        <li>
          <strong>Insights empty</strong> — analytics appear after visitors use search on the
          published site.
        </li>
      </ul>

      <h2 className="title-sm">Contact</h2>
      <p>
        Email{" "}
        <a href="mailto:damiljamil63@gmail.com">damiljamil63@gmail.com</a> with your account
        email and Webflow site name.
      </p>

      <p>
        Also see <a href="/privacy">Privacy</a> and <a href="/terms">Terms</a>.
      </p>
    </LegalPage>
  );
}
