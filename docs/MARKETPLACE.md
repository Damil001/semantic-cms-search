# Webflow Marketplace — resubmit checklist (post-rejection)

Production: **`https://www.talaash.org`**

This checklist mirrors the **Sep 2026 App Review rejection**. Do not resubmit until every item is done.

## Blockers called out by Webflow

### 1. Verifiable Client ID (foundational)

Reviewers could **not find** the Client ID you submitted.

- In [Webflow Developer / Apps](https://developers.webflow.com/), open the **exact** app you will submit.
- Copy its **Client ID** from App settings into the submission form (re-check after paste).
- Confirm the app still exists (not deleted / wrong workspace).
- Align Vercel `WEBFLOW_CLIENT_ID` / `WEBFLOW_CLIENT_SECRET` / Redirect URI with **that** app.
- Redirect URI must be exactly: `https://www.talaash.org/api/oauth/callback`
- Install URL: `https://www.talaash.org/install`
- App home: `https://www.talaash.org/app`
- Enable scopes used in code: `sites:read`, `sites:write`, `cms:read`, `custom_code:read`, `custom_code:write`
- Existing installs must **re-authorize** after scope changes.

### 2. Working account creation / onboarding

- Smoke-test in a private window: Install → **Create account** → Webflow OAuth → Setup.
- Confirm `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` on Vercel.
- Provide reviewers a working path (or temporary test credentials if the form allows).

### 3. No manual footer-script install

Code now installs via **Custom Code API** (`Install search script` in Setup; removed on disconnect).

- Update Marketplace **description** so it never tells users to paste a footer script.
- Distinguish: **App installs the script**; **customer designs** search UI attributes + publishes.

### 4. Carousel images — `1280×846` PNG/JPG, ≤2MB each, 3–5 images

Suggested frames + **alt text** (specific, accurate):

| Image | Alt text |
|-------|----------|
| 1 | Talaash Setup tab showing collection field mapping and Index CMS for a connected Webflow site |
| 2 | Insights dashboard with total prompts, unique prompts, and daily search volume chart |
| 3 | Content intelligence report listing topic trends and content gap recommendations |
| 4 | Published Webflow page with on-site semantic search results for a visitor query |

### 5. Listing copy (customer-facing — no OAuth/token/architecture dump)

**Short (≤100 chars) example:**  
`Semantic search and search insights for your Webflow CMS.`

**Long description — draft (edit before submit):**

Talaash adds meaning-based search across your Webflow CMS and shows what visitors look for.

**What you get**
- Semantic search over the collections you choose to index
- Optional AI answers grounded in your CMS content
- Insights: popular prompts, volume trends, and content gaps
- Content intelligence and AEO-style reports to prioritize what to write next

**How it works**
1. Install Talaash and create an account
2. Connect your Webflow site and approve access
3. Map collections, index content, and install the search script (applied through Webflow Custom Code)
4. Add a search layout in the Designer with Talaash attributes, then publish

**What you configure in Webflow**
- Which collections/fields to index
- On-page search UI (input and results elements)
- Publishing the site after script install or disconnect

Do **not** put Client secrets, redirect URIs, raw scope lists, or server architecture in the Marketplace listing. Put deep troubleshooting on `/support`.

### 6. Support / privacy / terms

Deployed pages must match product name **Talaash**, describe AI/OpenAI data use, and give full configure / use / remove guidance (no `YOUR_DOMAIN` placeholders).

### 7. Submission form extras

- Workspace admin **2FA** on
- Published **`.webflow.io`** test site with app installed + search working
- Demo video 2–5 min: create account, OAuth approve **and** deny, index, install script, search live
- App Review Preflight receipt `wfpre_…` when applicable
- Source maps only if you submit a Designer Extension bundle

## Values in Webflow App settings

| Field | Value |
|-------|--------|
| Install URL | `https://www.talaash.org/install` |
| Redirect URI | `https://www.talaash.org/api/oauth/callback` |
| App home | `https://www.talaash.org/app` |
| Scopes | `sites:read`, `sites:write`, `cms:read`, `custom_code:read`, `custom_code:write` |
| Privacy | `https://www.talaash.org/privacy` |
| Terms | `https://www.talaash.org/terms` |
| Support | `https://www.talaash.org/support` |

## Attestations

- OAuth tokens server-side only (`webflow_installs`)
- Disconnect revokes token, clears storage, and removes Custom Code we applied
- Encrypted at rest via Supabase/hosting
