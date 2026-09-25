import { LegalPage } from "@/components/LegalPage";

export const metadata = {
  title: "Support · Talaash",
};

export default function SupportPage() {
  return (
    <LegalPage title="Support" updated="September 26, 2026">
      <p>
        How to set up Talaash on your Webflow site, fix common problems, and remove it. Talaash
        adds an AI search box to your site that understands what visitors mean — not just exact
        words — and shows you what they search for.
      </p>

      <h2 className="title-sm">Before you start</h2>
      <ul>
        <li>
          A Webflow site on a <strong>paid Site plan</strong> (for example Basic, CMS or
          Business). Webflow only runs added site scripts on paid Site plans, so search won’t
          appear on sites without one.
        </li>
        <li>At least one CMS collection with published items you want visitors to search</li>
        <li>Permission to install apps on the site and to open it in the Webflow Designer</li>
        <li>Permission to publish the site</li>
      </ul>

      <h2 className="title-sm">Setup guide</h2>
      <ol>
        <li>
          <strong>Create your Talaash account</strong> — Open{" "}
          <a href="/install">https://www.talaash.org/install</a> (or click Install on the Webflow
          Marketplace), choose <strong>Create account</strong>, enter your email and a password
          (at least 6 characters) and click <strong>Create account</strong>. Already have an
          account? Click <strong>Sign in</strong> instead.
        </li>
        <li>
          <strong>Approve Webflow access</strong> — Webflow asks you to choose a site and allow
          Talaash to read site details and CMS content, and to add its search script. Click{" "}
          <strong>Authorize</strong>. You land on the Talaash dashboard.
        </li>
        <li>
          <strong>Load your collections</strong> — Open the <strong>Setup</strong> tab. Talaash
          loads your CMS collections from Webflow automatically. If the list is empty, or you
          changed fields in Webflow, click <strong>Refresh fields</strong>.
        </li>
        <li>
          <strong>Choose what to search</strong> — Tick each collection visitors should be able
          to search. Check the suggested Title, Excerpt, Slug and Image fields, and pick which
          text fields to index.
        </li>
        <li>
          <strong>Index CMS</strong> — Click <strong>Index CMS</strong> and wait for “Indexed …
          items”. (This also saves your field choices.)
        </li>
        <li>
          <strong>Install search on site</strong> — In the “Search on your Webflow site” panel,
          click <strong>Install search on site</strong>. There are no keys or codes to copy.
        </li>
        <li>
          <strong>Add the search box in the Designer</strong> — Open your site in the Webflow
          Designer, press <strong>E</strong> (or open the Apps panel), and launch{" "}
          <strong>Talaash</strong>. Click the element where search should appear — the app shows
          exactly where it will be added — then click <strong>Insert search layout</strong>. The
          new “Talaash Search” block is selected so you can style it like any other element.
        </li>
        <li>
          <strong>Publish</strong> — Publish your site, open the live page and try a search.
        </li>
      </ol>

      <h2 className="title-sm">Keeping search up to date</h2>
      <ul>
        <li>
          After adding or editing CMS items, click <strong>Re-index</strong> in Setup.
        </li>
        <li>
          After adding or renaming CMS fields in Webflow, click <strong>Refresh fields</strong>,
          check the field choices, then <strong>Re-index</strong>.
        </li>
        <li>
          When we release a search widget update, click <strong>Install search on site</strong>{" "}
          again and publish.
        </li>
      </ul>

      <h2 className="title-sm">Privacy controls for your visitors</h2>
      <p>
        By default the search box stores random anonymous visitor and session IDs in the
        visitor’s browser (so Insights can count unique visitors) and shows autocomplete
        suggestions while typing. To turn either off, select the “Talaash Search” block in the
        Designer, open <strong>Element settings → Custom attributes</strong> and add:
      </p>
      <ul>
        <li>
          <code>data-search-analytics</code> = <code>off</code> — no visitor/session IDs
        </li>
        <li>
          <code>data-search-suggest</code> = <code>off</code> — no autocomplete while typing
        </li>
      </ul>
      <p>Then publish. See the <a href="/privacy">Privacy Policy</a> for details.</p>

      <h2 className="title-sm">Troubleshooting</h2>

      <h3 className="title-sm">Account &amp; sign-in</h3>
      <ul>
        <li>
          <strong>“That email and password don’t match an account”</strong> — check for typos, or
          if you’re new, click <strong>Create an account</strong> (the Sign in button only works
          for existing accounts).
        </li>
        <li>
          <strong>“An account with this email already exists”</strong> — click{" "}
          <strong>Sign in instead</strong>, or <strong>Reset password</strong> if you’ve forgotten
          it.
        </li>
        <li>
          <strong>Forgot your password</strong> — on the{" "}
          <a href="/login?mode=forgot">sign-in page</a> click <strong>Forgot password?</strong>,
          enter your email and click <strong>Email me a reset link</strong>. Open the link in the
          email (check spam) within 1 hour, choose a new password, then sign in.
        </li>
      </ul>

      <h3 className="title-sm">Setup &amp; indexing</h3>
      <ul>
        <li>
          <strong>“No CMS collections are loaded yet”</strong> — click{" "}
          <strong>Refresh fields</strong> (or the <strong>Refresh fields now</strong> button in
          the message). If still empty, add a CMS collection with at least one item in Webflow and
          refresh again.
        </li>
        <li>
          <strong>“All collections are unticked”</strong> — tick the checkbox next to at least one
          collection name, then click <strong>Index CMS</strong>.
        </li>
        <li>
          <strong>“This collection isn’t set up yet”</strong> — click{" "}
          <strong>Refresh fields</strong>, make sure the collection is ticked, then click{" "}
          <strong>Index CMS</strong>.
        </li>
        <li>
          <strong>“Webflow authorization revoked” / asked to reconnect</strong> — open{" "}
          <a href="https://www.talaash.org/install">https://www.talaash.org/install</a> and
          approve access again, then re-index.
        </li>
        <li>
          <strong>Connecting keeps looping</strong> — always use{" "}
          <a href="https://www.talaash.org/install">https://www.talaash.org/install</a> (with{" "}
          <code>www</code>) and don’t reuse an old Webflow authorize tab.
        </li>
      </ul>

      <h3 className="title-sm">On your live site</h3>
      <ul>
        <li>
          <strong>Search box does nothing</strong> — check the site is on a paid Site plan, that
          you clicked <strong>Install search on site</strong>, and that you published afterward.
        </li>
        <li>
          <strong>No results</strong> — make sure <strong>Index CMS</strong> finished with items
          indexed and the collection is ticked.
        </li>
        <li>
          <strong>Result card shows in the Designer but not on the site</strong> — that’s the
          hidden template the widget copies for each result; leave it hidden.
        </li>
        <li>
          <strong>Insights empty</strong> — analytics appear after visitors search on the
          published site.
        </li>
      </ul>

      <h2 className="title-sm">Disconnect &amp; remove</h2>
      <ol>
        <li>
          In Setup, click <strong>Disconnect Webflow</strong> and confirm. Talaash removes its
          search script from your site, revokes its Webflow access, and deletes this site’s
          indexed content and search analytics.
        </li>
        <li>
          <strong>Publish</strong> your site so the script removal goes live.
        </li>
        <li>
          Optionally delete the “Talaash Search” block in the Designer.
        </li>
      </ol>

      <h3 className="title-sm">If you removed the app from Webflow first</h3>
      <p>
        If Talaash’s access was revoked in Webflow before you disconnected, we can’t remove the
        script for you (your data is still deleted automatically within 24 hours). Remove it
        yourself without touching your other code:
      </p>
      <ol>
        <li>
          In Webflow, open the site → <strong>Site settings</strong> → <strong>Custom code</strong>
          .
        </li>
        <li>
          Delete only the script named <strong>TalaashSearch</strong> (older installs:{" "}
          <strong>TalaashLoader</strong>). Leave other scripts unchanged.
        </li>
        <li>
          <strong>Publish</strong> the site.
        </li>
      </ol>

      <h2 className="title-sm">Contact</h2>
      <p>
        Email <a href="mailto:damiljamil63@gmail.com">damiljamil63@gmail.com</a> with your
        account email and Webflow site name. We reply within 2 business days. Data deletion
        requests are completed within 30 days.
      </p>

      <p>
        Also see <a href="/privacy">Privacy</a>, <a href="/terms">Terms</a> and{" "}
        <a href="/docs/attributes">Search attributes</a> (for custom layouts).
      </p>
    </LegalPage>
  );
}
