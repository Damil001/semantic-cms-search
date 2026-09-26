/**
 * Emit public/search.js.map (sourcesContent) and pin //# sourceMappingURL=/search.js.map
 * so Preflight can open readable source next to the published runtime.
 */
import { createHash } from "node:crypto";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const jsPath = join(root, "public", "search.js");
const mapPath = join(root, "public", "search.js.map");
const frontendPath = join(root, "frontend", "search.js");
const MAP_COMMENT = "\n//# sourceMappingURL=/search.js.map\n";

let source = readFileSync(jsPath, "utf8");
source = source.replace(/\n?\/\/# sourceMappingURL=.*\n?$/m, "");
if (!source.endsWith("\n")) source += "\n";

const map = {
  version: 3,
  file: "search.js",
  sourceRoot: "",
  sources: ["search.js"],
  sourcesContent: [source],
  names: [],
  // Line-identity mapping: each output line maps to the same line in sources[0].
  mappings: source
    .split("\n")
    .map((_, i) => (i === 0 ? "AAAA" : ";AACA"))
    .join(""),
};

writeFileSync(mapPath, `${JSON.stringify(map)}\n`);
writeFileSync(jsPath, source + MAP_COMMENT);
copyFileSync(jsPath, frontendPath);

const hex = createHash("sha256").update(readFileSync(jsPath)).digest("hex");
console.log("Wrote public/search.js.map + sourceMappingURL");
console.log("search.js sha256:", hex);
