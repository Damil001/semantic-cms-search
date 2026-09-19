import { readFileSync, writeFileSync } from "node:fs";

const css = readFileSync("public/search.css", "utf8");
const path = "public/search.js";
let js = readFileSync(path, "utf8");

const start = js.indexOf("  function ensureDefaultStyles()");
const end = js.indexOf("  function boot()", start);
if (start < 0 || end < 0) {
  console.error("markers not found", start, end);
  process.exit(1);
}

const inject = `  function ensureDefaultStyles() {
    if (document.getElementById("talaash-search-css")) return;
    var style = document.createElement("style");
    style.id = "talaash-search-css";
    style.textContent = ${JSON.stringify(css)};
    document.head.appendChild(style);
  }

`;

js = js.slice(0, start) + inject + js.slice(end);
writeFileSync(path, js);
console.log("OK inlined", css.length, "css chars; js", js.length);
