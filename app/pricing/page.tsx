import { PricingPage } from "@/components/pricing/PricingPage";
import { BILLING_ENABLED } from "@/lib/billing-flag";

export const metadata = {
  title: "Pricing",
  description: BILLING_ENABLED
    ? "Talaash plans for Webflow CMS search, billed monthly or yearly through Paddle."
    : "Talaash plans for Webflow CMS search, monthly or yearly.",
};

export default function PricingRoute() {
  return <PricingPage />;
}
