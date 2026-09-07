# Webflow Marketplace submission checklist

This app (**Talaash**) is a **Data Client** (OAuth). External users can install it only after Webflow approves it for the Marketplace (or a private listing).

Production domain: **`https://www.talaash.org`** (also `talaash.org` → www).

## Values to put in the Webflow Developer Dashboard

| Field | Value |
|-------|--------|
| **App home / Application URL** | `https://www.talaash.org/app` |
| **Install URL** | `https://www.talaash.org/install` |
| **Redirect URI** | `https://www.talaash.org/api/oauth/callback` |

**Important:** Use **`www.talaash.org` everywhere** (Webflow Redirect URI, `WEBFLOW_REDIRECT_URI`, and when clicking Install). Mixing `talaash.org` and `www.talaash.org` breaks OAuth cookies and causes callback errors.

| **Scopes** | `sites:read`, `cms:read` |
| **Privacy Policy** | `https://www.talaash.org/privacy` |
| **Terms** | `https://www.talaash.org/terms` |
| **Support** | `https://www.talaash.org/support` |

## Vercel env vars (must match the Webflow app)

```
WEBFLOW_CLIENT_ID=
WEBFLOW_CLIENT_SECRET=
WEBFLOW_REDIRECT_URI=https://www.talaash.org/api/oauth/callback
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

## What you must do manually (cannot be done in code alone)

1. **Keep** the Semantic CMS / Talaash app in Webflow Dev Dashboard — do not delete it.
2. **Edit App** → set Install URL, Redirect URI, App home to the production URLs above (use `www.talaash.org` once DNS is Valid).
3. Confirm env vars on Vercel match that Client ID / Secret / Redirect URI.
4. Wait until Vercel shows **Valid Configuration** for `www.talaash.org` (nameserver propagation).
5. Deploy the latest code and smoke-test `https://www.talaash.org/install` → login → OAuth → Setup.
6. Publish a **demo Webflow site** (`.webflow.io`) with the search widget working.
7. Record a **2–5 minute demo video** (OAuth approve + deny, connect, index, search on the live site).
8. Support email is `damiljamil63@gmail.com` on `/support`.
9. Prepare Marketplace listing assets: logo, screenshots, short description, category.
10. Submit at [https://developers.webflow.com/submit](https://developers.webflow.com/submit).
11. Optional pre-launch testing: email `developers@webflow.com` with up to 5 tester emails.

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
