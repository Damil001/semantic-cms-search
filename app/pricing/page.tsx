import Link from "next/link";
import { TopNav } from "@/components/TopNav";

export default function PricingPage() {
  return (
    <>
      <TopNav showAuth={false} />
      <section className="hero-band">
        <div className="container" style={{ padding: 0 }}>
          <h1 className="pricing-display">Pricing</h1>
          <p className="body-md text-muted mt-md" style={{ maxWidth: "56ch" }}>
            Semantic CMS search for Webflow — setup, hosting, and search intelligence included.
          </p>
          <Link className="btn btn-primary mt-lg" href="/login">
            Get started
          </Link>
        </div>
      </section>
    </>
  );
}
