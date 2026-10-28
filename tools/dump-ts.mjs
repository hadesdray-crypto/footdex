// Dump every TypeScript data module of a Footdex source tree to JSON, losslessly.
// Usage: node tools/dump-ts.mjs <srcRoot> <outFile>
const esbuild = await import("esbuild").catch(() => import("/opt/npm-tools/node_modules/esbuild/lib/main.js"));
const { build } = esbuild.default ?? esbuild;
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const [srcRoot, outFile] = process.argv.slice(2).map((p) => resolve(p));
const exts = ["", ".ts", ".tsx", ".js", ".json"];
const aliasPlugin = {
  name: "at-alias",
  setup(b) {
    b.onResolve({ filter: /^@\// }, (args) => {
      const base = join(srcRoot, args.path.slice(2));
      for (const e of exts) if (existsSync(base + e)) return { path: base + e };
      return { errors: [{ text: "introuvable: " + args.path }] };
    });
  },
};
const mods = [
  ["players", "data/players"], ["roster", "data/roster"], ["matches", "data/matches"], ["clubs", "data/clubs"],
  ["learn", "data/learn"], ["portraits", "data/portraits"], ["edition", "data/edition"], ["saison", "data/saison"],
  ["updates", "data/updates"], ["coupes", "data/coupes"], ["effectifs", "data/effectifs"],
  ["saison2026", "data/saison-2026/joueurs"],
];
const present = mods.filter(([, p]) => exts.some((e) => existsSync(join(srcRoot, p) + e)));
const entry = present.map(([n, p], i) => `import * as m${i} from "@/${p}";`).join("\n") +
  "\nexport default {" + present.map(([n], i) => `${JSON.stringify(n)}: m${i}`).join(",") + "};\n";
const tmp = join(dirname(outFile), ".dump-" + Date.now() + ".mjs");
mkdirSync(dirname(outFile), { recursive: true });
await build({ stdin: { contents: entry, resolveDir: srcRoot, loader: "js" }, bundle: true, format: "esm",
  platform: "node", outfile: tmp, plugins: [aliasPlugin], logLevel: "error" });
const mod = (await import(pathToFileURL(tmp).href)).default;
const out = {};
for (const [name, ns] of Object.entries(mod)) {
  out[name] = {};
  for (const [k, v] of Object.entries(ns)) out[name][k] = typeof v === "function" ? `[function ${k}]` : v;
}
writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log("modules:", Object.keys(out).join(", "));
for (const [n, ns] of Object.entries(out)) console.log(" ", n, Object.entries(ns).map(([k, v]) => `${k}${Array.isArray(v) ? `[${v.length}]` : ""}`).join(" "));
