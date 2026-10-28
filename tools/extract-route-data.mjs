// Pull hand-written content blocks out of the old route files (certitude rows, home shelves).
import { readFileSync, writeFileSync } from "node:fs";
const root = process.argv[2];
function literal(file, name) {
  const src = readFileSync(`${root}/src/routes/${file}`, "utf8");
  const start = src.indexOf(`const ${name} = `);
  if (start < 0) throw new Error(`${name} absent de ${file}`);
  let i = src.indexOf("[", start), depth = 0, inStr = null;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (inStr) { if (ch === "\\") { j++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
    if (ch === "[") depth++;
    if (ch === "]") { depth--; if (depth === 0) return Function(`"use strict";return (${src.slice(i, j + 1)});`)(); }
  }
  throw new Error("fin introuvable");
}
const out = { certitude: literal("certitude.tsx", "ROWS"), plus: literal("plus.tsx", "LINKS") };
writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log("certitude", out.certitude.length, "plus", out.plus.length);
