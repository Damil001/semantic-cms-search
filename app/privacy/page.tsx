import { LegalPage } from "@/components/LegalPage";

export const metadata = {
  title: "Privacy Policy · Search Intelligence",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Search Intelligence (“we”, “our”) provides semantic search and analytics for Webflow CMS
        sites. This policy explains what we collect and how we use it.
      </p>

      <h2 className="title-sm">Information we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong> — email and authentication credentials for your Search
          Intelligence account (via Supabase Auth).
        </li>
        <li>
          <strong>Webflow authorization</strong> — an OAuth access token that lets us read your
          site metadata and CMS collections you authorize. Tokens are stored server-side only.
        </li>
        <li>
          <strong>CMS content</strong> — titles, fields, and text you choose to index, stored as
          embeddings and search metadata to power search.
        </li>
        <li>
          <strong>Search analytics</strong> — queries visitors run through the embed widget
          (query text, result counts, optional visitor/session ids) so you can see Insights.
        </li>
      </ul>

      <h2 className="title-sm">How we use information</h2>
      <ul>
        <li>Authenticate you and connect your Webflow site</li>
        <li>Index selected CMS content and answer search requests</li>
        <li>Show prompt analytics and content-gap insights in your dashboard</li>
        <li>Operate, secure, and improve the service</li>
      </ul>

      <h2 className="title-sm">Sharing</h2>
      <p>
        We do not sell your data. We use subprocessors required to run the product (for example
        hosting, database, and embedding providers). Public site visitors only call our search API
        with a site-scoped search token — they never receive your Webflow OAuth token or service
        keys.
      </p>

      <h2 className="title-sm">Retention &amp; deletion</h2>
      <p>
        You can disconnect Webflow from the dashboard, which removes the stored OAuth access token.
        You may request account or indexed-data deletion by contacting support. We retain analytics
        and index data while your account remains active unless you ask us to delete it.
      </p>

      <h2 className="title-sm">Contact</h2>
      <p>
        Privacy questions: see <a href="/support">Support</a> or email the address listed there.
      </p>
    </LegalPage>
  );
}
