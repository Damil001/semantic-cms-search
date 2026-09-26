/**
 * Emit a readable source map for the published runtime.
 * Uses `.map.json` (not `.map`) because Vercel returns 403 for `*.map` on this project.
 */
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const jsPath = join(root, "public", "search.js");
const mapPath = join(root, "public", "search", "runtime.map.json");
const frontendPath = join(root, "frontend", "search.js");
const MAP_URL = "/search/runtime.map.json";
const MAP_COMMENT = `\n//# sourceMappingURL=${MAP_URL}\n`;

let source = readFileSync(jsPath, "utf8");
source = source.replace(/\n?\/\/# sourceMappingURL=.*\n?/g, "");
if (!source.endsWith("\n")) source += "\n";

const map = {
  version: 3,
  file: "search.js",
  sourceRoot: "",
  sources: ["search.js"],
  sourcesContent: [source],
  names: [],
  mappings: source
    .split("\n")
    .map((_, i) => (i === 0 ? "AAAA" : ";AACA"))
    .join(""),
};

mkdirSync(dirname(mapPath), { recursive: true });
writeFileSync(mapPath, `${JSON.stringify(map)}\n`);
writeFileSync(jsPath, source + MAP_COMMENT);
copyFileSync(jsPath, frontendPath);

// Keep a legacy filename for local tooling; do not rely on it in production.
writeFileSync(join(root, "public", "search.js.map"), `${JSON.stringify(map)}\n`);

const hex = createHash("sha256").update(readFileSync(jsPath)).digest("hex");
console.log(`Wrote ${MAP_URL} + sourceMappingURL`);
console.log("search.js sha256:", hex);
