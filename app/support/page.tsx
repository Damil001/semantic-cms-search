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
        <li>Approve Webflow access when prompted so Talaash can read CMS content and manage the search script.</li>
        <li>
          In the dashboard <strong>Setup</strong> tab: choose collections and fields, then
          run <strong>Index CMS</strong>.
        </li>
        <li>
          Click <strong>Install search script</strong> so Talaash registers the widget on
          your site through Webflow’s Custom Code API (no manual footer paste).
        </li>
        <li>
          In the Webflow Designer, add a search layout (input + results list) using the
          attributes shown in Setup, then <strong>Publish</strong> your site.
        </li>
      </ol>

      <h2 className="title-sm">Using the product</h2>
      <ul>
        <li>
          <strong>Insights</strong> — volume, popular prompts, and content gaps from live
          visitor searches.
        </li>
        <li>
          <strong>Content intelligence / AEO</strong> — optional AI reports based on indexed
          CMS content and search patterns.
        </li>
        <li>
          <strong>Re-index</strong> after major CMS or mapping changes so results stay fresh.
        </li>
      </ul>

      <h2 className="title-sm">Disconnect &amp; remove</h2>
      <ol>
        <li>
          In Setup, choose <strong>Disconnect Webflow</strong>. Talaash revokes access and
          removes the Custom Code script it applied.
        </li>
        <li>
          <strong>Publish</strong> your Webflow site so removal goes live. You can also
          remove any leftover <code>data-search-*</code> attributes from your Designer layout
          if you no longer want the UI markup.
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
          <strong>No search results</strong> — confirm Index CMS finished, the search script
          was installed, your Designer layout includes the required attributes, and the site
          was published after those steps.
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
