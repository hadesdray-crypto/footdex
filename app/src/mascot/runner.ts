import { wounds } from "./wounds";
// The walking character: seen from the front, from behind and from the side. Same look as the bust, drawn for moving around the screen.
import { BODIES, HAIRS, HAIR_COLORS, OUTFITS, SKINS, type Look } from "./look";

export type View = "front" | "back" | "side";

export function runnerSvg(look: Look, view: View): string {
  const w = wounds();
  const castOn = (cls: string) => (cls === "lgA" ? w.legA : cls === "lgB" ? w.legB : false);
  const sk = SKINS[look.skin];
  const o = OUTFITS[look.outfit];
  const hairId = HAIRS[look.hair].id;
  const hc = HAIR_COLORS[look.hairColor];
  const acc = look.acc;
  const tw = 14 + (BODIES[look.body].sw - 84) * 0.17; // half width of the shirt
  const td = 10 + (tw - 14) * 0.5; // half depth seen from the side
  const shoe = "#10131c";

  const legFront = (x: number, cls: string) => `<g class="lg ${cls}" style="transform-origin:${x}px 92px">
    <rect x="${x - 6}" y="92" width="12" height="10" fill="${sk}"/>
    <rect x="${x - 6.5}" y="100" width="13" height="21" rx="4" fill="${o.sock}"/><rect x="${x - 6.5}" y="104" width="13" height="4" fill="${o.sock2}"/>${castOn(cls) ? `<rect x="${x - 8}" y="96" width="16" height="24" rx="5" fill="#fbfbf6" stroke="#b9c2d6" stroke-width="1.3"/>` : ""}
    <ellipse cx="${x + (x < 50 ? -2 : 2)}" cy="124" rx="9" ry="5.5" fill="${shoe}"/></g>`;
  const legSide = (cls: string, far: boolean) => `<g class="lg ${cls}${far ? " far" : ""}" style="transform-origin:50px 92px">
    <rect x="44" y="92" width="12" height="10" fill="${sk}"/>
    <rect x="43.5" y="100" width="13" height="21" rx="4" fill="${o.sock}"/><rect x="43.5" y="104" width="13" height="4" fill="${o.sock2}"/>${castOn(cls) ? `<rect x="42" y="96" width="16" height="24" rx="5" fill="#fbfbf6" stroke="#b9c2d6" stroke-width="1.3"/>` : ""}
    <path d="M42 119 H56 Q66 119 67 125 Q67 129 62 129 H44 Q40 129 40 124Z" fill="${shoe}"/></g>`;

  const arm = (x: number, cls: string, far = false) => `<g class="ar ${cls}${far ? " far" : ""}" style="transform-origin:${x}px 62px">
    <rect x="${x - 4}" y="64" width="8" height="21" rx="4" fill="${sk}"/><circle cx="${x}" cy="87" r="5.4" fill="${sk}"/>
    <rect x="${x - 6.5}" y="57" width="13" height="14" rx="6" fill="${o.shirt}"/><rect x="${x - 6.5}" y="66" width="13" height="3.6" fill="${o.s2}"/></g>`;

  const pattern = (x0: number, w: number) => {
    if (o.pat === "v") return [0, 1, 2, 3, 4].map((i) => `<rect x="${x0 + (i + 0.5) * (w / 5) - 2}" y="58" width="4" height="34" fill="${o.s2}" opacity=".55"/>`).join("");
    if (o.pat === "h") return [0, 1, 2].map((i) => `<rect x="${x0}" y="${64 + i * 9}" width="${w}" height="4" fill="${o.s2}" opacity=".65"/>`).join("");
    if (o.pat === "sash") return `<path d="M${x0} 58 L${x0 + w} 84 V92 L${x0} 66Z" fill="${o.s2}" opacity=".7"/>`;
    if (o.pat === "zip") return `<rect x="48" y="58" width="4" height="34" fill="${o.s2}"/>`;
    return "";
  };
  const torso = (w: number, x0: number) => `<rect x="${x0}" y="56" width="${w}" height="38" rx="11" fill="${o.shirt}"/>
    <g clip-path="inset(0 round 11px)"></g>${pattern(x0 + 2, w - 4)}
    <rect x="${x0}" y="87" width="${w}" height="6" fill="#00000026"/>`;
  const shorts = (w: number, x0: number) => `<rect x="${x0 - 1}" y="86" width="${w + 2}" height="17" rx="6" fill="${o.shorts}" stroke="#00000030" stroke-width="1.2"/><path d="M50 92 V103" stroke="#00000030" stroke-width="1.2"/>`;

  const capFront = acc.includes("cap") ? `<path d="M26 32 Q27 6 50 6 Q73 6 74 32Z" fill="${o.s2}"/><rect x="22" y="29" width="56" height="7" rx="3.5" fill="${o.s2}"/>` : "";
  const hairFront = (() => {
    if (acc.includes("cap")) return "";
    if (hairId === "bald") return "";
    if (hairId === "curly") return [[30, 22], [40, 12], [50, 9], [60, 12], [70, 22], [27, 34], [73, 34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${hc}"/>`).join("");
    if (hairId === "flat") return `<path d="M26 30 Q26 8 50 8 Q74 8 74 30 L68 24 Q50 16 32 24Z" fill="${hc}"/>`;
    if (hairId === "tie") return `<path d="M26 32 Q26 8 50 8 Q74 8 74 32 Q68 20 50 20 Q32 20 26 32Z" fill="${hc}"/><circle cx="50" cy="5" r="7" fill="${hc}"/>`;
    return `<path d="M26 34 Q24 8 50 8 Q76 8 74 34 Q68 18 50 18 Q32 18 26 34Z" fill="${hc}"/>`;
  })();

  const eyes = `<g class="bl" style="transform-origin:50px 34px"><ellipse cx="41" cy="35" rx="8" ry="9" fill="#fff" stroke="#00000040"/><ellipse cx="59" cy="35" rx="8" ry="9" fill="#fff" stroke="#00000040"/><circle cx="43" cy="37" r="2.8" fill="#10131c"/><circle cx="57" cy="37" r="2.8" fill="#10131c"/></g>
    <path d="M32 22 L47 26 M68 22 L53 26" stroke="#2a2018" stroke-width="3" stroke-linecap="round"/>`;
  const glasses = acc.includes("glasses") ? `<circle cx="41" cy="35" r="10.5" fill="none" stroke="#10131c" stroke-width="2.4"/><circle cx="59" cy="35" r="10.5" fill="none" stroke="#10131c" stroke-width="2.4"/>` : "";
  const stache = acc.includes("stache") ? `<path d="M38 48 Q44 42 50 46 Q56 42 62 48 Q56 53 50 50 Q44 53 38 48Z" fill="${hc}"/>` : "";
  const beard = acc.includes("beard") ? `<path d="M27 42 Q28 66 50 68 Q72 66 73 42 Q66 56 50 56 Q34 56 27 42Z" fill="${hc}"/>` : "";
  const mouthFront = `<g class="mo"><path class="ms" d="M42 51 Q50 58 58 51" stroke="#6e2f27" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse class="mt" cx="50" cy="53" rx="7" ry="5.5" fill="#5a2019"/></g>`;
  const sweat = `<g class="sw"><path d="M20 22 q-4 8 0 11 q4 -3 0 -11Z" fill="#7cc7ff"/><path d="M80 30 q-4 8 0 11 q4 -3 0 -11Z" fill="#7cc7ff"/></g>`;

  let inner = "";
  if (view === "front") {
    const head = `<g class="hd"><ellipse cx="25.5" cy="36" rx="4" ry="6" fill="${sk}"/><ellipse cx="74.5" cy="36" rx="4" ry="6" fill="${sk}"/><circle cx="50" cy="34" r="24.5" fill="${sk}"/>${hairFront}${capFront}${eyes}${glasses}<ellipse cx="50" cy="43" rx="3" ry="2.2" fill="#00000026"/>${beard}${mouthFront}${stache}${sweat}</g>`;
    inner = `${legFront(40, "lgA")}${legFront(60, "lgB")}<g class="up" style="transform-origin:50px 92px">${arm(50 - tw - 4, "arA")}${arm(50 + tw + 4, "arB")}${shorts(2 * tw, 50 - tw)}${torso(2 * tw, 50 - tw)}<path d="M43 56 L50 64 L57 56" fill="none" stroke="${o.s2}" stroke-width="3.4" stroke-linejoin="round"/>${head}</g>`;
  } else if (view === "back") {
    const dome = `<path d="M26 34 Q24 8 50 8 Q76 8 74 34 Q76 54 50 54 Q24 54 26 34Z" fill="${acc.includes("cap") ? o.s2 : hairId === "bald" ? sk : hc}"/>`;
    const head = `<g class="hd"><ellipse cx="25.5" cy="36" rx="4" ry="6" fill="${sk}"/><ellipse cx="74.5" cy="36" rx="4" ry="6" fill="${sk}"/><circle cx="50" cy="34" r="24.5" fill="${sk}"/>${dome}${hairId === "tie" && !acc.includes("cap") ? `<circle cx="50" cy="5" r="7" fill="${hc}"/>` : ""}${acc.includes("cap") ? `<rect x="26" y="40" width="48" height="4" rx="2" fill="${o.s2}"/>` : ""}</g>`;
    const num = o.num ? `<text x="50" y="82" text-anchor="middle" font-family="Impact,Haettenschweiler,sans-serif" font-size="22" fill="${o.pat === "sash" ? "#fff" : o.s2}">${o.num}</text>` : "";
    inner = `${legFront(40, "lgA")}${legFront(60, "lgB")}<g class="up" style="transform-origin:50px 92px">${arm(50 - tw - 4, "arA")}${arm(50 + tw + 4, "arB")}${shorts(2 * tw, 50 - tw)}${torso(2 * tw, 50 - tw)}${num}${head}</g>`;
  } else {
    const hairSide = (() => {
      if (hairId === "bald" && !acc.includes("cap")) return "";
      if (acc.includes("cap")) return `<path d="M28 32 Q30 6 54 6 Q76 8 76 32Z" fill="${o.s2}"/><path d="M70 28 H92 Q94 32 90 34 H70Z" fill="${o.s2}"/>`;
      if (hairId === "curly") return [[34, 20], [46, 11], [58, 12], [68, 22], [30, 34], [36, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${hc}"/>`).join("");
      const bun = hairId === "tie" ? `<circle cx="34" cy="9" r="7" fill="${hc}"/>` : "";
      return `<path d="M28 36 Q26 8 54 8 Q74 9 76 30 Q66 18 54 22 Q46 24 46 36 Q44 46 38 52 Q28 48 28 36Z" fill="${hc}"/>${bun}`;
    })();
    const head = `<g class="hd"><circle cx="52" cy="34" r="24.5" fill="${sk}"/><ellipse cx="46" cy="38" rx="4.2" ry="6" fill="${sk}" stroke="#00000030"/>${hairSide}
      <g class="bl" style="transform-origin:62px 34px"><ellipse cx="63" cy="34" rx="7" ry="9" fill="#fff" stroke="#00000040"/><circle cx="66" cy="36" r="2.8" fill="#10131c"/></g>
      <path d="M56 23 L70 26" stroke="#2a2018" stroke-width="3" stroke-linecap="round"/>
      ${acc.includes("glasses") ? `<circle cx="63" cy="34" r="10.5" fill="none" stroke="#10131c" stroke-width="2.4"/><path d="M52 32 L44 30" stroke="#10131c" stroke-width="2.2"/>` : ""}
      <ellipse cx="77" cy="40" rx="4.6" ry="3.8" fill="${sk}" stroke="#00000030"/>
      ${acc.includes("beard") ? `<path d="M44 46 Q50 66 68 62 Q76 56 74 46 Q66 56 52 52Z" fill="${hc}"/>` : ""}
      <g class="mo"><path class="ms" d="M64 51 Q70 56 75 50" stroke="#6e2f27" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse class="mt" cx="70" cy="53" rx="5" ry="4.6" fill="#5a2019"/></g>
      ${acc.includes("stache") ? `<path d="M62 47 Q70 42 77 47 Q70 51 62 47Z" fill="${hc}"/>` : ""}
      <g class="sw"><path d="M28 22 q-4 8 0 11 q4 -3 0 -11Z" fill="#7cc7ff"/></g></g>`;
    const farArm = arm(50, "arB", true);
    inner = `${legSide("lgB", true)}<g class="up" style="transform-origin:50px 92px">${farArm}${shorts(2 * td, 50 - td)}${torso(2 * td, 50 - td)}<path d="M${50 + td - 2} 56 L${50 + td - 8} 66" stroke="${o.s2}" stroke-width="3.4" stroke-linecap="round"/>${head}</g>${legSide("lgA", false)}<g class="up" style="transform-origin:50px 92px">${arm(50, "arA")}</g>`;
  }
  return `<svg viewBox="0 0 100 132" aria-hidden="true">${inner}</svg>`;
}

/** The side-view head of the character (for the footballer drawn joint by joint). */
export function sideHeadSvg(look: Look): string {
  const svg = runnerSvg(look, "side");
  const a = svg.indexOf('<g class="hd">');
  const b = svg.indexOf('</g><g class="lg lgA"');
  return a >= 0 && b > a ? svg.slice(a, b) : "";
}
