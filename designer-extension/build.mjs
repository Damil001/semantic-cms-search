import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const maps = join(root, "maps");

rmSync(dist, { recursive: true, force: true });
rmSync(maps, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
mkdirSync(maps, { recursive: true });

// "external": the map is written without a sourceMappingURL comment, so dist/bundle.js is
// byte-identical whether or not the map ships. The map is moved out of dist so bundle.zip
// never contains it; review-package.zip pairs it with this exact bundle.js.
await esbuild.build({
  entryPoints: [join(root, "src/main.ts")],
  bundle: true,
  outfile: join(dist, "bundle.js"),
  format: "iife",
  target: ["es2020"],
  minify: false,
  sourcemap: "external",
  sourcesContent: true,
});
renameSync(join(dist, "bundle.js.map"), join(maps, "bundle.js.map"));

copyFileSync(join(root, "index.html"), join(dist, "index.html"));
copyFileSync(join(root, "styles.css"), join(dist, "styles.css"));

console.log("Built dist/ (production) and maps/bundle.js.map");
