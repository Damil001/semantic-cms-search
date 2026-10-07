import { notFound } from "next/navigation";
import { LegalPage } from "@/components/LegalPage";
import { BILLING_ENABLED } from "@/lib/billing-flag";

export const metadata = {
  title: "Refund Policy · Talaash",
};

export default function RefundsPage() {
  if (!BILLING_ENABLED) notFound();
  return (
    <LegalPage title="Refund Policy" updated="September 29, 2026">
      <p>
        Talaash subscriptions are sold by Paddle.com, our reseller and merchant of record.
        Paddle processes all payments, refunds and billing questions for Talaash orders.
      </p>

      <h2 className="title-sm">14-day refund on your first payment</h2>
      <p>
        If Talaash isn’t right for you, request a refund within 14 days of your first payment
        for a plan and we’ll refund it in full, including any extra collections you bought with
        it. No questions asked.
      </p>

      <h2 className="title-sm">Renewals</h2>
      <p>
        Monthly and yearly plans renew automatically. You can cancel anytime; your plan stays
        active until the end of the period you already paid for and won’t renew again. Renewal
        payments are not refunded, except where required by law or if a renewal was charged
        after you cancelled.
      </p>

      <h2 className="title-sm">How to request a refund</h2>
      <ul>
        <li>
          Contact us through <a href="/support">Support</a> with the email you used at checkout,
          or
        </li>
        <li>
          Reply to your Paddle receipt email, or use{" "}
          <a href="https://paddle.net" rel="noopener noreferrer" target="_blank">
            paddle.net
          </a>{" "}
          to find your order.
        </li>
      </ul>
      <p>
        Approved refunds go back to your original payment method, usually within 5–10 business
        days depending on your bank.
      </p>

      <h2 className="title-sm">Your legal rights</h2>
      <p>
        This policy does not limit any rights you have under the consumer laws of your country.
      </p>
    </LegalPage>
  );
}
