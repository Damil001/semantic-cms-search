import type { Metadata } from "next";
import { AttributesGuidePage } from "@/components/docs/AttributesGuidePage";

export const metadata: Metadata = {
  title: "Search attributes · Talaash",
  description:
    "Designer custom attributes for Talaash search — minimum setup without pasting Embed HTML. Script install via Webflow Custom Code API.",
};

export default function AttributesDocsRoute() {
  return <AttributesGuidePage />;
}
