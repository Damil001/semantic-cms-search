"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function auth(action: "login" | "signup") {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    auth("login");
  }

  return (
    <form id="form" onSubmit={onSubmit}>
      <div className="form-field">
        <label htmlFor="email">Email</label>
        <input
          className="text-input"
          type="email"
          id="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor="password">Password</label>
        <div className="password-field">
          <input
            className="text-input"
            type={showPw ? "text" : "password"}
            id="password"
            required
            minLength={6}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="password-toggle"
            aria-label={showPw ? "Hide password" : "Show password"}
            onClick={() => setShowPw((v) => !v)}
          >
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <div className="form-error">{error}</div>
      <div className="btn-row" style={{ flexDirection: "column", marginTop: 24 }}>
        <button
          type="submit"
          className={`btn btn-primary btn-block${submitting ? " is-loading" : ""}`}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="index-spinner" aria-hidden style={{ marginRight: 8 }} />
              <span className="btn-label">Signing in…</span>
            </>
          ) : (
            "Sign in"
          )}
        </button>
        <button
          type="button"
          className={`btn btn-secondary btn-block${submitting ? " is-loading" : ""}`}
          disabled={submitting}
          onClick={() => auth("signup")}
        >
          {submitting ? "Please wait…" : "Create account"}
        </button>
      </div>
    </form>
  );
}
