import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { getUserFromAccessTokenFast } from "@/src/app/goauth";

export const metadata = {
  title: "Install · Talaash",
  description: "Create a Talaash account and connect Webflow CMS search",
};

export const dynamic = "force-dynamic";

const WWW = "https://www.talaash.org";

/**
 * Marketplace Install URL should point here:
 *   https://www.talaash.org/install
 */
export default async function InstallPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string; message?: string }>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  const token = jar.get("sb_access")?.value;
  const user = token ? await getUserFromAccessTokenFast(token) : null;

  const oauthStatus = params.oauth;
  const blockedAuto =
    oauthStatus === "denied" || oauthStatus === "error";

  // Fresh install (no error): send logged-in users straight into OAuth document flow
  if (user && !blockedAuto) {
    redirect(`${WWW}/api/oauth/start`);
  }

  return (
    <>
      <TopNav showAuth={false} />
      <main className="container section--tight" style={{ maxWidth: 640, paddingBottom: 96 }}>
        <h1 className="title-lg">Install Talaash</h1>
        <p className="body-md text-muted mt-md">
          Create a free Talaash account, connect your Webflow site, index CMS collections, and
          install semantic search — the search script is applied through Webflow’s Custom Code
          API.
        </p>

        {oauthStatus === "denied" && (
          <p className="insights-callout mt-md" role="alert">
            Webflow authorization was cancelled. You can try again whenever you&apos;re ready.
          </p>
        )}

        {oauthStatus === "error" && (
          <p className="insights-callout mt-md" role="alert">
            {params.message ||
              "Webflow authorization failed. Open https://www.talaash.org/install (with www), then try again."}
          </p>
        )}

        <ol className="body-md mt-lg" style={{ paddingLeft: 20, lineHeight: 1.7 }}>
          <li>Create a Talaash account (or sign in)</li>
          <li>Approve Webflow access when prompted</li>
          <li>Map collections, index content, install the search script, then publish</li>
        </ol>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
          {user ? (
            <a className="btn btn-primary" href={`${WWW}/api/oauth/start`}>
              Connect Webflow
            </a>
          ) : (
            <>
              <Link
                className="btn btn-primary"
                href="/login?next=/install&mode=signup"
              >
                Create account
              </Link>
              <Link className="btn btn-secondary" href="/login?next=/install">
                Sign in
              </Link>
            </>
          )}
          <Link className="btn btn-ghost" href="/support">
            Setup help
          </Link>
        </div>

        <p className="caption text-muted mt-lg">
          Always use <strong>https://www.talaash.org</strong> (include <code>www</code>).
          Bookmark that URL — not the apex domain.
        </p>

        <p className="caption text-muted mt-lg">
          By continuing you agree to our <Link href="/terms">Terms</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </main>
    </>
  );
}
