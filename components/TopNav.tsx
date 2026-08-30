"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function TopNav({
  email,
  showAuth = true,
}: {
  email?: string;
  showAuth?: boolean;
}) {
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* still leave */
    }
    router.replace("/login");
  }

  return (
    <nav className="top-nav">
      <Link className="top-nav__brand" href="/app">
        Search Intelligence
      </Link>
      <div className="top-nav__cluster">
        {showAuth && email ? (
          <>
            <span className="top-nav__meta">{email}</span>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Sign out
            </button>
          </>
        ) : (
          <Link className="body-md" href="/pricing">
            Pricing
          </Link>
        )}
      </div>
    </nav>
  );
}
