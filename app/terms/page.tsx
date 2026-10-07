import { LegalPage } from "@/components/LegalPage";
import { BILLING_ENABLED } from "@/lib/billing-flag";

export const metadata = {
  title: "Terms of Use · Talaash",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="September 29, 2026">
      <p>
        By creating a Talaash account or installing the Talaash Webflow App, you agree to
        these terms.
      </p>

      <h2 className="title-sm">The service</h2>
      <p>
        Talaash indexes Webflow CMS content you authorize, provides on-site semantic search
        (including optional OpenAI-powered answers), registers a search script on your site
        through Webflow’s Custom Code API, and shows analytics in a hosted dashboard.
        Features may change as we improve the product.
      </p>

      <h2 className="title-sm">Your responsibilities</h2>
      <ul>
        <li>You must have authority to connect the Webflow site and CMS you authorize.</li>
        <li>
          You are responsible for designing the on-page search UI in Webflow (for example
          input and results elements with Talaash attributes), indexing collections you want
          searchable, and publishing the site so Custom Code changes go live.
        </li>
        <li>Do not abuse the API, attempt unauthorized access, or reverse engineer the service.</li>
        <li>Keep your account credentials secure.</li>
      </ul>

      {BILLING_ENABLED ? (
        <>
      <h2 className="title-sm">Plans, billing and payments</h2>
      <p>
        Paid plans are subscriptions billed monthly or yearly at the prices shown on our{" "}
        <a href="/pricing">pricing page</a>. Our order process is conducted by our online
        reseller Paddle.com. Paddle.com is the merchant of record for all our orders and
        provides all customer service inquiries and handles returns. Paddle’s{" "}
        <a href="https://www.paddle.com/legal/checkout-buyer-terms" rel="noopener noreferrer" target="_blank">
          buyer terms
        </a>{" "}
        apply to your purchase.
      </p>
      <ul>
        <li>
          New accounts get a 14-day free trial of the Growth plan. No payment details are needed
          and nothing is charged when it ends; indexing, script install and live search pause
          until you choose a plan.
        </li>
        <li>Subscriptions renew automatically until cancelled.</li>
        <li>
          You can cancel anytime; your plan stays active until the end of the paid period.
        </li>
        <li>Extra collections are added to your subscription price for the same period.</li>
        <li>Sales tax or VAT is calculated and collected by Paddle where applicable.</li>
        <li>
          Refunds follow our <a href="/refunds">Refund Policy</a>.
        </li>
      </ul>
        </>
      ) : null}

      <h2 className="title-sm">Webflow &amp; third parties</h2>
      <p>
        Use of Webflow remains subject to Webflow’s terms. Search quality and AI answers
        depend on third-party services (including OpenAI); their outages or limits may affect
        the product.
      </p>

      <h2 className="title-sm">Disclaimer</h2>
      <p>
        The service is provided “as is” without warranties of uninterrupted availability or
        perfect search results. To the extent permitted by law, we are not liable for
        indirect or consequential damages arising from use of the product.
      </p>

      <h2 className="title-sm">Changes</h2>
      <p>
        We may update these terms. Continued use after changes constitutes acceptance. For
        questions, see <a href="/support">Support</a>.
      </p>
    </LegalPage>
  );
}
