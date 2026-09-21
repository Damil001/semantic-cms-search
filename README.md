# Unified semantic search for Webflow CMS

One search box. Visitors type a query like **AI data centers** and get a single ranked list of blogs, webinars, ebooks, and other CMS types — by meaning, not keyword overlap.

The item model is **source-agnostic**. Webflow is the first connector. Sanity or Contentful can write the same `content_items` / `content_chunks` rows with a different `source` and id prefix (`sanity:…`, `contentful:…`) without changing search or the frontend.

## Stack

- Node.js + TypeScript
- Supabase (Postgres + **pgvector**) — metadata and vectors in one place
- OpenAI `text-embedding-3-small` (1536 dimensions)
- Next.js 15 + React 19 dashboard (`app/`, `components/`)
- Vercel serverless API routes (`app/api/*`) — same backend logic as before
- Chart.js via `react-chartjs-2` for analytics charts
- Vanilla JS widget (`public/search.js`) — embed on customer sites, no build step

The browser never sees `SUPABASE_SERVICE_KEY` or the Webflow OAuth secret. Visitors only call the public `/search` URL. You host the server; they connect a site in a dashboard.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000/app](http://localhost:3000/app). API routes live under `/api/*`; the search widget stays at `/search.js`.

Production build: `npm run build && npm start`

## 1. Supabase

1. Create a project.
2. SQL Editor → run the files in `supabase/migrations/` in order, including **`20240825000003_webflow_app.sql`**.

## 2. Hosted Webflow App (recommended)

This is the Finsweet-like product flow: **you** deploy one backend. **They** install/connect the app, index CMS, and later hit **Re-index**.

**Marketplace:** see [`docs/MARKETPLACE.md`](docs/MARKETPLACE.md) for Install URL, legal pages, and the submission checklist.

1. Create a [Webflow Hybrid App](https://developers.webflow.com/) (Data Client + Designer Extension) with scopes `sites:read`, `sites:write`, `cms:read`, `custom_code:read`, `custom_code:write` (do **not** enable `cms:write`).
2. Redirect URL: `https://www.talaash.org/api/oauth/callback` (or your production host)
3. Application URL / App home: `https://www.talaash.org/app`
4. **Install URL (Marketplace):** `https://www.talaash.org/install`
5. Deploy this repo to Vercel with:

```
WEBFLOW_CLIENT_ID=
WEBFLOW_CLIENT_SECRET=
WEBFLOW_REDIRECT_URI=https://www.talaash.org/api/oauth/callback
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

5. Open `/login` → create account → **Connect Webflow** → map collections → **Index CMS**.
6. **Insights** tab shows search stats once visitors use the embedded search widget.

Run migration **`20240827000004_auth_and_analytics.sql`** in Supabase SQL Editor.

**Supabase Auth:** Dashboard → Authentication → Providers → enable Email. For MVP testing, disable “Confirm email” under Email provider so sign-up works immediately.

Add **`SUPABASE_ANON_KEY`** to Vercel (Project Settings → API → anon public key). Keep **`SUPABASE_SERVICE_KEY`** server-side only.

## 3. Optional CLI ingest

If you are not using OAuth yet, you can still set `WEBFLOW_TOKEN` + `src/config/webflow.ts` and run `npm run ingest`. Prefer `/app` for client sites.

## 4. Search API (Vercel)

Set the same env vars in the Vercel project (do **not** add `SUPABASE_SERVICE_KEY` to Webflow or any public script).

```bash
npx vercel
```

`GET /search?q=AI%20data%20centers&site=WEBFLOW_SITE_ID&token=SEARCH_TOKEN&types=blog,webinar&limit=10`

| Param   | Meaning                                      |
|---------|----------------------------------------------|
| `q`     | Query (required)                             |
| `site`  | Webflow site id (from `/app`, required)      |
| `token` | Install search token (from `/app`, required) |
| `types` | Optional comma-separated `content_type`s     |
| `limit` | Page size, max 50                            |

`site` + `token` must match the same `webflow_installs` row (401/403 otherwise). That keeps each customer’s CMS context isolated. You can also send `Authorization: Bearer SEARCH_TOKEN` instead of `token`.

The handler embeds `q`, runs semantic + keyword RPCs in parallel (~40 candidates each), fuses with **RRF (k=60)**, keeps **one result per CMS item**, then generates a short **AI answer** grounded in those hits (or a no-match message when empty).

Example body:

```json
{
  "query": "AI data centers",
  "answer": "Yes — we cover AI facility design. Start with the blog on GPU clusters and the webinar on cooling.",
  "answerStatus": "matched",
  "results": [
    {
      "id": "webflow:COLLECTION:ITEM",
      "type": "blog",
      "title": "…",
      "excerpt": "…",
      "url": "https://www.example.com/blog/…",
      "image_url": "https://…",
      "snippet": "…"
    }
  ]
}
```

Run migration **`20240828000005_search_token.sql`** so installs get a `search_token`.

### Autocomplete: `GET /suggest`

`GET /suggest?q=seo&site=WEBFLOW_SITE_ID&token=SEARCH_TOKEN&limit=6`

Same `site` + `token` auth as `/search`. No OpenAI call — returns popular past queries (from `search_events`) and matching CMS titles (from `content_items`) for the dropdown while the visitor types.

```json
{
  "query": "seo",
  "suggestions": [{ "text": "seo and website optimization", "count": 12 }],
  "items": [
    {
      "id": "webflow:COLLECTION:ITEM",
      "type": "blog",
      "title": "SEO checklist for 2026",
      "url": "https://www.example.com/blog/…"
    }
  ]
}
```

The widget calls `/suggest` automatically (debounced). Full `/search` (with AI answer) runs only on Enter or when a query suggestion is chosen. Clicking a CMS title navigates to that URL.

## 5. Build the search page in Webflow Designer

Preferred: open the **Talaash Designer Extension** and click **Insert search layout** (native elements + `data-search-*` attributes via Designer APIs — no Embed HTML paste).

Alternatively, add attributes by hand using the same Finsweet-style pattern; see `/docs/attributes`. The script clones the result template you styled.

Semantic ranking cannot run inside Webflow (no embeddings, and you must not put API keys in the browser). Ingest still reads your Webflow CMS; the published page only calls your public `/search` URL.

### Search script (Custom Code API)

In the Talaash dashboard, use **Install search on site**. That registers a pinned `search.js` (with SRI; default CSS inlined) on the connected Webflow site via the Custom Code API. Do **not** paste a footer script for Marketplace installs. Credentials are applied on the script tag — you do not need to put site id / token on the wrapper when Install was used.

After you change the widget code in production, click **Install search on site** again so Webflow gets a new immutable script version, then publish the site.

### Designer structure

On a static page (e.g. `/search`):

1. **Wrapper** — Div Block with `data-search` (credentials come from the installed script).
2. **Input** — Custom Element or form input with `data-search-input`.
3. **Answer (optional)** — Text or Paragraph with `data-search-answer`.
4. **Suggest (optional)** — Div with `data-search-suggest`, or omit (auto-created). Disable with `data-search-suggest="off"`.
5. **Filters (optional)** — Buttons with `data-search-filter`.
6. **Loading / empty** — `data-search-loading` / `data-search-empty`.
7. **Results** — Div with `data-search-results` plus a hidden source (`data-search-result-source` + `display:none`) containing the result card template.

On elements **inside** the result card:

| Attribute | Put on |
|-----------|--------|
| `data-search-result-type` | Text (blog / webinar / ebook) |
| `data-search-result-title` | Heading |
| `data-search-result-snippet` | Paragraph |
| `data-search-result-image` | Image (or a Div used as a cover) |

Use a **Link Block** wrapping the card (or any `a` inside). The script sets `href` to the item’s live URL.

Finsweet-shaped aliases also work (`fs-cmssearch-element="root|input|list|item|loader|empty|suggest|answer"`, `fs-cmssearch-field="title"`, `fs-cmssearch-filter="webinar"`).

Publish the site after Install + layout. Style `[aria-pressed="true"]` or `.is-active` for filter pills.

## 6. Local ranking demo (no keys)

```bash
npm run demo
```

Uses a five-item mock corpus (blog / webinar / ebook plus off-topic fillers), fake term vectors, keyword scores, the same RRF + collapse helpers as production, and asserts mixed types in the top of the list.

## Adding another CMS later

1. Fetch native documents.
2. Map to `content_items` (`source`, namespaced `id`, `content_type`, title, excerpt, url, image, dates).
3. Chunk + embed the same way; write `content_chunks`.
4. Leave `/search` and `public/search.js` unchanged.

## Out of scope

Reranking models, site crawling, and multi-tenant billing are intentionally not included.
