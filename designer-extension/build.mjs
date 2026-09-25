import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const withMaps = process.argv.includes("--sourcemap");
const dist = join(root, process.argv.includes("--out-review") ? "review/dist" : "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Production bundle.zip must not ship source maps; the review package builds with --sourcemap.
await esbuild.build({
  entryPoints: [join(root, "src/main.ts")],
  bundle: true,
  outfile: join(dist, "bundle.js"),
  format: "iife",
  target: ["es2020"],
  minify: false,
  sourcemap: withMaps,
});

copyFileSync(join(root, "index.html"), join(dist, "index.html"));
copyFileSync(join(root, "styles.css"), join(dist, "styles.css"));

console.log(`Built ${dist}${withMaps ? " (with source maps)" : ""}`);
