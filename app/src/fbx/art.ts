// The Footballinis: 20 silly football creatures to collect (cards and figurines).
// Every drawing is made of shaded shapes (like a small plastic toy), in a 200 × 200 box, the feet on the line y = 186.
// `art(id, uid)` gives the inside of an <svg viewBox="0 0 200 200">; `uid` keeps the gradients of two copies apart.

export type Rarity = 0 | 1 | 2 | 3 | 4; // commune, rare, épique, légendaire, ultime
export const RARITY = [
  { name: "Commune", color: "#9fb0cc", glow: "#2a3450", stars: 1 },
  { name: "Rare", color: "#58a6ff", glow: "#12306e", stars: 2 },
  { name: "Épique", color: "#c77dff", glow: "#3d1670", stars: 3 },
  { name: "Légendaire", color: "#ffcf3f", glow: "#6b4500", stars: 4 },
  { name: "Ultime", color: "#e8ecff", glow: "#0a0d18", stars: 5 },
] as const;

export type Fbx = { id: string; n: number; name: string; rar: Rarity; power: string; cry: string; vit: number; tir: number; rig: number };

export const FBX: Fbx[] = [
  { id: "mouton", n: 1, name: "Mouton Saucisse", rar: 1, power: "Il roule sur le terrain comme une saucisse dans la poêle.", cry: "Bêêêê-zzzz !", vit: 6, tir: 4, rig: 9 },
  { id: "banana", n: 2, name: "Banana Bomba", rar: 2, power: "Sa mèche s'allume quand il tire : BOUM, la frappe banane !", cry: "Banana… BOMBAAA !", vit: 7, tir: 9, rig: 8 },
  { id: "fraise", n: 3, name: "Fraise qui Pique", rar: 1, power: "Personne n'ose lui prendre le ballon : ça pique !", cry: "Pas touche, ça pique !", vit: 5, tir: 6, rig: 7 },
  { id: "pasteque", n: 4, name: "Pastèque Trou Noir", rar: 3, power: "Son trou noir aspire tous les ballons… et parfois l'arbitre.", cry: "Shhhlurrrp…", vit: 4, tir: 10, rig: 9 },
  { id: "pizza", n: 5, name: "Pizza Goalazzo", rar: 0, power: "Un gardien en fromage fondu : les ballons collent à ses gants.", cry: "Mamma mia, arrêté !", vit: 3, tir: 4, rig: 7 },
  { id: "chaussette", n: 6, name: "Chaussette Puante", rar: 0, power: "Son odeur fait fuir les défenseurs. Et les mouches restent.", cry: "Pfiouuu… c'est moi !", vit: 5, tir: 5, rig: 8 },
  { id: "frigo", n: 7, name: "Frigo Gardien", rar: 0, power: "Il arrête tout, et il garde les tirs bien au frais.", cry: "Brrr… arrêté !", vit: 2, tir: 3, rig: 6 },
  { id: "pigeon", n: 8, name: "Pigeon Arbitro", rar: 0, power: "Il siffle tout, même quand il n'y a rien. Rrrou… TUUUT !", cry: "Rrrou-TUUUT !", vit: 6, tir: 2, rig: 7 },
  { id: "requin", n: 9, name: "Requin Crampons", rar: 1, power: "Il nage dans la défense et croque les ballons.", cry: "Crounch-crounch !", vit: 8, tir: 7, rig: 6 },
  { id: "croco", n: 10, name: "Croco Trophée", rar: 3, power: "Il habite dans la coupe. Celui qui le gagne gagne tout.", cry: "Clac-clac la coupe !", vit: 5, tir: 8, rig: 9 },
  { id: "grillepain", n: 11, name: "Grille-Pain Turbo", rar: 0, power: "Il tire des tartines grillées à 200 km/h.", cry: "Ding ! C'est prêt !", vit: 7, tir: 7, rig: 6 },
  { id: "patate", n: 12, name: "Patate Penalty", rar: 0, power: "Elle ne rate jamais un penalty… enfin presque jamais.", cry: "Patate de forain !", vit: 4, tir: 8, rig: 6 },
  { id: "hamster", n: 13, name: "Hamster Ballon", rar: 0, power: "Il habite dans le ballon et le fait rouler où il veut.", cry: "Couic-couic, goal !", vit: 9, tir: 3, rig: 8 },
  { id: "spaghetti", n: 14, name: "Spaghetti Dribble", rar: 1, power: "Ses jambes en spaghetti font des nœuds aux défenseurs.", cry: "Slurp-dribble !", vit: 8, tir: 5, rig: 8 },
  { id: "tortue", n: 15, name: "Tortue Fusée", rar: 1, power: "Lente… jusqu'à ce que la fusée s'allume.", cry: "3, 2, 1… décollage !", vit: 10, tir: 5, rig: 7 },
  { id: "cornichon", n: 16, name: "Cornichon Ninja", rar: 0, power: "Personne ne le voit venir. Il est vert, il est vif, il est vinaigré.", cry: "Hi-YAAA !", vit: 8, tir: 6, rig: 7 },
  { id: "nuage", n: 17, name: "Nuage Grognon", rar: 1, power: "Quand il boude, il pleut des ballons sur le terrain.", cry: "Grrrondement…", vit: 5, tir: 6, rig: 8 },
  { id: "dino", n: 18, name: "Dino Sifflet", rar: 2, power: "Des bras trop courts pour les cartons, mais un sifflet de T-Rex.", cry: "RAAAAH-TUUUT !", vit: 6, tir: 7, rig: 9 },
  { id: "glace", n: 19, name: "Glace Fondue Buteuse", rar: 2, power: "Plus le match chauffe, plus elle fond… et plus elle marque.", cry: "Miam, but !", vit: 7, tir: 8, rig: 8 },
  { id: "vide", n: 20, name: "Ultime Vide", rar: 4, power: "???", cry: "…", vit: 0, tir: 0, rig: 0 },
];
export const fbx = (id: string) => FBX.find((f) => f.id === id) ?? FBX[0];

// ------------------------------------------------------------------ drawing helpers

