import { LegalPage } from "@/components/LegalPage";

export const metadata = {
  title: "Privacy Policy · Talaash",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Talaash (“we”, “our”) provides semantic search and analytics for Webflow CMS
        sites. This policy explains what we collect and how we use it when you create a
        Talaash account or install the Talaash Webflow App.
      </p>

      <h2 className="title-sm">Information we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong> — email and authentication credentials for your
          Talaash account (via Supabase Auth).
        </li>
        <li>
          <strong>Webflow authorization</strong> — an OAuth access token that lets us read
          site metadata and CMS collections you authorize, and manage the search script we
          register on your site through Webflow’s Custom Code API. Tokens are stored
          server-side only.
        </li>
        <li>
          <strong>CMS content</strong> — titles, fields, and text you choose to index,
          stored as embeddings and search metadata to power search and related insights.
        </li>
        <li>
          <strong>Visitor search data</strong> — queries visitors run through the search
          widget (query text, result counts, optional visitor/session ids) so you can use
          Insights, Content intelligence, and AEO features.
        </li>
      </ul>

      <h2 className="title-sm">How we use information</h2>
      <ul>
        <li>Authenticate you and connect your Webflow site</li>
        <li>Index selected CMS content and answer on-site search requests</li>
        <li>Show prompt analytics, content-gap insights, and answer-readiness reports</li>
        <li>Register, update, and remove the Talaash search script on your Webflow site</li>
        <li>Operate, secure, and improve the service</li>
      </ul>

      <h2 className="title-sm">AI providers (OpenAI)</h2>
      <p>
        To provide semantic search, AI answers, content-drafting suggestions, and related
        analysis, we send limited data to OpenAI as a processor:
      </p>
      <ul>
        <li>
          <strong>CMS text you index</strong> — used to create embeddings and, when you use
          AI answers or drafting features, short excerpts may be included in model prompts.
        </li>
        <li>
          <strong>Visitor search queries</strong> — used to embed the query for retrieval
          and, when AI answers are enabled, to generate a grounded answer from retrieved
          CMS snippets.
        </li>
        <li>
          <strong>Aggregated search patterns</strong> — when you run Content intelligence or
          AEO analysis, sampled or summarized query/CMS signals may be sent to generate
          reports.
        </li>
      </ul>
      <p>
        We do not send your Webflow OAuth token or Talaash account passwords to OpenAI.
        OpenAI processes data under their API terms; we use it only to operate advertised
        features.
      </p>

      <h2 className="title-sm">Sharing</h2>
      <p>
        We do not sell your data. We use subprocessors required to run the product (hosting,
        database, embedding/AI providers). Public site visitors only call our search API with
        a site-scoped search token — they never receive your Webflow OAuth token or service
        keys.
      </p>

      <h2 className="title-sm">Retention &amp; deletion</h2>
      <p>
        You can disconnect Webflow from the dashboard, which removes Custom Code we applied
        (when permissions allow), revokes the OAuth access token, and clears it from our
        storage. Publish your Webflow site after disconnect so script removal goes live. You
        may request account or indexed-data deletion by contacting support. We retain
        analytics and index data while your account remains active unless you ask us to
        delete it.
      </p>

      <h2 className="title-sm">Contact</h2>
      <p>
        Privacy questions: see <a href="/support">Support</a> or email the address listed
        there.
      </p>
    </LegalPage>
  );
}
