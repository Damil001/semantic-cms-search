"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { LoginForm } from "@/components/LoginForm";

function LoginHero() {
  const params = useSearchParams();
  const mode = params.get("mode");
  const next = params.get("next") || "";
  const fromInstall = next.includes("/install") || next.includes("oauth");
  const signupFirst = mode === "signup" || (fromInstall && mode !== "login");

  return (
    <div className="auth-card">
      <LoginForm
        preferSignup={signupFirst}
        intro={
          fromInstall
            ? "After you create an account or sign in, we’ll continue installing Talaash on your Webflow site."
            : "Connect Webflow and view search insights for your CMS site."
        }
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <TopNav showAuth={false} />
      <section className="hero-band hero-band--centered">
        <Suspense
          fallback={
            <div className="auth-card">
              <h1 className="display-md mb-md">Sign in</h1>
            </div>
          }
        >
          <LoginHero />
        </Suspense>
      </section>
    </>
  );
}
