# Webflow Marketplace submission checklist

This app is a **Data Client** (OAuth). External users can install it only after Webflow approves it for the Marketplace (or a private listing).

## Values to put in the Webflow Developer Dashboard

| Field | Value |
|-------|--------|
| **App home / Application URL** | `https://YOUR_PRODUCTION_DOMAIN/app` |
| **Install URL** | `https://YOUR_PRODUCTION_DOMAIN/install` |
| **Redirect URI** | `https://YOUR_PRODUCTION_DOMAIN/api/oauth/callback` |
| **Scopes** | `sites:read`, `cms:read` |
| **Privacy Policy** | `https://YOUR_PRODUCTION_DOMAIN/privacy` |
| **Terms** | `https://YOUR_PRODUCTION_DOMAIN/terms` |
| **Support** | `https://YOUR_PRODUCTION_DOMAIN/support` |

Replace `YOUR_PRODUCTION_DOMAIN` with your live Vercel domain (HTTPS only — no localhost).

## Vercel env vars (must match the Webflow app)

```
WEBFLOW_CLIENT_ID=
WEBFLOW_CLIENT_SECRET=
WEBFLOW_REDIRECT_URI=https://YOUR_PRODUCTION_DOMAIN/api/oauth/callback
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

## What you must do manually (cannot be done in code alone)

1. **Keep** the Semantic CMS app in Webflow Dev Dashboard — do not delete it.
2. **Edit App** → set Install URL, Redirect URI, App home to the production URLs above.
3. Confirm env vars on Vercel match that Client ID / Secret / Redirect URI.
4. Deploy the latest code to production and smoke-test `/install` → login → OAuth → Setup.
5. Publish a **demo Webflow site** (`.webflow.io`) with the search widget working.
6. Record a **2–5 minute demo video** (OAuth approve + deny, connect, index, search on the live site).
7. Replace `support@example.com` on `/support` with your real support email (edit `app/support/page.tsx` or host a real support page).
8. Prepare Marketplace listing assets: logo, screenshots, short description, category.
9. Submit at [https://developers.webflow.com/submit](https://developers.webflow.com/submit).
10. Optional pre-launch testing: email `developers@webflow.com` with up to 5 tester emails.

## Attestations (Marketplace guidelines)

When the form asks:

- **OAuth token stored server-side only** — yes (Supabase `webflow_installs`, never in the browser).
- **Deleted on disconnect** — yes (`POST /api/app/disconnect` revokes via Webflow and clears `access_token`).
- **Encrypted at rest** — attest based on your Supabase project encryption / hosting; tighten with app-level encryption later if required.

## Customer install path after Marketplace approval

1. User clicks Install in Marketplace → lands on `/install`.
2. Signs up / logs in → Webflow OAuth.
3. Maps collections → Index CMS.
4. Pastes footer script + Designer attributes from Setup.
5. Publishes their Webflow site.

Marketplace listing installs the **OAuth app**. The search UI is still embedded with `search.js` (unless you later ship a Designer Extension).
