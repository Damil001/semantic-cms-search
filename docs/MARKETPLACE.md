# Webflow Marketplace — resubmission packet (ticket #1195490, Sep 24 2026 review)

Production: `https://www.talaash.org` · Client ID: `b38850a6e8dafa44de5f4496b80a55956e5e61faab950cc67eaa6bd7b57a98bf`

A 14-day hold applies if **any** finding is unresolved, unverifiable, or a new violation appears.
Do every step in **A** before pasting **B–F** into the submission.

---

## A. Do this before submitting (in order)

0. **Commit `public/search/v/*.js`** (immutable widget snapshots). Whenever `public/search.js`
   changes, run `npm run snapshot:search` and commit the new file — never delete old ones. After
   deploying, click **Install search on site** again on the test site so it pins `/search/v/<hash>.js`.
1. **Vercel env vars** (Production) — add, then redeploy:
   - `TOKEN_ENCRYPTION_KEY` — `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - `CRON_SECRET` — any long random string
2. **Encrypt existing tokens now** (don't wait for the nightly job):
   `curl -H "Authorization: Bearer $CRON_SECRET" https://www.talaash.org/api/cron/purge`
   → expect `"ok":true`. Check Supabase `webflow_installs.access_token` values start with `enc:v1:`.
3. **Supabase → Authentication → URL Configuration**: add
   `https://www.talaash.org/reset-password` to **Redirect URLs**; Site URL `https://www.talaash.org`.
   (Optional but recommended: custom SMTP so reset emails aren't rate-limited.)
4. **Webflow App settings → Scopes** — must match code exactly:
   | Building block | Setting |
   |---|---|
   | Sites | **Read** (not Read and write) |
   | CMS | **Read** (not Read and write) |
   | Custom code | **Read and write** |
   | Everything else | **No access** |
5. **Designer Extension** — upload `designer-extension/bundle.zip` (no source maps inside).
   Attach `designer-extension/review-package.zip` wherever the form asks for source maps / source.
   Rebuild both with: `npm --prefix designer-extension run bundle` and `npm --prefix designer-extension run review-package`.
6. **Test site** — a real, published `https://<name>.webflow.io` on a **paid Site plan** with the app
   installed, collections indexed, search box inserted with the extension, and search working.
7. **Smoke-test in a private window** (record this — it is the evidence video, see F):
   brand-new email → Create account → Authorize → Setup loads collections automatically →
   Index CMS → Install search on site → Designer: Launch Talaash → select a Section → Insert →
   Publish → search on live site → Forgot password flow → Disconnect → confirm script gone after publish.
8. **Reviewer account** — create ONE account for `marketplaceteam@webflow.com` with ONE password.
   Use that single password everywhere in the notes.
9. **Preflight** — run the App Review Preflight and paste the `wfpre_…` receipt.
10. **Carousel** — recapture (see E).

---

## B. Per-finding responses (paste into review notes)

**1. Account creation / password recovery.** Root cause: on the Create account screen, pressing
Enter submitted the form as *Sign in*, so a new email returned “Invalid login credentials”; sign-in
right after account creation also had no retry. Fixed: the form now has a single mode (Create account /
Sign in / Reset password) and Enter always performs the visible action; new accounts retry sign-in
briefly; an existing email returns “An account with this email already exists” with Sign in / Reset
password links. Added **Forgot password?** → email reset link → `/reset-password` to set a new password.

**2. Listing too technical.** Rewrote the listing in plain language (section C). No API names,
integrity hashes, scopes, or settings paths remain; those live on `/support` only.

**3. Scope mismatch.** The app now requests exactly `sites:read cms:read custom_code:read
custom_code:write` from its only install path (`/install` → `/api/oauth/start`). App settings were
changed to match (Sites Read, CMS Read, Custom code Read and write). `sites:write` and `cms:write` are
not requested anywhere.

**4. Data disclosures.** The listing now states that visitor/session IDs and autocomplete are on by
default and how to turn them off. The Privacy Policy now states where data is stored (Supabase-managed
PostgreSQL on AWS; app servers on Vercel), that Disconnect deletes the token, indexed content,
embeddings, mappings and analytics **immediately**, that revocation from Webflow triggers the same
deletion **within 24 hours** (daily cleanup job), and that deletion requests complete within **30 days**.

**5. Attestations & evidence.** See D (attestations) and F (evidence video + screenshots).

**6. Carousel & description.** New 1280×846 screenshots of the current UI only (no Copy HTML, Embed,
unversioned URL or stylesheet). Description names intended users, states the paid Webflow Site plan
requirement, defines AEO, and replaces “fair-use” with the exact plan limits (collections and
re-indexes per month) and prices shown on https://www.talaash.org/pricing.

**7. Setup: first error didn’t point to its fix.** Setup now loads collections from Webflow
automatically on first visit. If none are loaded, Save/Index show “No CMS collections are loaded yet”
with a **Refresh fields now** button; if collections exist but none are ticked, the message says exactly
which checkbox to tick. Index success says what happened; Save says “Next: click Index CMS”.

**8. Designer Extension.** Panel opens larger (420×640). It shows live where the layout will go based
on the current selection: inside a selected Section/Div (after its content), directly below a selected
text/image/button, or at the **top** of the page when Body is selected. With nothing selected the button
is disabled. After insert, the new “Talaash Search” block is selected so it’s easy to find.

**9. Review notes / packages.** One reviewer password, a real `.webflow.io` URL, one setup sequence
(section F). Production `bundle.zip` contains only `bundle.js`, `index.html`, `styles.css`,
`webflow.json` (no maps). `review-package.zip` contains source, source maps, `package.json`,
`package-lock.json`, `tsconfig.json` and the build scripts.

**10. Support page.** `/support` now covers the paid Site plan prerequisite, Refresh fields, every
setup/index error message and its fix, sign-in errors, password reset, disconnect and manual removal,
and shows “Last updated: September 26, 2026”.

---

## C. Listing copy

**Short description (≤100 chars):**
```
AI search for your Webflow CMS, plus insights into what your visitors are looking for.
```

**Long description:**
```
Talaash adds an AI search box to your Webflow site that understands what visitors mean, not just the exact words they type, and shows you what people search for so you know what content to create next.

WHO IT'S FOR
Webflow site owners, marketers and agencies running content-heavy CMS sites such as blogs, resource libraries, help centers, directories and course catalogs.

WHAT YOU GET
• Search that finds the right CMS items even when visitors use different words
• Optional AI answers written only from your own CMS content
• Insights: most-searched topics, search volume over time, and searches that found nothing
• Content and AEO reports. AEO (answer engine optimization) means shaping your content so AI assistants and search engines can quote it as a direct answer.

HOW IT WORKS
1. Install Talaash and create an account.
2. Choose your Webflow site and approve access.
3. Pick the CMS collections to search and click Index.
4. Click "Install search on site".
5. In the Designer, open the Talaash app, select where search should go and click "Insert search layout". Style it like any element, then publish.

REQUIREMENTS
• A Webflow site on a paid Site plan (Webflow only runs app scripts on paid Site plans)
• At least one CMS collection with published items
• Permission to install apps and publish the site

PRICING
Talaash is a paid app. Creating an account and connecting your site to try the product is free; running search on a live site requires a paid plan:
• Starter: $499 one-time setup + $49/month (up to 10 collections, 1 search page, 2 re-indexes a month)
• Growth: $749 one-time setup + $79/month (up to 25 collections, filters, AI answers, content and AEO reports, 4 re-indexes a month)
• Scale: $999 one-time setup + $149/month (unlimited collections, SLA, agency options)
Setup covers connecting your site, mapping your CMS fields, the first index and a working search experience. Add-ons such as extra collections or re-indexes are listed on our pricing page. To purchase, contact us through our Support page; plans are billed by Talaash, not through Webflow.

YOUR VISITORS' DATA
By default the search box stores a random, anonymous visitor ID and session ID in the visitor's browser so you can see unique-visitor counts, and it shows autocomplete suggestions while visitors type (the typed text is sent to Talaash to fetch suggestions). No names, emails or IP addresses are linked to searches. You can turn off the IDs, autocomplete, or both with one setting each; see our Support page.

REMOVING TALAASH
Click Disconnect in Talaash to remove the search script, revoke access and delete your site's indexed content and analytics, then publish your site.

LANGUAGE
English.
```

---

## D. Attestations (paste verbatim)

**Executable-change review.** All changes to executable code that runs on customer sites
(`search.js`) or in the Designer (extension bundle) are reviewed by the publisher before deployment.
Site scripts are registered as immutable, versioned URLs with an SRI integrity hash, so an update
never reaches a customer site until the customer clicks “Install search on site” again and publishes.

**OAuth token handling (Data Client).**
1. *Encrypted at rest* — Webflow OAuth access tokens are encrypted with AES-256-GCM (random IV per
   token, key held only in server environment variables) before being written to the database, which
   is itself encrypted at rest.
2. *Server-side only* — tokens are decrypted only inside server functions to call the Webflow API.
   They are never sent to browsers, the Designer Extension, customer sites, or third parties (including
   OpenAI).
3. *Deleted on uninstall / revoke* — Disconnect revokes the token with Webflow and deletes it (and the
   site’s indexed data) immediately. If access is revoked from Webflow’s side, a daily job detects the
   revoked token and deletes it and the site’s data within 24 hours.

---

## E. Carousel (3–5 images, 1280×846 PNG/JPG, ≤2 MB)

Capture at 100% browser zoom in a 1280-wide window so text is readable; crop, don't shrink.

| # | Screen | Alt text |
|---|--------|----------|
| 1 | Live `.webflow.io` page with a search query and results | Visitor searching a Webflow site with Talaash and seeing matching CMS results |
| 2 | Setup: collections loaded + “Indexed N items” success | Talaash Setup showing Webflow CMS collections selected and indexed |
| 3 | Designer with Talaash panel showing “Inside Section…” and the inserted block selected | Talaash app in the Webflow Designer adding a search layout to a selected section |
| 4 | Insights dashboard | Search insights showing top searches, volume over time and searches with no results |
| 5 | Content / AEO report | Content report suggesting topics to write based on what visitors searched |

Do **not** show: Copy HTML, Embed, raw script URLs, integrity hashes, or `search.css`.

---

## F. Review notes (single, consistent)

```
Test site (published, paid Site plan): https://<YOUR-SITE>.webflow.io
Reviewer login: marketplaceteam@webflow.com / <ONE PASSWORD>
(Or create a new account at https://www.talaash.org/install — signup and password reset both work.)

Setup sequence:
1. https://www.talaash.org/install → Create account (or sign in with the credentials above)
2. Approve Webflow access (choose your test site)
3. Setup tab: collections load automatically → Index CMS
4. Install search on site
5. Designer → Apps → Talaash → select a Section → Insert search layout
6. Publish → search on the live site
Remove: Setup → Disconnect Webflow → publish.

Evidence: video <LINK> covering signup, OAuth approve + deny, index, install, extension insert,
live search, script update (Install again), disconnect + removal after publish, password reset.
Designer Extension source/maps: review-package.zip (includes package.json + package-lock.json).
Preflight receipt: wfpre_<…>
```
