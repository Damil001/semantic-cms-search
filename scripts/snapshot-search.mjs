// Copies public/search.js to public/search/v/<sha256-prefix>.js so every version Webflow has
// pinned (with its SRI hash) stays byte-identical forever. Commit the generated files.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public", "search.js");
const outDir = join(root, "public", "search", "v");

const bytes = readFileSync(src);
const hex = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
const out = join(outDir, `${hex}.js`);
const mapSrc = join(root, "public", "search", "runtime.map.json");
const mapOut = join(outDir, `${hex}.map.json`);

mkdirSync(outDir, { recursive: true });
if (!existsSync(out)) {
  copyFileSync(src, out);
  if (existsSync(mapSrc)) copyFileSync(mapSrc, mapOut);
  console.log(`Snapshot created: public/search/v/${hex}.js — commit it.`);
} else {
  if (existsSync(mapSrc) && !existsSync(mapOut)) copyFileSync(mapSrc, mapOut);
  console.log(`Snapshot up to date: public/search/v/${hex}.js`);
}
