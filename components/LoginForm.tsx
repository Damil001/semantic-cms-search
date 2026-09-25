"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

type Mode = "signup" | "login" | "forgot";

const HEADINGS: Record<Mode, string> = {
  signup: "Create your Talaash account",
  login: "Sign in",
  forgot: "Reset your password",
};

export function LoginForm({
  preferSignup = false,
  intro,
}: {
  preferSignup?: boolean;
  intro?: string;
}) {
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const [mode, setMode] = useState<Mode>(
    params.get("mode") === "forgot" ? "forgot" : preferSignup ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [notice, setNotice] = useState(
    params.get("reset") === "done" ? "Password updated. Sign in with your new password." : ""
  );
  const [submitting, setSubmitting] = useState(false);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    setErrorCode("");
    setNotice("");
  }

  async function auth(action: "login" | "signup") {
    setSubmitting(true);
    trackEvent("auth_attempt", { action });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        signal: controller.signal,
        body: JSON.stringify({ action, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setErrorCode(data.code || "");
        trackEvent("auth_failed", { action, reason: data.code || "api_error" });
        return;
      }
      trackEvent("auth_success", { action });
      window.location.href = next;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("The request timed out. Try again in a moment.");
        trackEvent("auth_failed", { action, reason: "timeout" });
      } else {
        setError("Network error — check your connection and try again.");
        trackEvent("auth_failed", { action, reason: "network" });
      }
    } finally {
      window.clearTimeout(timeout);
      setSubmitting(false);
    }
  }

  async function sendReset() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send the reset email. Try again.");
        return;
      }
      setNotice(data.message);
      trackEvent("auth_reset_requested", {});
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setErrorCode("");
    setNotice("");
    if (mode === "forgot") void sendReset();
    else void auth(mode);
  }

  const submitLabel =
    mode === "signup" ? "Create account" : mode === "login" ? "Sign in" : "Email me a reset link";

  return (
    <>
      <h1 className="display-md mb-md">{HEADINGS[mode]}</h1>
      {mode === "forgot" ? (
        <p className="body-md text-muted mb-lg">
          Enter the email you signed up with and we’ll send you a link to choose a new password.
        </p>
      ) : (
        intro && <p className="body-md text-muted mb-lg">{intro}</p>
      )}
      <form id="form" onSubmit={onSubmit} noValidate={false}>
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
        {mode !== "forgot" && (
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                className="text-input"
                type={showPw ? "text" : "password"}
                id="password"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
            {mode === "signup" && (
              <p className="caption text-muted" style={{ marginTop: 6 }}>
                At least 6 characters.
              </p>
            )}
          </div>
        )}

        <div className="form-error" role="alert">
          {error}
          {(errorCode === "invalid_credentials" || errorCode === "account_exists") && (
            <>
              {" "}
              <button type="button" className="btn-link" onClick={() => switchMode("forgot")}>
                Reset password
              </button>
              {errorCode === "account_exists" && (
                <>
                  {" · "}
                  <button type="button" className="btn-link" onClick={() => switchMode("login")}>
                    Sign in instead
                  </button>
                </>
              )}
            </>
          )}
        </div>
        {notice && (
          <p className="body-sm" role="status" style={{ color: "var(--color-success, #1a7f37)" }}>
            {notice}
          </p>
        )}

        <div className="btn-row" style={{ flexDirection: "column", marginTop: 24 }}>
          <button
            type="submit"
            className={`btn btn-primary btn-block${submitting ? " is-loading" : ""}`}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="index-spinner" aria-hidden style={{ marginRight: 8 }} />
                <span className="btn-label">Please wait…</span>
              </>
            ) : (
              submitLabel
            )}
          </button>
        </div>

        <p className="body-sm text-muted" style={{ marginTop: 20, textAlign: "center" }}>
          {mode === "signup" && (
            <>
              Already have an account?{" "}
              <button type="button" className="btn-link" onClick={() => switchMode("login")}>
                Sign in
              </button>
            </>
          )}
          {mode === "login" && (
            <>
              New to Talaash?{" "}
              <button type="button" className="btn-link" onClick={() => switchMode("signup")}>
                Create an account
              </button>
              {" · "}
              <button type="button" className="btn-link" onClick={() => switchMode("forgot")}>
                Forgot password?
              </button>
            </>
          )}
          {mode === "forgot" && (
            <button type="button" className="btn-link" onClick={() => switchMode("login")}>
              Back to sign in
            </button>
          )}
        </p>
      </form>
    </>
  );
}
