"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const errDesc = hash.get("error_description") || query.get("error_description");
    const token = hash.get("access_token");
    if (token && (hash.get("type") ?? "recovery") === "recovery") {
      setAccessToken(token);
      window.history.replaceState(null, "", window.location.pathname);
    } else {
      setLinkError(
        errDesc
          ? `${errDesc.replace(/\+/g, " ")}. Request a new reset link.`
          : "This reset link is invalid or has expired. Request a new one."
      );
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Use a password with at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords don’t match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update the password.");
        return;
      }
      window.location.href = "/login?mode=login&reset=done";
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <TopNav showAuth={false} />
      <section className="hero-band hero-band--centered">
        <div className="auth-card">
          <h1 className="display-md mb-md">Choose a new password</h1>
          {linkError ? (
            <>
              <p className="body-md text-muted mb-lg" role="alert">
                {linkError}
              </p>
              <Link className="btn btn-primary btn-block" href="/login?mode=forgot">
                Request a new link
              </Link>
            </>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="form-field">
                <label htmlFor="new-password">New password</label>
                <input
                  className="text-input"
                  type="password"
                  id="new-password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  className="text-input"
                  type="password"
                  id="confirm-password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <div className="form-error" role="alert">
                {error}
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                style={{ marginTop: 24 }}
                disabled={submitting || !accessToken}
              >
                {submitting ? "Saving…" : "Save new password"}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
