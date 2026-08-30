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

  async function auth(action: "login" | "signup") {
    setError("");
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    router.replace(next);
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
        <button type="submit" className="btn btn-primary btn-block">
          Sign in
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => auth("signup")}
        >
          Create account
        </button>
      </div>
    </form>
  );
}
