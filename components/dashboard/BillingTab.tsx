"use client";

import { useCallback, useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

type BillingStatus = {
  authenticated: true;
  email: string | null;
  active: boolean;
  plan: "starter" | "growth" | "scale" | null;
  planLabel: string | null;
  source: "paddle" | "grant" | null;
  status: string | null;
  billingCycle: "month" | "year" | null;
  collectionLimit: number | null;
  extraCollections: number;
  collectionsInUse: number;
  renewsAt: string | null;
  cancelsAt: string | null;
  graceEndsAt: string | null;
  graceDays: number;
  grantExpiresAt: string | null;
  canManage: boolean;
};

const MAX_EXTRA_COLLECTIONS = 50;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

async function loadStatus(): Promise<BillingStatus | null> {
  try {
    const res = await fetch("/api/billing/status", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.authenticated ? (data as BillingStatus) : null;
  } catch {
    return null;
  }
}

export function BillingTab() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [waitingForCheckout, setWaitingForCheckout] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [changePlan, setChangePlan] = useState<"starter" | "growth">("starter");
  const [changeExtras, setChangeExtras] = useState(0);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const next = await loadStatus();
    setStatus(next);
    if (next?.source === "paddle" && (next.plan === "starter" || next.plan === "growth")) {
      setChangePlan(next.plan);
      setChangeExtras(next.extraCollections);
    }
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromCheckout = params.get("checkout") === "success";
    let timer: number | undefined;
    let tries = 0;

    const poll = async () => {
      const next = await refresh();
      if (!fromCheckout) return;
      if (next?.active && next.source === "paddle") {
        setWaitingForCheckout(false);
        setNotice("Thanks — your subscription is active. Paddle has emailed your receipt.");
        window.history.replaceState({}, "", "/app?tab=billing");
        return;
      }
      if (++tries < 15) timer = window.setTimeout(poll, 2000);
      else setWaitingForCheckout(false);
    };

    if (fromCheckout) setWaitingForCheckout(true);
    void poll();
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function openPortal() {
    setOpening(true);
    setError(null);
    trackEvent("billing_portal_open");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST", credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Could not open billing.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing.");
      setOpening(false);
    }
  }

  async function saveChange() {
    setSaving(true);
    setError(null);
    setNotice(null);
    trackEvent("billing_change_plan", { plan: changePlan, extras: changeExtras });
    try {
      const res = await fetch("/api/billing/change", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: changePlan, extraCollections: changeExtras }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not change your plan.");
      setNotice("Plan updated. It can take a few seconds to show here.");
      window.setTimeout(() => void refresh(), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change your plan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="insights-panel mb-lg">
        <div className="index-progress__head" style={{ padding: "8px 0" }}>
          <span className="index-spinner" aria-hidden />
          <p className="index-progress__title">Loading billing…</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="insights-panel mb-lg">
        <p className="body-md text-muted" style={{ margin: 0 }}>
          Billing details could not load.
        </p>
        <button type="button" className="btn btn-secondary btn-sm mt-md" onClick={() => void refresh()}>
          Retry
        </button>
      </div>
    );
  }

  const isPaddle = status.source === "paddle";
  const canChange =
    isPaddle && status.active && (status.status === "active" || status.status === "trialing") && !status.cancelsAt;
  const overLimit = status.collectionLimit != null && status.collectionsInUse > status.collectionLimit;
  const changed =
    canChange && (changePlan !== status.plan || changeExtras !== status.extraCollections);

  return (
    <>
      {waitingForCheckout ? (
        <div className="checkout-notice mb-lg" role="status">
          <span className="index-spinner" aria-hidden style={{ marginRight: 8 }} />
          Confirming your payment with Paddle…
        </div>
      ) : null}
      {notice ? (
        <div className="checkout-notice mb-lg" role="status">
          {notice}
        </div>
      ) : null}
      {status.graceEndsAt && status.status === "past_due" ? (
        <div className="checkout-notice mb-lg" role="alert">
          <strong>Your last payment failed.</strong>{" "}
          {status.active
            ? `Search keeps working until ${formatDate(status.graceEndsAt)}. Update your payment method to avoid interruption.`
            : "Search on your site is paused. Update your payment method to turn it back on."}
        </div>
      ) : null}

      <div className="insights-panel mb-lg">
        <div className="insights-panel__head">
          <h3 className="title-sm">Your plan</h3>
          <p className="caption text-muted">{status.email ?? ""}</p>
        </div>

        {status.active && status.planLabel ? (
          <>
            <p className="title-lg" style={{ margin: "0 0 4px" }}>
              {status.planLabel}
              {status.source === "grant" ? " · complimentary" : ""}
            </p>
            <p className="body-md text-muted" style={{ margin: 0 }}>
              {isPaddle && status.billingCycle
                ? `Billed ${status.billingCycle === "year" ? "yearly" : "monthly"}. `
                : ""}
              {status.cancelsAt
                ? `Cancels on ${formatDate(status.cancelsAt)}. You keep access until then.`
                : status.renewsAt
                  ? `Renews on ${formatDate(status.renewsAt)}.`
                  : status.grantExpiresAt
                    ? `Access until ${formatDate(status.grantExpiresAt)}.`
                    : ""}
            </p>
            <p className="body-md mt-md" style={{ marginBottom: 0 }}>
              Collections: <strong>{status.collectionsInUse}</strong>
              {status.collectionLimit == null ? " (unlimited)" : ` of ${status.collectionLimit}`}
              {status.extraCollections > 0 ? ` · includes ${status.extraCollections} extra` : ""}
            </p>
            {overLimit ? (
              <p className="caption mt-sm" role="alert" style={{ color: "var(--color-error)" }}>
                More collections are ticked than your plan includes. Indexing is paused until you
                untick some on Setup or add extra collections below.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="title-lg" style={{ margin: "0 0 4px" }}>
              {status.status === "canceled" ? "Subscription ended" : "No plan yet"}
            </p>
            <p className="body-md text-muted" style={{ margin: 0, maxWidth: "60ch" }}>
              You can connect Webflow and explore the dashboard for free. Indexing your CMS,
              installing search on your site and live search need a plan.
            </p>
            <a
              className="btn btn-primary mt-md"
              href="/pricing#plans"
              onClick={() => trackEvent("cta_click", { location: "billing_tab", target: "pricing" })}
            >
              Choose a plan
            </a>
          </>
        )}

        {status.canManage ? (
          <div className="btn-row mt-md">
            <button
              type="button"
              className={`btn ${status.status === "past_due" ? "btn-primary" : "btn-secondary"}`}
              disabled={opening}
              onClick={openPortal}
            >
              {opening
                ? "Opening…"
                : status.status === "past_due"
                  ? "Update payment method"
                  : "Manage billing"}
            </button>
          </div>
        ) : null}
        {status.canManage ? (
          <p className="caption text-muted mt-sm" style={{ marginBottom: 0 }}>
            Opens Paddle, our payment provider, to update your card, download invoices or cancel.
          </p>
        ) : null}
      </div>

      {canChange ? (
        <div className="insights-panel mb-lg">
          <div className="insights-panel__head">
            <h3 className="title-sm">Change plan or collections</h3>
            <p className="caption text-muted">
              Changes are prorated and charged to your saved payment method right away.
            </p>
          </div>
          <div className="form-field">
            <label htmlFor="billing-plan">Plan</label>
            <select
              id="billing-plan"
              className="text-input"
              value={changePlan}
              onChange={(e) => setChangePlan(e.target.value as "starter" | "growth")}
            >
              <option value="starter">Starter · 10 collections</option>
              <option value="growth">Growth · 25 collections</option>
            </select>
          </div>
          <div className="qty-stepper">
            <span className="qty-stepper__label">
              Extra collections
              <span className="caption text-muted">
                +${status.billingCycle === "year" ? "50 / yr" : "5 / mo"} each
              </span>
            </span>
            <div className="qty-stepper__controls">
              <button
                type="button"
                aria-label="Remove an extra collection"
                disabled={changeExtras === 0}
                onClick={() => setChangeExtras((n) => Math.max(0, n - 1))}
              >
                −
              </button>
              <output aria-live="polite">{changeExtras}</output>
              <button
                type="button"
                aria-label="Add an extra collection"
                disabled={changeExtras >= MAX_EXTRA_COLLECTIONS}
                onClick={() => setChangeExtras((n) => Math.min(MAX_EXTRA_COLLECTIONS, n + 1))}
              >
                +
              </button>
            </div>
          </div>
          <div className="btn-row mt-md">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!changed || saving}
              onClick={saveChange}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
          <p className="caption text-muted mt-sm" style={{ marginBottom: 0 }}>
            Need more than Growth? <a href="/support">Contact us about Scale</a>.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="caption" role="alert" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
    </>
  );
}
