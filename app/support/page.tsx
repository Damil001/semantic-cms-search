import { LegalPage } from "@/components/LegalPage";

export const metadata = {
  title: "Support · Talaash",
};

export default function SupportPage() {
  return (
    <LegalPage title="Support">
      <p>
        Help installing Talaash, indexing your Webflow CMS, designing on-page search, and
        using Insights.
      </p>

      <h2 className="title-sm">Install &amp; connect</h2>
      <ol>
        <li>
          Open <a href="/install">Install</a> (or Install from the Webflow Marketplace) and
          create a Talaash account, or sign in if you already have one.
        </li>
        <li>
          Approve Webflow access when prompted so Talaash can read CMS content and manage the
          search script (<code>sites</code>, <code>cms:read</code>,{" "}
          <code>custom_code</code> scopes).
        </li>
        <li>
          In the dashboard <strong>Setup</strong> tab: choose collections and fields, then
          run <strong>Index CMS</strong>.
        </li>
        <li>
          Click <strong>Install search on site</strong> so Talaash registers a pinned{" "}
          <code>search.js</code> through Webflow’s Custom Code API (credentials on the script;
          default styles are bundled in the script).
        </li>
        <li>
          In the Webflow Designer, open the <strong>Talaash</strong> app and click{" "}
          <strong>Insert search layout</strong> (or add attributes from the{" "}
          <a href="/docs/attributes">Search attributes</a> guide). Then <strong>Publish</strong>.
        </li>
      </ol>

      <h2 className="title-sm">Using the product</h2>
      <ul>
        <li>
          <strong>Insights</strong> — volume, popular prompts, and content gaps from live
          visitor searches (uses anonymous visitor/session ids unless you set{" "}
          <code>data-search-analytics=&quot;off&quot;</code>).
        </li>
        <li>
          <strong>Content intelligence / AEO</strong> — optional AI reports based on indexed
          CMS content and search patterns.
        </li>
        <li>
          <strong>Re-index</strong> after major CMS or mapping changes so results stay fresh.
        </li>
        <li>
          <strong>Re-install script</strong> after Talaash ships a widget update so Webflow
          picks up a new integrity-pinned version.
        </li>
      </ul>

      <h2 className="title-sm">Disconnect &amp; remove</h2>
      <ol>
        <li>
          In Setup, choose <strong>Disconnect Webflow</strong>. Talaash tries to remove the
          Custom Code script it applied, then revokes the OAuth token.
        </li>
        <li>
          <strong>Publish</strong> your Webflow site so removal goes live. You can also
          remove leftover <code>data-search-*</code> layout from the Designer if you no longer
          want the UI markup.
        </li>
      </ol>

      <h3 className="title-sm">If Disconnect cannot remove Custom Code</h3>
      <p>
        If Webflow access was already revoked (or the token expired) before Disconnect ran,
        automatic script removal may fail. Recover manually:
      </p>
      <ol>
        <li>
          In Webflow: open the site → <strong>Site settings</strong> →{" "}
          <strong>Custom Code</strong> (or Apps / registered scripts for Custom Code).
        </li>
        <li>
          Remove any script named <strong>TalaashSearch</strong> (or legacy{" "}
          <strong>TalaashLoader</strong>).
        </li>
        <li>
          <strong>Publish</strong> the site.
        </li>
        <li>
          Optionally delete the search layout elements / attributes in the Designer.
        </li>
      </ol>

      <h2 className="title-sm">Troubleshooting</h2>
      <ul>
        <li>
          <strong>Can’t create an account</strong> — use a valid email and password (at least
          6 characters). If signup fails, email support with the exact error message.
        </li>
        <li>
          <strong>Connect fails or loops</strong> — always use{" "}
          <a href="https://www.talaash.org/install">https://www.talaash.org/install</a>{" "}
          (include <code>www</code>), allow pop-ups for Webflow, and try again. Do not reuse
          an old authorize tab.
        </li>
        <li>
          <strong>No search results</strong> — confirm Index CMS finished, Install search on
          site ran, the Designer layout is present, and the site was published afterward.
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
