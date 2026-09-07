import { LegalPage } from "@/components/LegalPage";

export const metadata = {
  title: "Terms of Use · Search Intelligence",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <p>
        By creating an account or installing Search Intelligence for Webflow, you agree to these
        terms.
      </p>

      <h2 className="title-sm">The service</h2>
      <p>
        Search Intelligence indexes Webflow CMS content you authorize, provides a search API and
        embeddable widget, and shows analytics in a hosted dashboard. Features may change as we
        improve the product.
      </p>

      <h2 className="title-sm">Your responsibilities</h2>
      <ul>
        <li>You must have authority to connect the Webflow site and CMS you authorize.</li>
        <li>You are responsible for embedding the widget and configuring collection mappings.</li>
        <li>Do not abuse the API, attempt unauthorized access, or reverse engineer the service.</li>
        <li>Keep your account credentials secure.</li>
      </ul>

      <h2 className="title-sm">Webflow &amp; third parties</h2>
      <p>
        Use of Webflow remains subject to Webflow’s terms. Embedding and OpenAI-powered answers
        depend on third-party services; their outages or limits may affect search quality.
      </p>

      <h2 className="title-sm">Disclaimer</h2>
      <p>
        The service is provided “as is” without warranties of uninterrupted availability or perfect
        search results. To the extent permitted by law, we are not liable for indirect or
        consequential damages arising from use of the product.
      </p>

      <h2 className="title-sm">Changes</h2>
      <p>
        We may update these terms. Continued use after changes constitutes acceptance. For questions,
        see <a href="/support">Support</a>.
      </p>
    </LegalPage>
  );
}
