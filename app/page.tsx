import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Talaash — Semantic search for Webflow CMS",
  description:
    "One search across your Webflow CMS. Meaning-ranked results, Designer-native embed, and search intelligence.",
  metadataBase: new URL("https://www.talaash.org"),
  openGraph: {
    title: "Talaash",
    description: "Semantic search for Webflow CMS",
    url: "https://www.talaash.org",
    siteName: "Talaash",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
