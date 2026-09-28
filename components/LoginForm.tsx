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
  const rawNext = params.get("next") ?? "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\")
    ? rawNext
    : "/app";
  const [mode, setMode] = useState<Mode>(
    params.get("mode") === "forgot" ? "forgot" : preferSignup ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(params.get("error") ?? "");
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
      {mode !== "forgot" && (
        <>
          <a
            className="btn btn-secondary btn-block google-btn"
            href={`/api/auth/google?next=${encodeURIComponent(next)}`}
            onClick={() => trackEvent("auth_attempt", { action: `google_${mode}` })}
          >
            <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            <span>{mode === "signup" ? "Sign up with Google" : "Continue with Google"}</span>
          </a>
          <div className="auth-divider" role="separator">
            <span>or use email</span>
          </div>
        </>
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
            <div className="label-row">
              <label htmlFor="password">Password</label>
              {mode === "login" && (
                <button
                  type="button"
                  className="btn-link btn-link--strong"
                  onClick={() => switchMode("forgot")}
                >
                  Forgot password?
                </button>
              )}
            </div>
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

        <div className="auth-switch">
          <p className="body-sm text-muted">
            {mode === "signup" && "Already have an account?"}
            {mode === "login" && "New to Talaash?"}
            {mode === "forgot" && "Remembered your password?"}
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => switchMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </div>
      </form>
    </>
  );
}
