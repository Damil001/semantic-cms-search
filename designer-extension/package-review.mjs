// Packages source + source map from the SAME build that produced dist/ (run `npm run build` first).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const review = join(root, "review");
const out = join(root, "review-package.zip");

if (!existsSync(join(root, "dist/bundle.js")) || !existsSync(join(root, "maps/bundle.js.map"))) {
  throw new Error("Run `npm run build` first — dist/bundle.js and maps/bundle.js.map are required.");
}

rmSync(review, { recursive: true, force: true });
rmSync(out, { force: true });
mkdirSync(join(review, "dist"), { recursive: true });

const files = [
  "src",
  "index.html",
  "styles.css",
  "build.mjs",
  "package-review.mjs",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "webflow.json",
  "README.md",
];
for (const f of files) {
  const from = join(root, f);
  if (existsSync(from)) cpSync(from, join(review, f), { recursive: true });
}
cpSync(join(root, "dist"), join(review, "dist"), { recursive: true });
cpSync(join(root, "maps/bundle.js.map"), join(review, "dist/bundle.js.map"));

const entries = [...files.filter((f) => existsSync(join(review, f))), "dist"];
if (process.platform === "win32") {
  const powershell = join(
    process.env.SystemRoot || "C:\\Windows",
    "System32/WindowsPowerShell/v1.0/powershell.exe",
  );
  const list = entries.map((e) => `'${e}'`).join(",");
  execFileSync(
    powershell,
    ["-NoProfile", "-Command", `Compress-Archive -Path ${list} -DestinationPath '${out}' -Force`],
    { cwd: review, stdio: "inherit" },
  );
} else {
  execFileSync("zip", ["-r", out, ...entries], { cwd: review, stdio: "inherit" });
}

console.log(`Review package: ${out}`);
