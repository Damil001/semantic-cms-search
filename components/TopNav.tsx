"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

export function TopNav({
  email,
  showAuth = true,
}: {
  email?: string;
  showAuth?: boolean;
}) {
  const router = useRouter();

  async function logout() {
    trackEvent("logout");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* still leave */
    }
    router.replace("/login");
  }

  return (
    <nav className="top-nav">
      <Link
        className="top-nav__brand"
        href="/"
        onClick={() => trackEvent("nav_click", { target: "home" })}
      >
        <Image
          src="/brand/talaash-logo.png"
          alt=""
          width={28}
          height={28}
          className="top-nav__logo"
        />
        Talaash
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
          <>
            <Link
              className="body-md"
              href="/pricing"
              onClick={() => trackEvent("nav_click", { target: "pricing" })}
            >
              Pricing
            </Link>
            <Link
              className="btn btn-primary btn-sm"
              href="/install"
              onClick={() => trackEvent("nav_click", { target: "install" })}
            >
              Install
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
