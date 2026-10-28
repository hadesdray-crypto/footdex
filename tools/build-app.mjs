// Builds the app twice from the same source:
//   dist/artifact/  the page published on claude.ai (no doctype: the host wraps it)
//   dist/site/      a standalone site for any static host, with an offline copy
// esbuild comes from the project's node_modules (npm install), or from this sandbox's tool folder.
const esbuild = await import("esbuild").catch(() => import("/opt/npm-tools/node_modules/esbuild/lib/main.js"));
const { build, transform } = esbuild.default ?? esbuild;
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "app");
const DIST = join(ROOT, "dist");
const dev = process.argv.includes("--dev");

// Three builds of the same code: the claude.ai page, the website (offline copy), the Android app (APK).
const VERSION = new Date().toISOString().slice(0, 16).replace("T", " ");
const APK_VERSION = Number(process.env.APK_VERSION || 0);
async function bundle(kind) {
const js = await build({
  entryPoints: [join(APP, "src/main.tsx")],
  bundle: true,
  write: false,
  format: "iife",
  target: ["es2020", "safari15"],
  jsx: "automatic",
  minify: !dev,
  sourcemap: false,
  legalComments: "none",
  define: {
    "process.env.NODE_ENV": JSON.stringify(dev ? "development" : "production"),
    __HORS_LIGNE__: kind === "site" ? "true" : "false",
    __APK__: kind === "apk" ? "true" : "false",
    __APK_VERSION__: JSON.stringify(APK_VERSION),
    __VERSION_APP__: JSON.stringify(VERSION),
  },
  nodePaths: [join(ROOT, "node_modules"), "/opt/npm-tools/node_modules"],
  logLevel: "warning",
});
return js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
}
const script = await bundle("artifact");
const siteScript = await bundle("site");
const apkScript = await bundle("apk");

// Styles live in app/src/styles/, read in name order (00-base.css first).
const STYLES = join(APP, "src/styles");
const source = readdirSync(STYLES)
  .filter((f) => f.endsWith(".css"))
  .sort()
  .map((f) => `/* ${f} */\n${readFileSync(join(STYLES, f), "utf8")}`)
  .join("\n");
const css = (await transform(source, { loader: "css", minify: !dev, target: ["chrome105", "safari16"] })).code;

// One stylesheet per family: if one family cannot load, the others still do.
const FONTS = [
  "https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600..900&display=swap",
  "https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&display=swap",
  "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap",
];
const fontLinks = FONTS.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n");

const boot = `<div id="root"><div class="boot" role="status"><p class="boot__word">FOOTDEX</p><p class="boot__sub">Ouverture de l'album…</p></div></div>`;

const artifactPage = `<title>Footdex</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="L'almanach du football de Raphaël : joueurs, matchs, scores, paquets de cartes et classeur.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fontLinks}
<style>${css}</style>
${boot}
<script>document.documentElement.lang="fr";</script>
<script>${script}</script>
`;

const sitePageFor = (code, offline) => `<!doctype html>
<html lang="fr" data-offline="${offline ? 1 : 0}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Footdex</title>
<meta name="description" content="L'almanach du football de Raphaël : joueurs, matchs, scores, paquets de cartes et classeur.">
<meta name="theme-color" content="#070b16">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="apple-touch-icon" href="icon-512.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fontLinks}
<style>${css}</style>
</head>
<body>
${boot}
<script>${code}</script>
</body>
</html>
`;

// The journal of what's new, for the online check (the app also carries its own copy).
const nouveautes = await build({ entryPoints: [join(APP, "src/maj/nouveautes-liste.ts")], bundle: true, write: false, format: "esm", logLevel: "warning" });
const { NOUVEAUTES } = await import(`data:text/javascript;base64,${Buffer.from(nouveautes.outputFiles[0].text).toString("base64")}`);

for (const target of ["artifact", "site", "apk"]) {
  const out = join(DIST, target);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(APP, "public"), out, { recursive: true });
  writeFileSync(join(out, "index.html"), target === "artifact" ? artifactPage : target === "site" ? sitePageFor(siteScript, true) : sitePageFor(apkScript, false));
  if (target !== "artifact") {
    cpSync(join(APP, "site"), out, { recursive: true });
    writeFileSync(join(out, "nouveautes.json"), JSON.stringify(NOUVEAUTES, null, 1));
  }
  if (target === "site") {
    const sw = join(out, "sw.js");
    writeFileSync(sw, readFileSync(sw, "utf8").replace("__VERSION__", VERSION.replace(/\D/g, "")));
  }
  if (target === "apk") rmSync(join(out, "sw.js"), { force: true });
}
// Local test copy of the artifact, wrapped the way claude.ai wraps a published page.
const skeleton = `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>`;
writeFileSync(join(DIST, "artifact", "_test.html"), `${skeleton}${artifactPage}</body></html>`);
console.log(`page: ${(artifactPage.length / 1024).toFixed(0)} Ko (script ${(script.length / 1024).toFixed(0)} Ko, css ${(css.length / 1024).toFixed(0)} Ko)`);
