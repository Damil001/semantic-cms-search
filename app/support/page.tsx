import { LegalPage } from "@/components/LegalPage";

export const metadata = {
  title: "Support · Search Intelligence",
};

export default function SupportPage() {
  return (
    <LegalPage title="Support">
      <p>
        Need help installing Search Intelligence on Webflow, indexing CMS collections, or embedding
        the search widget?
      </p>

      <h2 className="title-sm">Get started</h2>
      <ol>
        <li>
          Create an account at <a href="/login">/login</a> (or open{" "}
          <a href="/install">/install</a> from the Marketplace).
        </li>
        <li>Connect Webflow and authorize <code>sites:read</code> + <code>cms:read</code>.</li>
        <li>In Setup: map collections, choose embed fields, then Index CMS.</li>
        <li>
          Add the footer script and Designer attributes shown in Setup → Embed on your site.
        </li>
        <li>Publish your Webflow site and test search.</li>
      </ol>

      <h2 className="title-sm">Common issues</h2>
      <ul>
        <li>
          <strong>Connect fails</strong> — confirm your Webflow app Redirect URI matches{" "}
          <code>https://YOUR_DOMAIN/api/oauth/callback</code>.
        </li>
        <li>
          <strong>No results</strong> — re-index after mapping changes; confirm{" "}
          <code>data-search-site</code> and <code>data-search-token</code> match Setup.
        </li>
        <li>
          <strong>Insights empty</strong> — analytics appear after visitors use the live widget.
        </li>
      </ul>

      <h2 className="title-sm">Contact</h2>
      <p>
        Email{" "}
        <a href="mailto:support@example.com">support@example.com</a> with your account email and
        Webflow site name. Replace this address with your real support inbox before Marketplace
        submission.
      </p>

      <p>
        Also see <a href="/privacy">Privacy</a> and <a href="/terms">Terms</a>.
      </p>
    </LegalPage>
  );
}
