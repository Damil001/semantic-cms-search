import { LegalPage } from "@/components/LegalPage";

export const metadata = {
  title: "Privacy Policy · Talaash",
};

/** Supabase project region, e.g. "the United States (AWS us-east-1)". Leave empty to omit. */
const DATA_REGION = "";

export default function PrivacyPage() {
  const where = DATA_REGION ? ` in ${DATA_REGION}` : "";
  return (
    <LegalPage title="Privacy Policy" updated="September 26, 2026">
      <p>
        Talaash (“we”, “our”) provides AI-powered search and search analytics for Webflow CMS
        sites. This policy explains what we collect, where it is stored, and when it is deleted
        when you create a Talaash account or install the Talaash Webflow app.
      </p>

      <h2 className="title-sm">Information we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong> — your email address and a hashed password for your
          Talaash account.
        </li>
        <li>
          <strong>Webflow authorization</strong> — an OAuth access token that lets us read your
          site details and the CMS collections you choose, and add or remove the Talaash search
          script on your site. The token is encrypted (AES-256-GCM) before it is stored, is only
          ever used on our servers, and is never sent to browsers, site visitors, or AI providers.
        </li>
        <li>
          <strong>CMS content</strong> — the titles, fields and text from the collections you
          choose to index, stored with AI embeddings so visitors can search them.
        </li>
        <li>
          <strong>Visitor search data (on by default)</strong> — when a visitor searches on your
          site we record the search text, the number of results, and random anonymous{" "}
          <strong>visitor and session IDs</strong> that the search widget stores in the visitor’s
          browser (local storage and session storage). These IDs let Insights count unique
          visitors and sessions; they are not linked to names, emails or IP addresses. Site owners
          can turn the IDs off with <code>data-search-analytics=&quot;off&quot;</code> (searches
          are then still counted, without IDs).
        </li>
        <li>
          <strong>Autocomplete (on by default)</strong> — while a visitor types, the widget sends
          the partial text to our suggestion service to show autocomplete options. Suggestion
          requests do not include visitor or session IDs. Site owners can turn autocomplete off
          with <code>data-search-suggest=&quot;off&quot;</code>.
        </li>
      </ul>

      <h2 className="title-sm">How we use information</h2>
      <ul>
        <li>Sign you in and connect your Webflow site</li>
        <li>Index the CMS content you select and answer searches on your site</li>
        <li>Show search analytics, content-gap insights and answer-readiness reports</li>
        <li>Add, update and remove the Talaash search script on your Webflow site</li>
        <li>Operate, secure and improve the service</li>
      </ul>

      <h2 className="title-sm">Where data is stored</h2>
      <ul>
        <li>
          <strong>Database</strong> — account records, the encrypted Webflow token, indexed CMS
          content and embeddings, field mappings, and search analytics are stored in a managed
          PostgreSQL database provided by Supabase, hosted on Amazon Web Services{where}. Data is
          encrypted in transit (TLS) and at rest.
        </li>
        <li>
          <strong>Application servers</strong> — the Talaash dashboard and search API run on
          Vercel. They process requests but do not keep your CMS content or analytics after a
          request finishes.
        </li>
        <li>
          <strong>AI processing</strong> — OpenAI processes text as described below; it is not
          our storage location for your data.
        </li>
      </ul>

      <h2 className="title-sm">AI provider (OpenAI)</h2>
      <p>
        To provide AI search, AI answers, content suggestions and related reports, we send
        limited data to OpenAI as a processor:
      </p>
      <ul>
        <li>
          <strong>CMS text you index</strong> — to create embeddings; short excerpts may be
          included when generating AI answers or drafting suggestions.
        </li>
        <li>
          <strong>Visitor search text</strong> — to find matching content and, when AI answers
          are on, to write an answer from your CMS content.
        </li>
        <li>
          <strong>Search patterns</strong> — when you run Content intelligence or AEO (answer
          engine optimization) reports, sampled or summarized search and CMS signals.
        </li>
      </ul>
      <p>
        We never send your Webflow token, passwords or visitor/session IDs to OpenAI. Under
        OpenAI’s API terms, API data is not used to train their models.
      </p>

      <h2 className="title-sm">Sharing</h2>
      <p>
        We do not sell your data. We only use the subprocessors needed to run the product
        (Vercel for hosting, Supabase for the database, OpenAI for AI features). Site visitors
        only talk to our search service using a site-specific public search key — never your
        Webflow token or our server keys.
      </p>

      <h2 className="title-sm">Retention &amp; deletion</h2>
      <ul>
        <li>
          <strong>While connected</strong> — indexed content, mappings and search analytics are
          kept while your Webflow site is connected so search and Insights keep working.
        </li>
        <li>
          <strong>When you disconnect in Talaash</strong> (Setup → Disconnect Webflow) — we remove
          the search script from your site, revoke our Webflow access, and{" "}
          <strong>immediately and permanently delete</strong> the stored token and that
          site’s indexed content, embeddings, field mappings and search analytics. Publish your
          site afterward so script removal goes live.
        </li>
        <li>
          <strong>When you uninstall or revoke Talaash from Webflow</strong> — the token stops
          working immediately. Our daily cleanup job detects the revoked access and deletes the
          stored token and that site’s indexed content, embeddings, mappings and analytics{" "}
          <strong>within 24 hours</strong>. Because we no longer have access, remove the{" "}
          <strong>TalaashSearch</strong> script yourself under Site settings → Custom code, then
          publish (see <a href="/support">Support</a>).
        </li>
        <li>
          <strong>Deletion requests</strong> — email us (address on <a href="/support">Support</a>
          ) to delete your account or any site data. We complete requests within{" "}
          <strong>30 days</strong> and confirm by email. Deleting your account also deletes all
          connected sites’ data as described above.
        </li>
        <li>
          <strong>Backups</strong> — our database provider keeps automatic backups for up to 7
          days; deleted data disappears from backups when they expire.
        </li>
      </ul>

      <h2 className="title-sm">Contact</h2>
      <p>
        Privacy questions: email the address on our <a href="/support">Support</a> page.
      </p>
    </LegalPage>
  );
}
