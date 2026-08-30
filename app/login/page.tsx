"use client";

import { Suspense } from "react";
import { TopNav } from "@/components/TopNav";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <>
      <TopNav showAuth={false} />
      <section className="hero-band hero-band--centered">
        <div className="auth-card">
          <h1 className="display-md mb-md">Sign in</h1>
          <p className="body-md text-muted mb-lg">
            Connect Webflow and view search insights for your CMS site.
          </p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </>
  );
}
