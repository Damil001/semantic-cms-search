# Talaash Designer Extension

Hybrid companion to the Talaash Data Client. Inserts a minimum search layout on the Webflow canvas with the required `data-search-*` attributes via Designer APIs.

## Develop

```bash
cd designer-extension
npm install
npm run build
npx @webflow/webflow-cli extension serve
```

Launch the extension from the Designer (Apps → Development / your app).

## Bundle for Marketplace upload

```bash
cd designer-extension
npm run build
npx @webflow/webflow-cli extension bundle
```

Upload `bundle.zip` in the Webflow App version manager. Keep `dist/*.map` for the review source-map field.

## What it does

1. User selects a parent (or Body is used as fallback).
2. Extension appends Div / Form input / results / hidden result template.
3. Sets custom attributes used by `search.js`.
4. Script install + credentials remain in the dashboard via Custom Code API.