const INK = "#1d1530";
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (v: number[]) => `#${v.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("")}`;
const mixC = (a: string, b: string, t: number) => {
  const x = hex(a);
  const y = hex(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
const light = (c: string, t = 0.45) => mixC(c, "#ffffff", t);
const dark = (c: string, t = 0.35) => mixC(c, "#000000", t);

class Pen {
  defs: string[] = [];
  n = 0;
  constructor(public uid: string) {}
  /** A plastic-toy shading: light from the top left. */
  ball(c: string, cx = 0.35, cy = 0.3): string {
    const id = `${this.uid}g${(this.n += 1)}`;
    this.defs.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.85"><stop offset="0" stop-color="${light(c, 0.55)}"/><stop offset="0.45" stop-color="${c}"/><stop offset="1" stop-color="${dark(c, 0.38)}"/></radialGradient>`);
    return `url(#${id})`;
  }
  lin(stops: [number, string][], x2 = 0, y2 = 1): string {
    const id = `${this.uid}g${(this.n += 1)}`;
    this.defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>`);
    return `url(#${id})`;
  }
  rad(stops: [number, string][], cx = 0.5, cy = 0.5, r = 0.5): string {
    const id = `${this.uid}g${(this.n += 1)}`;
    this.defs.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, ]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</radialGradient>`);
    return `url(#${id})`;
  }
}

/** Two big cartoon eyes. look: where the pupils look; mood changes the eyebrows. */
function eyes(x: number, y: number, gap: number, r: number, o: { look?: [number, number]; mood?: "happy" | "angry" | "worried" | "sly" | "sleepy" | "none"; lid?: boolean } = {}) {
  const [lx, ly] = o.look ?? [1, 1];
  const one = (cx: number, side: number) => {
    const brow =
      o.mood === "angry" ? `<path d="M${cx - r * 0.9} ${y - r * 1.25 - side * 0} L${cx + r * 0.9} ${y - r * 1.05 + side * r * 0.45}" transform="scale(1 1)" stroke="${INK}" stroke-width="${r * 0.38}" stroke-linecap="round"/>`
      : o.mood === "worried" ? `<path d="M${cx - r * 0.8} ${y - r * 1.15 + side * r * 0.3} Q${cx} ${y - r * 1.5} ${cx + r * 0.8} ${y - r * 1.15 - side * r * 0.3}" fill="none" stroke="${INK}" stroke-width="${r * 0.3}" stroke-linecap="round"/>`
      : o.mood === "sly" ? `<path d="M${cx - r * 0.9} ${y - r * 1.1} Q${cx} ${y - r * 1.45 + side * r * 0.2} ${cx + r * 0.9} ${y - r * 1.2}" fill="none" stroke="${INK}" stroke-width="${r * 0.3}" stroke-linecap="round"/>`
      : o.mood === "none" ? ""
      : `<path d="M${cx - r * 0.75} ${y - r * 1.3} Q${cx} ${y - r * 1.7} ${cx + r * 0.75} ${y - r * 1.3}" fill="none" stroke="${INK}" stroke-width="${r * 0.28}" stroke-linecap="round"/>`;
    const lid = o.mood === "sleepy" || o.mood === "sly" || o.lid ? `<path d="M${cx - r * 1.02} ${y - r * 0.05} A${r} ${r} 0 0 1 ${cx + r * 1.02} ${y - r * 0.05} Z" fill="${INK}" opacity=".85"/>` : "";
    return `<ellipse cx="${cx}" cy="${y}" rx="${r}" ry="${r * 1.1}" fill="#fff" stroke="${INK}" stroke-width="${Math.max(2, r * 0.22)}"/>
      <circle cx="${cx + lx * r * 0.28}" cy="${y + ly * r * 0.25}" r="${r * 0.56}" fill="${INK}"/>
      <circle cx="${cx + lx * r * 0.28 - r * 0.2}" cy="${y + ly * r * 0.25 - r * 0.24}" r="${r * 0.2}" fill="#fff"/>
      <circle cx="${cx + lx * r * 0.28 + r * 0.18}" cy="${y + ly * r * 0.25 + r * 0.18}" r="${r * 0.09}" fill="#fff"/>${lid}${brow}`;
  };
  return one(x - gap / 2, -1) + one(x + gap / 2, 1);
}
const blush = (x: number, y: number, gap: number, r = 7) => `<ellipse cx="${x - gap / 2}" cy="${y}" rx="${r}" ry="${r * 0.6}" fill="#ff6f91" opacity=".45"/><ellipse cx="${x + gap / 2}" cy="${y}" rx="${r}" ry="${r * 0.6}" fill="#ff6f91" opacity=".45"/>`;
/** A wide open smile with teeth and a tongue. */
const grin = (x: number, y: number, w: number, h = w * 0.55) =>
  `<path d="M${x - w / 2} ${y} Q${x} ${y + h * 1.7} ${x + w / 2} ${y} Q${x} ${y + h * 0.35} ${x - w / 2} ${y}Z" fill="#6a1430" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
   <path d="M${x - w * 0.36} ${y + h * 0.18} Q${x} ${y + h * 0.42} ${x + w * 0.36} ${y + h * 0.18} L${x + w * 0.3} ${y + h * 0.42} Q${x} ${y + h * 0.6} ${x - w * 0.3} ${y + h * 0.42}Z" fill="#fff"/>
   <ellipse cx="${x + w * 0.08}" cy="${y + h * 0.95}" rx="${w * 0.2}" ry="${h * 0.22}" fill="#ff7a9a"/>`;
const smile = (x: number, y: number, w: number) => `<path d="M${x - w / 2} ${y} Q${x} ${y + w * 0.55} ${x + w / 2} ${y}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
const frown = (x: number, y: number, w: number) => `<path d="M${x - w / 2} ${y + w * 0.25} Q${x} ${y - w * 0.2} ${x + w / 2} ${y + w * 0.25}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
/** A football boot seen from the side, studs underneath. */
const boot = (x: number, y: number, flip = 1, c = "#ff3d5a") =>
  `<g transform="translate(${x} ${y}) scale(${flip} 1)"><path d="M-9 -12 Q-10 -1 -6 0 H14 Q20 0 19 -5 Q17 -10 6 -11 L2 -16 H-8Z" fill="${c}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M-3 -10 L6 -9" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M-5 0 v3 M2 0 v3 M10 0 v3" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>`;
const leg = (x: number, y1: number, y2: number, c = INK, w = 5) => `<path d="M${x} ${y1} V${y2 - 12}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
/** A small football. */
const ball = (x: number, y: number, r: number) =>
  `<g transform="translate(${x} ${y})"><circle r="${r}" fill="#fff" stroke="${INK}" stroke-width="2.6"/><path d="M0 ${-r * 0.42} L${r * 0.4} ${-r * 0.13} L${r * 0.25} ${r * 0.34} H${-r * 0.25} L${-r * 0.4} ${-r * 0.13}Z" fill="${INK}"/><path d="M0 ${-r * 0.42} V${-r} M${r * 0.4} ${-r * 0.13} L${r * 0.95} ${-r * 0.3} M${r * 0.25} ${r * 0.34} L${r * 0.55} ${r * 0.82} M${-r * 0.25} ${r * 0.34} L${-r * 0.55} ${r * 0.82} M${-r * 0.4} ${-r * 0.13} L${-r * 0.95} ${-r * 0.3}" stroke="${INK}" stroke-width="1.8"/><ellipse cx="${-r * 0.35}" cy="${-r * 0.45}" rx="${r * 0.28}" ry="${r * 0.16}" fill="#fff" opacity=".8" transform="rotate(-30 ${-r * 0.35} ${-r * 0.45})"/></g>`;
const shine = (x: number, y: number, rx: number, ry: number, rot = -30) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".5" transform="rotate(${rot} ${x} ${y})"/>`;
const shadow = (x = 100, w = 62) => `<ellipse cx="${x}" cy="188" rx="${w}" ry="7" fill="#000" opacity=".22"/>`;
const S = (d: string, fill: string, sw = 3.4) => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;

// ------------------------------------------------------------------ the 20 drawings

const ART: Record<string, (p: Pen) => string> = {
  mouton: (p) => {
    const saus = p.lin([[0, "#e9925e"], [0.5, "#c4582f"], [1, "#7e2f15"]]);
    const wool = p.ball("#f5f1ff", 0.4, 0.3);
    const face = p.ball("#4a3a52");
    return `${shadow(100, 74)}
      ${leg(52, 140, 186, INK, 6)}${leg(74, 142, 186, INK, 6)}${leg(124, 142, 186, INK, 6)}${leg(146, 140, 186, INK, 6)}
      ${boot(52, 186, -1)}${boot(74, 186, -1)}${boot(124, 186)}${boot(146, 186)}
      ${S("M30 112 Q22 112 22 124 Q22 136 30 136 L162 138 Q174 138 174 125 Q174 112 162 112Z", saus)}
      <path d="M22 124 l-8 -6 M22 124 l-8 5" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M58 116 l8 18 M84 116 l8 18 M110 116 l8 18 M136 116 l8 18" stroke="#6e2410" stroke-width="3.4" opacity=".55" stroke-linecap="round"/>
      ${[[40, 104, 16], [62, 96, 19], [88, 92, 21], [114, 94, 19], [136, 100, 16], [26, 116, 10], [52, 112, 12]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${wool}" stroke="${INK}" stroke-width="3"/>`).join("")}
      ${[[40, 104, 16], [62, 96, 19], [88, 92, 21], [114, 94, 19], [136, 100, 16]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 3.4}" fill="${wool}"/>`).join("")}
      ${S("M146 86 Q130 70 138 60 Q148 66 152 80Z", face, 3)}${S("M192 88 Q206 74 198 64 Q188 70 184 84Z", face, 3)}
      <ellipse cx="168" cy="96" rx="27" ry="31" fill="${face}" stroke="${INK}" stroke-width="3.4"/>
      ${[[150, 70, 10], [166, 64, 12], [184, 70, 10]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${wool}" stroke="${INK}" stroke-width="3"/>`).join("")}
      ${eyes(168, 92, 22, 9, { look: [1, 0.5] })}
      ${smile(170, 112, 18)}<ellipse cx="164" cy="104" rx="4" ry="2.4" fill="${INK}"/><ellipse cx="174" cy="104" rx="4" ry="2.4" fill="${INK}"/>
      ${blush(168, 108, 34, 5)}${shine(60, 120, 16, 4, -4)}`;
  },
  banana: (p) => {
    const ban = p.lin([[0, "#fff27a"], [0.45, "#ffd21f"], [1, "#d89300"]], 1, 0.3);
    return `${shadow(100, 56)}
      ${leg(84, 160, 186, INK, 6)}${leg(116, 160, 186, INK, 6)}${boot(84, 186, -1, "#2f6bff")}${boot(116, 186, 1, "#2f6bff")}
      <path d="M116 42 Q132 22 150 26" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
      <path d="M116 42 Q132 22 150 26" fill="none" stroke="#c9b28a" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="4 3"/>
      <g transform="translate(152 24)"><path d="M0 -14 L4 -4 L14 -6 L6 2 L12 12 L1 6 L-6 14 L-4 3 L-14 0 L-4 -4Z" fill="#ffef5a" stroke="#ff6a00" stroke-width="2.4" stroke-linejoin="round"/><circle r="4" fill="#fff"/></g>
      <circle cx="170" cy="14" r="3" fill="#ffb12a"/><circle cx="138" cy="10" r="2.4" fill="#ffb12a"/><circle cx="174" cy="40" r="2" fill="#ffb12a"/>
      ${S("M100 48 Q60 70 58 112 Q58 152 92 168 Q112 176 128 166 Q104 150 100 112 Q98 80 120 52 Q114 40 100 48Z", ban)}
      ${S("M104 40 L118 36 L122 50 L106 54Z", "#5a3b14", 3)}
      <path d="M76 82 Q70 112 86 150" fill="none" stroke="#b07a00" stroke-width="3" opacity=".6"/>
      ${eyes(86, 96, 24, 10, { mood: "sly", look: [1, 0] })}
      ${grin(88, 120, 30)}
      ${blush(88, 112, 36, 6)}${shine(72, 86, 6, 16, 10)}
      <g transform="translate(40 116) rotate(-20)"><circle r="13" fill="#2a2a38" stroke="${INK}" stroke-width="3"/><rect x="-4" y="-18" width="8" height="7" fill="#6a6a80" stroke="${INK}" stroke-width="2"/>${shine(-4, -4, 4, 2.4)}</g>`;
  },
  fraise: (p) => {
    const red = p.ball("#ff2d55", 0.35, 0.3);
    const leaf = p.ball("#3ad15a");
    const spikes = [[52, 70, -150], [44, 104, 180], [52, 138, 150], [72, 160, 120], [100, 172, 90], [128, 160, 60], [148, 138, 30], [156, 104, 0], [148, 70, -30], [40, 86, 195], [160, 86, -15]]
      .map(([x, y, a]) => `<path d="M${x} ${y} l${10 * Math.cos((a * Math.PI) / 180) + 4 * Math.sin((a * Math.PI) / 180)} ${10 * Math.sin((a * Math.PI) / 180) - 4 * Math.cos((a * Math.PI) / 180)} L${x + 18 * Math.cos((a * Math.PI) / 180)} ${y + 18 * Math.sin((a * Math.PI) / 180)} L${x + 10 * Math.cos((a * Math.PI) / 180) - 4 * Math.sin((a * Math.PI) / 180)} ${y + 10 * Math.sin((a * Math.PI) / 180) + 4 * Math.cos((a * Math.PI) / 180)}Z" fill="#fff6c8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`)
      .join("");
    const seeds = [[76, 80], [124, 80], [64, 112], [136, 112], [84, 140], [116, 140], [100, 158], [100, 66]].map(([x, y]) => `<path d="M${x} ${y + 4} L${x - 3} ${y - 4} L${x + 3} ${y - 4}Z" fill="#ffe680" stroke="#b8860b" stroke-width="1.2"/>`).join("");
    return `${shadow(100, 52)}
      ${leg(86, 166, 186, INK, 6)}${leg(114, 166, 186, INK, 6)}${boot(86, 186, -1, "#1fb35a")}${boot(114, 186, 1, "#1fb35a")}
      ${spikes}
      ${S("M100 56 Q150 44 158 92 Q164 140 100 176 Q36 140 42 92 Q50 44 100 56Z", red)}
      ${seeds}
      ${S("M100 58 Q84 30 62 40 Q78 48 82 60 Q66 58 56 70 Q80 72 92 64Z", leaf, 3)}${S("M100 58 Q116 30 138 40 Q122 48 118 60 Q134 58 144 70 Q120 72 108 64Z", leaf, 3)}
      ${S("M96 60 Q98 34 104 26 L108 30 Q104 40 104 60Z", "#2a9a44", 2.6)}
      ${eyes(100, 98, 30, 11, { mood: "angry", look: [-0.6, 0.6] })}
      <path d="M86 126 Q100 118 114 126" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M96 124 l2 6 l3 -6" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
      ${blush(100, 116, 46, 7)}${shine(72, 78, 12, 6)}`;
  },
  pasteque: (p) => {
    const rind = p.lin([[0, "#5fd16a"], [1, "#1d6b2a"]]);
    const flesh = p.rad([[0, "#ff8fa6"], [1, "#ff3355"]], 0.5, 0.5, 0.5);
    const hole = p.rad([[0, "#000000"], [0.42, "#05020c"], [0.6, "#3b0f78"], [0.78, "#8a3dff"], [0.9, "#ff5fd2"], [1, "#ff3355"]], 0.5, 0.5, 0.5);
    const aura = p.rad([[0, "#b06bff"], [1, "#b06bff00"]], 0.5, 0.5, 0.5);
    return `<circle cx="100" cy="96" r="92" fill="${aura}" opacity=".55"/>
      ${shadow(100, 72)}
      ${leg(78, 160, 186, INK, 6)}${leg(122, 160, 186, INK, 6)}${boot(78, 186, -1, "#7a2bff")}${boot(122, 186, 1, "#7a2bff")}
      ${S("M24 96 A76 76 0 0 0 176 96 Z", rind)}
      <path d="M40 120 Q46 140 60 150 M70 158 Q74 166 80 168 M120 168 Q126 166 130 158 M140 150 Q154 140 160 120" stroke="#155e22" stroke-width="7" stroke-linecap="round" fill="none"/>
      <ellipse cx="100" cy="96" rx="76" ry="30" fill="#f4ffe9" stroke="${INK}" stroke-width="3.4"/>
      <ellipse cx="100" cy="96" rx="68" ry="25" fill="${flesh}"/>
      <ellipse cx="100" cy="96" rx="52" ry="19" fill="${hole}"/>
      <path d="M70 96 Q84 80 104 86 Q126 92 120 104 Q112 112 96 106 Q86 100 94 94" fill="none" stroke="#d6b0ff" stroke-width="2.2" opacity=".85"/>
      <path d="M58 96 Q70 112 100 112 Q134 110 142 92" fill="none" stroke="#ff9be8" stroke-width="1.8" opacity=".7"/>
      ${[[64, 84], [140, 104], [84, 110], [122, 82], [150, 92]].map(([x, y]) => `<path d="M${x} ${y} l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2Z" fill="#fff"/>`).join("")}
      ${[[56, 92], [76, 82], [130, 84], [146, 100], [70, 108]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.4" ry="4" fill="${INK}" transform="rotate(${x - 100} ${x} ${y})"/>`).join("")}
      <g transform="translate(160 40) rotate(20)">${ball(0, 0, 9)}</g><path d="M150 50 Q134 66 124 84" stroke="#fff" stroke-width="2" stroke-dasharray="3 5" fill="none" opacity=".7"/>
      ${eyes(100, 140, 30, 10, { mood: "worried", look: [0, -1] })}
      <ellipse cx="100" cy="160" rx="6" ry="7" fill="#6a1430" stroke="${INK}" stroke-width="2.6"/>
      ${shine(52, 124, 10, 5, 40)}`;
  },
  pizza: (p) => {
    const dough = p.lin([[0, "#ffe08a"], [1, "#f5b544"]]);
    const crust = p.ball("#d98a3a", 0.4, 0.2);
    const glove = p.ball("#26e07a");
    return `${shadow(100, 58)}
      ${leg(88, 160, 186, INK, 6)}${leg(112, 160, 186, INK, 6)}${boot(88, 186, -1, "#ff8a00")}${boot(112, 186, 1, "#ff8a00")}
      <path d="M52 96 Q30 90 22 70" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M148 96 Q170 90 178 70" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>
      ${S("M8 56 Q8 40 22 40 Q36 40 36 56 L36 74 Q22 84 8 74Z", glove, 3)}${S("M164 56 Q164 40 178 40 Q192 40 192 56 L192 74 Q178 84 164 74Z", glove, 3)}
      <path d="M14 48 v12 M22 46 v12 M30 48 v12 M170 48 v12 M178 46 v12 M186 48 v12" stroke="#0d7a3e" stroke-width="2.4" stroke-linecap="round"/>
      ${S("M40 50 L160 50 L100 172Z", dough)}
      <path d="M60 50 Q62 70 58 76 Q54 70 56 50 M96 50 Q98 80 92 88 Q88 80 90 50 M136 50 Q140 66 134 72 Q130 64 130 50" fill="#ffd34d" stroke="#e0a020" stroke-width="1.6"/>
      ${S("M34 50 Q34 30 100 30 Q166 30 166 50 Q166 60 100 60 Q34 60 34 50Z", crust)}
      ${[[70, 112, 9], [126, 104, 8], [100, 142, 7], [66, 80, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e2333f" stroke="#9e1a24" stroke-width="2"/><circle cx="${x - 2}" cy="${y - 2}" r="${r * 0.3}" fill="#ff8a90"/>`).join("")}
      ${eyes(100, 84, 30, 11, { look: [0, 0.5] })}
      ${grin(100, 106, 28)}
      ${shine(60, 42, 12, 4, -5)}`;
  },
  chaussette: (p) => {
    const sock = p.lin([[0, "#ffffff"], [1, "#d6dcef"]], 1, 0);
    return `${shadow(110, 60)}
      ${S("M70 30 L130 30 L130 128 Q130 150 150 156 Q176 162 176 174 Q176 188 150 188 L92 188 Q62 186 66 150Z", sock)}
      <rect x="70" y="30" width="60" height="12" fill="#e2333f"/><rect x="70" y="50" width="60" height="10" fill="#2f6bff"/><rect x="70" y="66" width="60" height="10" fill="#e2333f"/>
      <path d="M70 30 L130 30" stroke="${INK}" stroke-width="3.4"/><path d="M70 30 V150 M130 30 V128" stroke="${INK}" stroke-width="3.4" fill="none"/>
      <ellipse cx="160" cy="176" rx="9" ry="7" fill="#f1c7a6" stroke="${INK}" stroke-width="2.6"/><ellipse cx="160" cy="173" rx="4" ry="2.4" fill="#fff" opacity=".6"/>
      <path d="M150 170 Q160 162 170 172" fill="none" stroke="${INK}" stroke-width="2.4"/>
      ${[[110, 150], [96, 166], [124, 172]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#a0a8c4"/>`).join("")}
      ${eyes(100, 96, 26, 10, { mood: "sleepy", look: [0.6, 0.3] })}
      ${smile(100, 118, 22)}<path d="M104 122 q4 8 0 12 q-4 -4 0 -12z" fill="#ff7a9a" stroke="${INK}" stroke-width="2"/>
      ${[0, 1, 2].map((i) => `<path d="M${42 + i * 10} ${120 - i * 24} q-10 -8 0 -16 q10 -8 0 -16" fill="none" stroke="#7bdc5a" stroke-width="4" stroke-linecap="round" opacity=".85"/>`).join("")}
      <path d="M160 112 q-10 -8 0 -16 q10 -8 0 -16" fill="none" stroke="#7bdc5a" stroke-width="4" stroke-linecap="round" opacity=".85"/>
      ${[[40, 40], [168, 60]].map(([x, y]) => `<g transform="translate(${x} ${y})"><ellipse cx="-5" cy="-5" rx="6" ry="4" fill="#dff2ff" stroke="${INK}" stroke-width="1.2" opacity=".9"/><ellipse cx="5" cy="-5" rx="6" ry="4" fill="#dff2ff" stroke="${INK}" stroke-width="1.2" opacity=".9"/><circle r="4.4" fill="${INK}"/></g>`).join("")}`;
  },
  frigo: (p) => {
    const body = p.lin([[0, "#ffffff"], [0.7, "#dfe9f7"], [1, "#a9bbd6"]], 1, 0);
    const glove = p.ball("#ffcf3f");
    return `${shadow(100, 58)}
      ${leg(82, 170, 186, INK, 7)}${leg(118, 170, 186, INK, 7)}${boot(82, 186, -1, "#2f6bff")}${boot(118, 186, 1, "#2f6bff")}
      <path d="M52 104 Q30 100 24 80 M148 104 Q170 100 176 80" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>
      ${S("M10 66 Q10 50 24 50 Q38 50 38 66 L38 84 Q24 94 10 84Z", glove, 3)}${S("M162 66 Q162 50 176 50 Q190 50 190 66 L190 84 Q176 94 162 84Z", glove, 3)}
      ${S("M50 34 Q50 22 62 22 L138 22 Q150 22 150 34 L150 162 Q150 172 140 172 L60 172 Q50 172 50 162Z", body)}
      <path d="M50 74 H150" stroke="${INK}" stroke-width="3.4"/>
      <rect x="136" y="32" width="6" height="30" rx="3" fill="#8fa3c2" stroke="${INK}" stroke-width="2"/><rect x="136" y="84" width="6" height="40" rx="3" fill="#8fa3c2" stroke="${INK}" stroke-width="2"/>
      ${S("M44 22 Q46 4 100 4 Q154 4 156 22Z", "#ff3d5a", 3)}<rect x="40" y="18" width="120" height="8" rx="4" fill="#d81f3e" stroke="${INK}" stroke-width="2.4"/>
      ${eyes(98, 46, 30, 11, { look: [0, 0.4] })}
      ${grin(98, 100, 34)}
      <text x="100" y="158" text-anchor="middle" font-family="Impact,Arial Black,sans-serif" font-size="30" fill="#2f6bff" stroke="${INK}" stroke-width="1.5">1</text>
      <circle cx="68" cy="130" r="7" fill="#ff8a00" stroke="${INK}" stroke-width="2"/><rect x="118" y="124" width="12" height="12" rx="2" fill="#26e07a" stroke="${INK}" stroke-width="2" transform="rotate(12 124 130)"/>
      <path d="M64 18 v-6 M80 16 v-8" stroke="#9fe3ff" stroke-width="2.4" stroke-linecap="round"/>
      ${shine(64, 44, 5, 16, 0)}`;
  },
  pigeon: (p) => {
    const body = p.ball("#9aa5bd", 0.4, 0.25);
    const head = p.ball("#8a94ad");
    return `${shadow(100, 52)}
      <path d="M90 168 V184 M110 168 V184" stroke="#ff9a2a" stroke-width="5" stroke-linecap="round"/><path d="M82 186 L90 182 L98 186 M102 186 L110 182 L118 186" stroke="#ff9a2a" stroke-width="5" stroke-linecap="round" fill="none"/>
      ${S("M100 70 Q150 72 152 122 Q152 170 100 172 Q48 170 48 122 Q50 72 100 70Z", body)}
      <path d="M58 112 H142 M54 128 H146 M58 144 H142 M66 160 H134" stroke="${INK}" stroke-width="8" opacity=".85"/>
      ${S("M50 112 Q30 120 34 146 Q48 138 56 128Z", head, 3)}
      ${S("M146 104 Q178 92 184 70 Q164 76 150 92Z", head, 3)}
      <g transform="translate(184 62) rotate(14)"><rect x="-8" y="-12" width="16" height="22" rx="2" fill="#ffd400" stroke="${INK}" stroke-width="2.4"/></g>
      ${S("M100 26 Q130 26 132 56 Q132 82 100 84 Q68 82 68 56 Q70 26 100 26Z", head)}
      <path d="M72 70 Q100 92 128 70" fill="none" stroke="#3be0b0" stroke-width="7" opacity=".85"/><path d="M72 76 Q100 96 128 76" fill="none" stroke="#c46bff" stroke-width="5" opacity=".7"/>
      ${eyes(100, 50, 26, 9, { mood: "angry", look: [0.3, 0.2] })}
      <g transform="translate(118 66)"><path d="M-8 -4 H18 Q28 -4 28 6 Q28 16 18 16 Q10 16 8 10 H-8Z" fill="#dfe6f4" stroke="${INK}" stroke-width="2.6"/><circle cx="18" cy="6" r="3.6" fill="${INK}"/></g>
      <path d="M150 52 l10 -6 M152 62 h12 M150 72 l10 6" stroke="#ffcf3f" stroke-width="3" stroke-linecap="round"/>`;
  },
  requin: (p) => {
    const sh = p.lin([[0, "#7fb2e8"], [0.55, "#4a7fc0"], [1, "#2b4f86"]], 1, 0.4);
    return `${shadow(100, 60)}
      ${leg(82, 160, 186, "#4a7fc0", 8)}${leg(118, 160, 186, "#4a7fc0", 8)}${boot(82, 186, -1, "#ffcf3f")}${boot(118, 186, 1, "#ffcf3f")}
      ${S("M100 14 L118 54 L84 54Z", sh, 3)}
      ${S("M100 44 Q158 44 160 108 Q160 168 100 168 Q40 168 40 108 Q42 44 100 44Z", sh)}
      ${S("M100 104 Q140 104 144 128 Q140 160 100 164 Q60 160 56 128 Q60 104 100 104Z", "#f2f6ff", 0)}
      ${S("M42 104 Q16 112 10 134 Q30 132 46 122Z", sh, 3)}${S("M158 104 Q184 112 190 134 Q170 132 154 122Z", sh, 3)}
      <path d="M48 70 Q100 60 152 70" stroke="#ff3d5a" stroke-width="10" fill="none"/><path d="M152 70 l14 -8 M152 72 l14 6" stroke="#ff3d5a" stroke-width="6" stroke-linecap="round"/>
      ${eyes(100, 90, 34, 11, { mood: "sly", look: [1, 0.3] })}
      ${S("M62 116 Q100 160 138 116 Q100 128 62 116Z", "#6a1430", 3)}
      <path d="M66 118 l6 9 l6 -8 l6 9 l6 -8 l6 9 l6 -8 l6 9 l6 -8 l6 9 l6 -9" fill="#fff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M140 100 v10 M146 98 v10 M152 100 v10" stroke="#2b4f86" stroke-width="2.4" stroke-linecap="round"/>
      ${ball(168, 176, 10)}${shine(66, 70, 12, 6)}`;
  },
  croco: (p) => {
    const gold = p.lin([[0, "#fff4b0"], [0.4, "#ffcf3f"], [1, "#b07800"]], 1, 0.6);
    const croc = p.ball("#44c25c");
    return `<circle cx="100" cy="90" r="88" fill="#ffcf3f" opacity=".14"/>${shadow(100, 54)}
      ${S("M66 170 L134 170 L140 186 L60 186Z", gold)}<rect x="88" y="138" width="24" height="34" fill="${gold}" stroke="${INK}" stroke-width="3.4"/>
      ${S("M50 76 Q20 76 22 104 Q26 126 58 124 L58 112 Q36 112 36 100 Q36 88 50 90Z", gold, 3)}${S("M150 76 Q180 76 178 104 Q174 126 142 124 L142 112 Q164 112 164 100 Q164 88 150 90Z", gold, 3)}
      ${S("M44 72 L156 72 Q156 132 100 140 Q44 132 44 72Z", gold)}
      ${S("M40 76 Q30 34 70 26 Q110 20 160 34 Q182 40 176 54 Q170 64 150 62 L56 76Z", croc)}
      <path d="M78 64 l5 9 l5 -8 l5 9 l5 -8 l5 9 l5 -8 l5 9 l5 -8 l5 9 l5 -8 l5 8" fill="#fff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="160" cy="44" r="2.4" fill="${INK}"/><circle cx="168" cy="44" r="2.4" fill="${INK}"/>
      ${[[64, 26], [86, 20], [108, 20]].map(([x, y]) => `<path d="M${x - 6} ${y + 4} L${x} ${y - 8} L${x + 6} ${y + 4}Z" fill="#2f9a46" stroke="${INK}" stroke-width="2"/>`).join("")}
      ${eyes(78, 34, 24, 10, { mood: "sly", look: [1, 0.5] })}
      <path d="M86 100 l4 -10 l4 10 l10 2 l-10 3 l-4 10 l-4 -10 l-10 -3Z" fill="#fff" opacity=".9"/>
      <text x="100" y="128" text-anchor="middle" font-family="Impact,Arial Black,sans-serif" font-size="12" fill="#7a5200">CHAMPION</text>
      ${shine(64, 96, 6, 16, 10)}`;
  },
  grillepain: (p) => {
    const chrome = p.lin([[0, "#ffffff"], [0.3, "#c9d4e6"], [0.6, "#8d9bb3"], [1, "#dfe7f3"]], 1, 0);
    const toast = p.ball("#e8a25a", 0.4, 0.2);
    return `${shadow(100, 64)}
      ${leg(74, 160, 186, INK, 6)}${leg(126, 160, 186, INK, 6)}${boot(74, 186, -1)}${boot(126, 186)}
      ${[0, 1].map((i) => `<path d="M${30 - i * 8} ${120 + i * 14} q-14 -4 -22 4 q10 2 22 6z" fill="#ff8a00" stroke="#ff3d00" stroke-width="2"/>`).join("")}
      ${S("M70 40 Q70 22 86 22 Q102 22 102 40 L102 70 L70 70Z", toast, 3)}${S("M108 26 Q108 8 124 8 Q140 8 140 26 L140 66 L108 66Z", toast, 3)}
      <path d="M78 38 l14 10 M118 22 l14 12" stroke="#a8601a" stroke-width="3" stroke-linecap="round"/>
      ${S("M38 74 Q38 58 56 58 L144 58 Q162 58 162 74 L162 152 Q162 166 146 166 L54 166 Q38 166 38 152Z", chrome)}
      <rect x="66" y="58" width="40" height="8" rx="3" fill="${INK}"/><rect x="104" y="58" width="40" height="8" rx="3" fill="${INK}"/>
      ${S("M162 96 h14 v10 h-14z", "#ff3d5a", 2.4)}
      ${eyes(100, 98, 34, 12, { mood: "happy", look: [0.4, 0.2] })}
      ${grin(100, 126, 34)}
      ${shine(56, 82, 5, 22, 0)}${shine(150, 120, 3, 14, 0)}`;
  },
  patate: (p) => {
    const pot = p.ball("#c99a5b", 0.38, 0.3);
    return `${shadow(98, 56)}
      ${leg(82, 160, 186, "#8a6234", 6)}${leg(112, 158, 176, "#8a6234", 6)}${boot(82, 186, -1, "#2f6bff")}<g transform="rotate(-30 112 176)">${boot(112, 180, 1, "#2f6bff")}</g>
      ${ball(150, 172, 14)}<path d="M128 166 q8 -4 10 2 M126 174 q8 2 10 6" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>
      ${S("M100 36 Q150 30 158 84 Q164 140 120 164 Q92 176 66 156 Q36 132 42 88 Q48 40 100 36Z", pot)}
      ${[[70, 70], [130, 60], [140, 120], [74, 136], [112, 150]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="2.6" fill="#8a6234"/>`).join("")}
      ${S("M46 74 Q100 54 156 70 L156 84 Q100 68 46 88Z", "#ff3d5a", 3)}<path d="M154 74 q16 -6 22 6 M154 80 q14 8 14 20" stroke="#ff3d5a" stroke-width="7" fill="none" stroke-linecap="round"/>
      ${eyes(100, 102, 30, 10, { mood: "angry", look: [1, 0.3] })}
      <path d="M86 132 Q102 124 116 130" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
      <path d="M134 96 q4 8 0 12 q-4 -4 0 -12z" fill="#7fd8ff" stroke="${INK}" stroke-width="1.6"/>
      ${shine(74, 56, 12, 6)}`;
  },
  hamster: (p) => {
    const fur = p.ball("#ffb15a", 0.4, 0.3);
    return `${shadow(100, 62)}
      <g>${ball(100, 116, 66)}</g>
      ${S("M68 116 Q66 70 100 66 Q134 70 132 116 Q120 124 100 124 Q80 124 68 116Z", fur)}
      ${S("M72 72 Q62 52 76 50 Q86 54 84 68Z", fur, 3)}${S("M128 72 Q138 52 124 50 Q114 54 116 68Z", fur, 3)}
      <ellipse cx="78" cy="102" rx="13" ry="11" fill="#ffd9a8"/><ellipse cx="122" cy="102" rx="13" ry="11" fill="#ffd9a8"/>
      ${eyes(100, 86, 26, 9, { look: [0, 0.5] })}
      <path d="M96 100 L104 100 L100 105Z" fill="#ff6f91" stroke="${INK}" stroke-width="2"/>
      <path d="M100 105 Q94 112 90 108 M100 105 Q106 112 110 108" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="95" y="108" width="10" height="8" rx="2" fill="#fff" stroke="${INK}" stroke-width="2"/>
      ${S("M62 128 Q54 136 62 142 Q72 140 74 130Z", "#ffd9a8", 2.6)}${S("M138 128 Q146 136 138 142 Q128 140 126 130Z", "#ffd9a8", 2.6)}
      ${blush(100, 106, 46, 6)}
      <path d="M30 150 q-8 4 -12 0 M34 164 q-8 6 -14 4 M170 150 q8 4 12 0 M166 164 q8 6 14 4" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
  },
  spaghetti: (p) => {
    const plate = p.lin([[0, "#ffffff"], [1, "#c8d2e8"]]);
    const meat = p.ball("#8a3b1d");
    const nood = "#ffd76a";
    return `${shadow(100, 70)}
      ${[[70, 120, 60, 172], [90, 124, 84, 178], [116, 124, 122, 176], [132, 120, 146, 172]].map(([x1, y1, x2, y2]) => `<path d="M${x1} ${y1} Q${x1 - 14} ${(y1 + y2) / 2} ${x2} ${y2}" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${x1} ${y1} Q${x1 - 14} ${(y1 + y2) / 2} ${x2} ${y2}" fill="none" stroke="${nood}" stroke-width="5" stroke-linecap="round"/>`).join("")}
      ${boot(58, 186, -1, "#ff3d5a")}${boot(84, 188, -1, "#ff3d5a")}${boot(124, 188, 1, "#ff3d5a")}${boot(148, 186, 1, "#ff3d5a")}
      ${S("M24 112 Q24 136 100 140 Q176 136 176 112Z", plate)}<ellipse cx="100" cy="112" rx="76" ry="16" fill="${plate}" stroke="${INK}" stroke-width="3.4"/>
      ${S("M36 110 Q30 60 100 52 Q170 60 164 110 Q100 124 36 110Z", nood, 3)}
      ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${46 + i * 20} ${108 - (i % 2) * 6} Q${56 + i * 20} ${70 + (i % 3) * 8} ${44 + i * 22} ${66 + (i % 2) * 6}" fill="none" stroke="#e8b830" stroke-width="3"/>`).join("")}
      ${S("M54 74 Q80 50 116 56 Q150 62 150 84 Q120 70 90 76 Q66 80 54 74Z", "#e2333f", 2.6)}
      <circle cx="78" cy="78" r="17" fill="${meat}" stroke="${INK}" stroke-width="3"/><circle cx="122" cy="78" r="17" fill="${meat}" stroke="${INK}" stroke-width="3"/>
      ${eyes(100, 78, 44, 10, { look: [0.5, 0.2] })}
      ${smile(100, 100, 26)}
      ${S("M140 20 L148 20 L148 60 L140 60Z", "#c8d2e8", 2.4)}<path d="M136 20 V6 M144 20 V4 M152 20 V6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  },
  tortue: (p) => {
    const skin = p.ball("#7fdc6a");
    const shell = p.ball("#2fa35a", 0.4, 0.25);
    const rocket = p.lin([[0, "#ffffff"], [1, "#c8d2e8"]], 1, 0);
    return `${shadow(100, 66)}
      <path d="M22 132 q-14 -6 -20 4 q12 4 20 6z M18 118 q-16 -4 -18 8 q10 0 18 0z" fill="#ff8a00" stroke="#ff3d00" stroke-width="2"/>
      ${S("M22 104 L22 136 L40 136 L40 104Z", rocket, 3)}${S("M40 100 L58 104 L58 136 L40 140Z", "#ff3d5a", 3)}
      ${leg(74, 156, 186, "#4caf50", 9)}${leg(126, 156, 186, "#4caf50", 9)}${boot(74, 186, -1, "#ffcf3f")}${boot(126, 186, 1, "#ffcf3f")}
      ${S("M44 136 Q40 74 100 66 Q160 74 156 136 Q100 150 44 136Z", shell)}
      <path d="M60 128 L74 92 L100 84 L126 92 L140 128 M74 92 L86 126 M126 92 L114 126 M100 84 V130" fill="none" stroke="#156b34" stroke-width="3.4"/>
      ${S("M150 112 Q156 70 178 66 Q198 70 196 98 Q192 124 164 126Z", skin)}
      <rect x="160" y="74" width="34" height="14" rx="7" fill="#5a3b14" stroke="${INK}" stroke-width="2.6"/>
      <circle cx="170" cy="81" r="7" fill="#9fe3ff" stroke="${INK}" stroke-width="2.6"/><circle cx="186" cy="81" r="7" fill="#9fe3ff" stroke="${INK}" stroke-width="2.6"/>
      <circle cx="172" cy="82" r="3" fill="${INK}"/><circle cx="188" cy="82" r="3" fill="${INK}"/>
      ${grin(182, 102, 20)}
      ${shine(78, 84, 12, 6)}`;
  },
  cornichon: (p) => {
    const pick = p.lin([[0, "#9be36a"], [0.55, "#4caf3a"], [1, "#22701c"]], 1, 0);
    return `${shadow(100, 46)}
      ${leg(86, 160, 186, "#2e7d22", 6)}${leg(114, 160, 186, "#2e7d22", 6)}${boot(86, 186, -1, INK)}${boot(114, 186, 1, INK)}
      ${S("M100 18 Q144 22 144 92 Q144 166 100 168 Q56 166 56 92 Q56 22 100 18Z", pick)}
      ${[[78, 50], [120, 44], [70, 100], [130, 96], [84, 140], [118, 146], [100, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#bff19a" stroke="#22701c" stroke-width="1.4"/>`).join("")}
      ${S("M52 66 Q100 52 148 66 L148 84 Q100 70 52 84Z", INK, 2)}
      <path d="M148 72 Q170 62 184 76 M148 78 Q166 86 176 104" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <rect x="64" y="70" width="72" height="10" fill="#ff3d5a" opacity=".9"/>
      ${eyes(100, 92, 28, 9, { mood: "angry", look: [-1, 0] })}
      <path d="M90 122 Q100 116 112 122" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
      ${ball(40, 150, 12)}<path d="M56 140 l10 -6 M56 152 h12" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      ${shine(76, 40, 6, 14, 10)}`;
  },
  nuage: (p) => {
    const cl = p.ball("#b9c3dc", 0.4, 0.25);
    return `${[[60, 156], [96, 172], [134, 160], [116, 140]].map(([x, y], i) => ball(x, y, 8 + (i % 2) * 2)).join("")}
      <path d="M150 112 L136 140 L148 140 L134 170" fill="none" stroke="#ffcf3f" stroke-width="7" stroke-linejoin="round"/><path d="M150 112 L136 140 L148 140 L134 170" fill="none" stroke="#fff6b0" stroke-width="3" stroke-linejoin="round"/>
      ${S("M44 118 Q20 116 20 94 Q22 72 46 74 Q48 44 80 42 Q100 22 128 38 Q160 34 166 64 Q190 70 184 96 Q180 118 154 118Z", cl)}
      ${eyes(100, 80, 34, 11, { mood: "angry", look: [0, 0.6] })}
      ${frown(100, 102, 28)}
      <path d="M54 98 q-6 10 0 14 q6 -4 0 -14z" fill="#7fd8ff" stroke="${INK}" stroke-width="1.6"/>
      ${shine(76, 60, 14, 6)}`;
  },
  dino: (p) => {
    const sk = p.ball("#4fd17a", 0.35, 0.25);
    return `${shadow(100, 60)}
      ${S("M60 140 Q20 150 6 176 Q40 172 70 160Z", sk, 3)}
      ${leg(80, 150, 186, "#2f9a56", 12)}${leg(120, 150, 186, "#2f9a56", 12)}${boot(80, 186, -1, "#ffcf3f")}${boot(120, 186, 1, "#ffcf3f")}
      ${[[70, 40], [60, 64], [56, 90]].map(([x, y]) => `<path d="M${x} ${y - 10} L${x - 12} ${y} L${x} ${y + 8}Z" fill="#ff8a00" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`).join("")}
      ${S("M70 160 Q56 110 70 80 L130 80 Q150 120 132 160Z", sk)}
      ${S("M100 128 Q120 128 124 144 Q118 160 100 160 Q84 158 80 144 Q84 128 100 128Z", "#c9f7a8", 0)}
      ${S("M64 72 Q58 22 104 16 Q154 14 162 44 Q166 68 146 80 L126 82 L118 92 L88 90 Q66 88 64 72Z", sk)}
      <path d="M118 70 l4 8 l4 -7 l4 8 l4 -7 l4 7 l4 -8" fill="#fff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M100 76 Q128 84 150 74" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
      ${eyes(108, 42, 30, 10, { look: [1, 0.3] })}
      <circle cx="150" cy="40" r="2.4" fill="${INK}"/><circle cx="156" cy="44" r="2.4" fill="${INK}"/>
      <path d="M86 104 Q96 110 104 106 M118 104 Q124 110 132 104" stroke="${INK}" stroke-width="6" stroke-linecap="round" fill="none"/>
      <g transform="translate(110 110)"><path d="M-8 -6 H12 Q20 -6 20 2 Q20 10 12 10 Q6 10 4 6 H-8Z" fill="#dfe6f4" stroke="${INK}" stroke-width="2.4"/><circle cx="12" cy="2" r="3" fill="${INK}"/></g>
      <path d="M134 108 l12 -6 M136 116 h14" stroke="#ffcf3f" stroke-width="3" stroke-linecap="round"/>
      ${S("M68 34 Q66 10 104 8 Q140 8 150 26 L74 40Z", INK, 2)}<rect x="66" y="30" width="96" height="8" rx="4" fill="${INK}"/><path d="M90 12 V34 M118 10 V30" stroke="#fff" stroke-width="5"/>
      ${shine(80, 120, 6, 14, 10)}`;
  },
  glace: (p) => {
    const cone = p.lin([[0, "#f5c27a"], [1, "#c7832e"]]);
    const pink = p.ball("#ff8fc8");
    const mint = p.ball("#7ff0c8");
    return `${shadow(100, 62)}<ellipse cx="68" cy="186" rx="26" ry="5" fill="#ff8fc8" opacity=".75"/>
      ${leg(86, 156, 186, INK, 6)}${leg(114, 156, 186, INK, 6)}${boot(86, 186, -1, "#2f6bff")}${boot(114, 186, 1, "#2f6bff")}
      ${S("M64 98 L136 98 L100 170Z", cone)}
      <path d="M72 108 L120 156 M88 102 L128 140 M128 108 L80 156 M112 102 L72 140" stroke="#a8641e" stroke-width="2.4" opacity=".7"/>
      ${S("M56 100 Q50 66 82 62 Q90 40 116 46 Q148 50 146 80 Q154 98 140 104 Q138 120 132 114 Q128 104 118 108 Q112 128 104 126 Q100 108 88 108 Q80 124 74 118 Q72 106 62 108Z", pink)}
      ${S("M82 62 Q84 30 112 28 Q140 32 134 60 Q116 52 100 58 Q90 58 82 62Z", mint, 3)}
      <circle cx="112" cy="20" r="10" fill="#e2333f" stroke="${INK}" stroke-width="3"/><path d="M112 10 Q116 0 126 -2" stroke="#2a9a44" stroke-width="3" fill="none"/>${shine(108, 16, 3, 2)}
      ${[[70, 76, "#ffcf3f"], [98, 70, "#2f6bff"], [128, 78, "#26e07a"], [86, 92, "#fff"], [120, 94, "#ffcf3f"]].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="8" height="3" rx="1.5" fill="${c}" transform="rotate(${Number(x) % 60} ${x} ${y})"/>`).join("")}
      ${eyes(100, 124, 26, 9, { look: [0, 0.4] })}
      ${grin(100, 142, 20)}
      ${blush(100, 138, 34, 5)}${shine(72, 72, 8, 5)}`;
  },
  vide: () => "",
};

/** The inside of the 200 × 200 drawing of one Footballini. */
export function art(id: string, uid: string): string {
  const pen = new Pen(uid);
  const body = (ART[id] ?? ART.mouton)(pen);
  return `<defs>${pen.defs.join("")}</defs>${body}`;
}

let counter = 0;
/** A whole <svg> of a Footballini. */
export function fbxSvg(id: string, size = 120, extra = ""): string {
  counter += 1;
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" aria-hidden="true" overflow="visible">${art(id, `fb${counter}`)}${extra}</svg>`;
}
