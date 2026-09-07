import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { getUserFromAccessTokenFast } from "@/src/app/goauth";

export const metadata = {
  title: "Install · Talaash",
  description: "Connect Webflow and set up semantic CMS search",
};

export const dynamic = "force-dynamic";

/**
 * Marketplace Install URL should point here:
 *   https://YOUR_PRODUCTION_DOMAIN/install
 *
 * Flow: sign in (if needed) → Webflow OAuth → /app Setup.
 */
export default async function InstallPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string }>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  const token = jar.get("sb_access")?.value;
  const user = token ? await getUserFromAccessTokenFast(token) : null;

  if (user && params.oauth !== "denied") {
    redirect("/api/oauth/start");
  }

  const denied = params.oauth === "denied";

  return (
    <>
      <TopNav showAuth={false} />
      <main className="container section--tight" style={{ maxWidth: 640, paddingBottom: 96 }}>
        <h1 className="title-lg">Install Talaash</h1>
        <p className="body-md text-muted mt-md">
          Connect your Webflow site, index CMS collections, and embed semantic search — the same
          flow as Finsweet-style attributes, powered by your hosted Talaash app.
        </p>

        {denied && (
          <p className="insights-callout mt-md" role="alert">
            Webflow authorization was cancelled. You can try again whenever you&apos;re ready.
          </p>
        )}

        <ol className="body-md mt-lg" style={{ paddingLeft: 20, lineHeight: 1.7 }}>
          <li>Create or sign in to your Talaash account</li>
          <li>Approve Webflow access (<code>sites:read</code>, <code>cms:read</code>)</li>
          <li>Map collections, index content, copy embed values into Webflow Designer</li>
        </ol>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
          <Link
            className="btn btn-primary"
            href={user ? "/api/oauth/start" : "/login?next=/api/oauth/start"}
          >
            {user ? "Connect Webflow" : "Sign in to continue"}
          </Link>
          <Link className="btn btn-ghost" href="/support">
            Setup help
          </Link>
        </div>

        <p className="caption text-muted mt-lg">
          By continuing you agree to our <Link href="/terms">Terms</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </main>
    </>
  );
}
