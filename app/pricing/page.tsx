import type { Metadata } from "next";
import { PricingPage } from "@/components/pricing/PricingPage";

export const metadata: Metadata = {
  title: "Pricing — Talaash",
  description:
    "Talaash plans for Webflow: natural-language CMS search, hosting, and search intelligence for SEO and AEO.",
  openGraph: {
    title: "Pricing — Talaash",
    description:
      "Setup + monthly plans for semantic search, analytics, and content insights on Webflow.",
    url: "https://www.talaash.org/pricing",
    siteName: "Talaash",
  },
};

export default function PricingRoute() {
  return <PricingPage />;
}
