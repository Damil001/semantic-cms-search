import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const review = join(root, "review");
const out = join(root, "review-package.zip");

rmSync(review, { recursive: true, force: true });
rmSync(out, { force: true });
mkdirSync(review, { recursive: true });

execFileSync(process.execPath, [join(root, "build.mjs"), "--sourcemap", "--out-review"], {
  stdio: "inherit",
});

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

const entries = [...files.filter((f) => existsSync(join(review, f))), "dist"];
if (process.platform === "win32") {
  const list = entries.map((e) => `'${e}'`).join(",");
  const powershell = join(
    process.env.SystemRoot || "C:\\Windows",
    "System32/WindowsPowerShell/v1.0/powershell.exe",
  );
  execFileSync(
    powershell,
    ["-NoProfile", "-Command", `Compress-Archive -Path ${list} -DestinationPath '${out}' -Force`],
    { cwd: review, stdio: "inherit" },
  );
} else {
  execFileSync("zip", ["-r", out, ...entries], { cwd: review, stdio: "inherit" });
}

console.log(`Review package: ${out}`);
