// The character: one drawing, many looks. Everything is drawn in SVG, nothing is downloaded.

export type Look = { body: number; skin: number; hair: number; hairColor: number; outfit: number; acc: string[] };

export const BODIES = [
  { name: "Petit", sw: 84, sc: 1 },
  { name: "Rond", sw: 96, sc: 1 },
  { name: "Large", sw: 106, sc: 1 },
  { name: "Costaud", sw: 116, sc: 1 },
  { name: "Trapu", sw: 110, sc: 0.94 },
  { name: "Robuste", sw: 100, sc: 1 },
];
export const SKINS = ["#f0cfae", "#e5b98f", "#d9a67a", "#a8734f", "#7a4a30", "#5a3624", "#86a462"];
export const HAIRS = [
  { id: "short", name: "Court" },
  { id: "curly", name: "Bouclé" },
  { id: "flat", name: "Coupe plate" },
  { id: "grey", name: "Cheveux gris" },
  { id: "tie", name: "Chignon" },
  { id: "bald", name: "Chauve" },
];
export const HAIR_COLORS = ["#17120d", "#5a3a22", "#7a3b1e", "#d9a136", "#cfd4dc", "#c0392b"];
export const OUTFITS = [
  { name: "Or et vert", shirt: "#f6c453", s2: "#0c5a41", pat: "v", shorts: "#f4efe6", sock: "#0c5a41", sock2: "#ffffff", num: "8" },
  { name: "Rouge cerceaux", shirt: "#e0284f", s2: "#ffffff", pat: "h", shorts: "#ffffff", sock: "#e0284f", sock2: "#ffffff", num: "10" },
  { name: "Bleu royal", shirt: "#2f5bff", s2: "#f6c453", pat: "v", shorts: "#e9edf7", sock: "#2f5bff", sock2: "#ffffff", num: "7" },
  { name: "Vert écharpe", shirt: "#34d399", s2: "#0c2a1f", pat: "sash", shorts: "#e9edf7", sock: "#34d399", sock2: "#ffffff", num: "9" },
  { name: "Nuit d'étoiles", shirt: "#141d35", s2: "#f6c453", pat: "zip", shorts: "#2a3a66", sock: "#141d35", sock2: "#f6c453", num: "" },
  { name: "Orange soleil", shirt: "#ff8a3d", s2: "#ffffff", pat: "h", shorts: "#ffffff", sock: "#ff8a3d", sock2: "#ffffff", num: "5" },
  { name: "Blanc d'honneur", shirt: "#f4efe6", s2: "#c9a24a", pat: "v", shorts: "#f4efe6", sock: "#f4efe6", sock2: "#c9a24a", num: "1" },
  { name: "Violet fusée", shirt: "#7a4dff", s2: "#ffffff", pat: "sash", shorts: "#2a1f6b", sock: "#7a4dff", sock2: "#ffffff", num: "11" },
  { name: "Maillot de zombie", shirt: "#7a8a4a", s2: "#4b5a2a", pat: "v", shorts: "#5b4a3a", sock: "#3a3f2c", sock2: "#3a3f2c", num: "13" },
];
export const ACCESSORIES = [
  { id: "scarf", name: "Écharpe" },
  { id: "band", name: "Bandeau" },
  { id: "cap", name: "Casquette" },
  { id: "glasses", name: "Lunettes" },
  { id: "stache", name: "Moustache" },
  { id: "beard", name: "Barbe" },
  { id: "whistle", name: "Sifflet" },
  { id: "ball", name: "Ballon" },
  { id: "clip", name: "Carnet" },
  { id: "beanie", name: "Bonnet" },
  { id: "armband", name: "Brassard de capitaine" },
  { id: "headset", name: "Casque de commentateur" },
  { id: "paint", name: "Maquillage de supporter" },
  { id: "slime", name: "Gelée verte (zombie)" },
  { id: "stitches", name: "Points de suture" },
  { id: "eyedrop", name: "Œil qui pend" },
  { id: "flies", name: "Mouches" },
];

/** Ready-made characters: a look and the character that goes with it. */
export const PRESETS: { name: string; perso: number; look: Look }[] = [
  { name: "Papi Statue", perso: 0, look: { body: 5, skin: 0, hair: 3, hairColor: 4, outfit: 0, acc: ["stache", "scarf", "beanie"] } },
  { name: "Supporter excité", perso: 1, look: { body: 2, skin: 0, hair: 2, hairColor: 2, outfit: 2, acc: ["scarf", "band", "paint"] } },
  { name: "Le Poli", perso: 2, look: { body: 3, skin: 4, hair: 5, hairColor: 0, outfit: 4, acc: ["whistle", "beard"] } },
  { name: "Le Jongleur", perso: 3, look: { body: 0, skin: 0, hair: 0, hairColor: 1, outfit: 5, acc: ["armband", "band"] } },
  { name: "Le Pointu", perso: 4, look: { body: 1, skin: 2, hair: 2, hairColor: 0, outfit: 3, acc: ["glasses", "headset"] } },
  { name: "Le Jeune", perso: 1, look: { body: 0, skin: 3, hair: 1, hairColor: 0, outfit: 1, acc: ["ball"] } },
  { name: "Le Zombie", perso: 5, look: { body: 1, skin: 6, hair: 2, hairColor: 1, outfit: 8, acc: ["slime", "stitches", "eyedrop", "flies"] } },
];

export const DEFAULT_LOOK: Look = PRESETS[0].look;

export function sanitizeLook(raw: unknown): Look {
  const r = (raw ?? {}) as Partial<Look>;
  const pick = (v: unknown, max: number, d: number) => (typeof v === "number" && v >= 0 && v < max ? Math.floor(v) : d);
  return {
    body: pick(r.body, BODIES.length, DEFAULT_LOOK.body),
    skin: pick(r.skin, SKINS.length, DEFAULT_LOOK.skin),
    hair: pick(r.hair, HAIRS.length, DEFAULT_LOOK.hair),
    hairColor: pick(r.hairColor, HAIR_COLORS.length, DEFAULT_LOOK.hairColor),
    outfit: pick(r.outfit, OUTFITS.length, DEFAULT_LOOK.outfit),
    acc: Array.isArray(r.acc) ? r.acc.filter((a): a is string => ACCESSORIES.some((x) => x.id === a)) : DEFAULT_LOOK.acc,
  };
}

type FigOpts = {
  sc: number; sw: number; skin: string; hair: string; hc: string; shirt: string; s2: string; pat: string; shorts: string;
  sock: string; sock2: string; num: string; extra: string[]; mouth: string; brow: string; d: number; crop: "bust" | "full"; label: string;
};

let counter = 0;

/** The SVG of a character. `size` is the width in pixels. */
export function figSvg(look: Look, opts: { size?: number; crop?: "bust" | "full"; mouth?: string; label?: string; delay?: number } = {}): string {
  const body = BODIES[look.body];
  const outfit = OUTFITS[look.outfit];
  const size = opts.size ?? 196;
  const o: FigOpts = {
    sc: size / 196 * (opts.crop === "bust" ? 1 : body.sc),
    sw: body.sw,
    skin: SKINS[look.skin],
    hair: HAIRS[look.hair].id,
    hc: HAIR_COLORS[look.hairColor],
    shirt: outfit.shirt,
    s2: outfit.s2,
    pat: outfit.pat,
    shorts: outfit.shorts,
    sock: outfit.sock,
    sock2: outfit.sock2,
    num: outfit.num,
    extra: look.acc,
    mouth: opts.mouth ?? "smile",
    brow: look.hair === 3 || look.hairColor === 4 ? "#9aa1ad" : "#2a2018",
    d: opts.delay ?? 0,
    crop: opts.crop ?? "full",
    label: opts.label ?? "personnage",
  };
  return build(o, counter++);
}

function build(o: FigOpts, n: number): string {
 o = { ...o };
 const id="m"+n,cx=90,sw=o.sw,sw2=sw*0.8,ww=sw2*0.94,sk=o.skin,top=122,bot=160;
 const TL=cx-sw2/2,TR=cx+sw2/2,WL=cx-ww/2,WR=cx+ww/2;
 const torso=`M${TL} ${top+10} Q${TL} ${top} ${TL+10} ${top} L${TR-10} ${top} Q${TR} ${top} ${TR} ${top+10} L${TR+2} ${bot-6} Q${TR+2} ${bot} ${TR-6} ${bot} L${TL+6} ${bot} Q${TL-2} ${bot} ${TL-2} ${bot-6}Z`;
 const lw=19+(sw-84)*0.07, ls=[cx-lw-2,cx+2];
 let hair="";
 if(o.hair=="short") hair=`<path d="M40 52 Q38 14 80 12 Q122 14 120 52 Q112 30 80 30 Q48 30 40 52Z" fill="${o.hc}"/>`;
 if(o.hair=="curly") hair=([[48,28],[62,16],[80,12],[98,16],[112,28],[42,44],[118,44]] as number[][]).map(([x,y])=>`<circle cx="${x}" cy="${y}" r="12" fill="${o.hc}"/>`).join("");
 if(o.hair=="grey") hair=`<path d="M42 54 Q40 20 80 19 Q120 20 118 54 Q112 36 80 36 Q48 36 42 54Z" fill="${o.hc}"/><path d="M40 54 Q36 68 43 74 Q41 62 44 54Z" fill="${o.hc}"/><path d="M120 54 Q124 68 117 74 Q119 62 116 54Z" fill="${o.hc}"/>`;
 if(o.hair=="bald") hair=`<path d="M40 56 Q37 68 44 76 Q42 62 45 54Z" fill="${o.hc}"/><path d="M120 56 Q123 68 116 76 Q118 62 115 54Z" fill="${o.hc}"/><ellipse cx="68" cy="26" rx="14" ry="6" fill="#fff" opacity=".12"/>`;
 if(o.hair=="tie") hair=`<path d="M40 52 Q38 14 80 12 Q122 14 120 52 Q112 30 80 30 Q48 30 40 52Z" fill="${o.hc}"/><circle cx="80" cy="8" r="10" fill="${o.hc}"/>`;
 if(o.hair=="flat") hair=`<path d="M41 48 Q42 10 80 10 Q118 10 119 48 L112 40 Q80 26 48 40Z" fill="${o.hc}"/>`;
 const head=`
 <ellipse cx="41" cy="62" rx="6" ry="9" fill="${sk}"/><ellipse cx="119" cy="62" rx="6" ry="9" fill="${sk}"/>
 <ellipse cx="80" cy="58" rx="40" ry="38" fill="${sk}"/>
 <path d="M52 86 Q80 104 108 86 Q104 98 80 98 Q56 98 52 86Z" fill="#00000012"/>
 ${hair}
 <ellipse cx="67" cy="58" rx="12.5" ry="13" fill="#fff" stroke="#00000040" stroke-width="1.2"/><ellipse cx="93" cy="58" rx="12.5" ry="13" fill="#fff" stroke="#00000040" stroke-width="1.2"/>
 <g class="pup"><circle cx="70" cy="60" r="3.4" fill="#10131c"/><circle cx="90" cy="60" r="3.4" fill="#10131c"/></g>
 <ellipse class="lid" cx="67" cy="58" rx="13" ry="13.6" fill="${sk}"/><ellipse class="lid" cx="93" cy="58" rx="13" ry="13.6" fill="${sk}"/>
 <g class="brows"><path d="M53 41 L75 46" stroke="${o.brow}" stroke-width="4.4" stroke-linecap="round"/><path d="M107 41 L85 46" stroke="${o.brow}" stroke-width="4.4" stroke-linecap="round"/></g>
 <ellipse cx="80" cy="71" rx="4.6" ry="3.4" fill="#00000026"/>
 ${o.extra.includes("beard")?`<path d="M44 74 Q46 108 80 112 Q114 108 116 74 Q106 94 80 94 Q54 94 44 74Z" fill="${o.hc}"/>`:""}
 ${o.extra.includes("stubble")?`<path d="M46 76 Q48 104 80 108 Q112 104 114 76 Q104 92 80 92 Q56 92 46 76Z" fill="#00000030"/>`:""}
 <g class="m-static">${o.mouth=="smile"?`<path d="M64 84 Q80 96 96 84" stroke="#6e2f27" stroke-width="3.8" fill="none" stroke-linecap="round"/>`:o.mouth=="open"?`<path d="M62 82 Q80 106 98 82Z" fill="#6e2f27"/><path d="M68 92 Q80 100 92 92Z" fill="#e7806f"/>`:o.mouth=="grin"?`<path d="M62 82 Q80 100 98 82Z" fill="#fff" stroke="#6e2f27" stroke-width="3" stroke-linejoin="round"/>`:`<path d="M68 88 H92" stroke="#6e2f27" stroke-width="4" stroke-linecap="round"/>`}</g>
 <g class="m-open"><path d="M61 82 Q61 108 80 108 Q99 108 99 82Z" fill="#5a2019"/><ellipse cx="80" cy="102" rx="11" ry="5" fill="#e7806f"/><rect x="66" y="82" width="28" height="5" rx="2" fill="#fff"/></g>
 <g class="bandage"><rect x="52" y="30" width="30" height="11" rx="3" fill="#f4d9b6" stroke="#b98d5c" stroke-width="1.4" transform="rotate(-14 67 35)"/><path d="M60 31 l4 9 M68 29 l4 9 M76 28 l3 9" stroke="#b98d5c" stroke-width="1" transform="rotate(-14 67 35)"/><circle cx="108" cy="82" r="6" fill="#f4d9b6" stroke="#b98d5c" stroke-width="1.4"/><path d="M105 82 h6 M108 79 v6" stroke="#b98d5c" stroke-width="1.2"/><ellipse cx="94" cy="34" rx="8" ry="6" fill="#e0284f" opacity=".55"/></g>
 ${o.extra.includes("stache")?`<path d="M60 80 Q70 70 80 76 Q90 70 100 80 Q90 87 80 82 Q70 87 60 80Z" fill="${o.hc}"/>`:""}
 ${o.extra.includes("stitches")?`<path d="M96 24 l16 15 M99 27 l-4 4 M103 31 l-4 4 M107 35 l-4 4" stroke="#22180e" stroke-width="2.4" stroke-linecap="round"/><path d="M50 72 q4 6 1 13" stroke="#5c7a3c" stroke-width="3" fill="none"/>`:""}
 ${o.extra.includes("eyedrop")?`<ellipse cx="93" cy="58" rx="13.5" ry="13.8" fill="#2f3a22"/><path d="M95 66 q1 14 6 22" stroke="#b7955a" stroke-width="2.4" fill="none"/><circle cx="101" cy="91" r="7.5" fill="#eef0c0" stroke="#00000055"/><circle cx="102.5" cy="92" r="2.8" fill="#111"/>`:""}
 ${o.extra.includes("slime")?`<path d="M84 92 q2 10 1 16 a3.4 3.4 0 1 0 6.6 0 q-1 -8 1 -14z" fill="#9be33a"/><path d="M70 90 q1 6 0 9 a2.6 2.6 0 1 0 5 0 q0 -5 1 -8z" fill="#9be33a"/><circle cx="88" cy="108" r="1.4" fill="#e6ff9e"/><circle cx="56" cy="40" r="5" fill="#5c7a3c"/><circle cx="104" cy="74" r="4" fill="#6b4a2a" opacity=".8"/>`:""}
 ${o.extra.includes("glasses")?`<circle cx="67" cy="58" r="15.5" fill="none" stroke="#10131c" stroke-width="3.2"/><circle cx="93" cy="58" r="15.5" fill="none" stroke="#10131c" stroke-width="3.2"/>`:""}
 ${o.extra.includes("band")?`<path d="M41 44 Q80 28 119 44 L119 54 Q80 38 41 54Z" fill="#e0284f"/>`:""}
 ${o.extra.includes("paint")?`<g opacity=".85"><path d="M48 70 h14 M48 76 h14" stroke="${o.shirt}" stroke-width="4" stroke-linecap="round"/><path d="M98 70 h14 M98 76 h14" stroke="${o.s2}" stroke-width="4" stroke-linecap="round"/></g>`:""}
 ${o.extra.includes("beanie")?`<path d="M39 50 Q38 8 80 6 Q122 8 121 50Z" fill="${o.s2}"/><rect x="36" y="42" width="88" height="12" rx="6" fill="${o.shirt}"/><circle cx="80" cy="6" r="8" fill="${o.shirt}"/>`:""}
 ${o.extra.includes("headset")?`<path d="M38 60 Q36 6 80 6 Q124 6 122 60" fill="none" stroke="#10131c" stroke-width="5"/><rect x="31" y="50" width="13" height="22" rx="6" fill="#10131c"/><rect x="116" y="50" width="13" height="22" rx="6" fill="#10131c"/><path d="M37 70 Q40 92 62 92" fill="none" stroke="#10131c" stroke-width="3"/><circle cx="64" cy="92" r="4.5" fill="#e0284f"/>`:""}
 ${o.extra.includes("cap")?`<path d="M40 48 Q42 10 80 9 Q118 10 120 48Z" fill="${o.s2}"/><rect x="32" y="45" width="96" height="9" rx="4.5" fill="${o.s2}"/><path d="M80 9 V47" stroke="#fff" stroke-opacity=".4" stroke-width="2"/>`:""}`;
 const arm=(x: number,cls: string,dir: number)=>`<g class="arm ${cls}" style="transform-origin:${x}px ${top+8}px">
   <rect x="${x-6.5}" y="${top+16}" width="13" height="22" rx="6.5" fill="${sk}"/>
   <circle cx="${x+dir*1}" cy="${top+40}" r="8.2" fill="${sk}"/>${dir>0?`<g class="cast"><rect x="${x-9}" y="${top+20}" width="18" height="24" rx="7" fill="#f4efe6" stroke="#b9c2d6" stroke-width="1.6"/><path d="M${x-5} ${top+27} h10 M${x-5} ${top+33} h10" stroke="#b9c2d6" stroke-width="1.4"/></g>`:""}<ellipse cx="${x-dir*6.5}" cy="${top+37}" rx="2.6" ry="4.4" fill="${sk}" transform="rotate(${dir*24} ${x-dir*6.5} ${top+37})"/>
   <path d="M${x-12} ${top+10} Q${x-12} ${top-1} ${x} ${top-1} Q${x+12} ${top-1} ${x+12} ${top+10} L${x+11} ${top+22} Q${x} ${top+26} ${x-11} ${top+22}Z" fill="${o.shirt}"/>
   <path d="M${x-11} ${top+22} Q${x} ${top+26} ${x+11} ${top+22} L${x+10.6} ${top+18} Q${x} ${top+22} ${x-10.6} ${top+18}Z" fill="${o.s2}"/></g>`;
 const leg=(x: number)=>{const c=x+lw/2; const dir=c<cx?-1:1; return `
   <rect x="${x+1}" y="${bot+8}" width="${lw-2}" height="14" fill="${sk}"/>
   <rect x="${x}" y="${bot+16}" width="${lw}" height="26" rx="5" fill="${o.sock}"/>
   <rect x="${x-.5}" y="${bot+20}" width="${lw+1}" height="4.4" fill="${o.sock2}"/>
   <path d="M${c-lw/2-2} ${bot+49} Q${c-lw/2-4} ${bot+36} ${c} ${bot+35} Q${c+lw/2+3} ${bot+35} ${c+lw/2+5+(dir>0?5:0)} ${bot+42} Q${c+lw/2+(dir>0?12:6)} ${bot+49} ${c+lw/2+(dir>0?12:6)} ${bot+49}Z" fill="#10131c"/>
   <path d="M${c-lw/2-2} ${bot+48} H${c+lw/2+(dir>0?12:6)}" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>`};
 const body=`
  <defs><clipPath id="${id}"><path d="${torso}"/></clipPath>
  <linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient></defs>
  ${leg(ls[0])}${leg(ls[1])}
  <g class="torso">
  ${arm(TL-1,"armL",1)}${arm(TR+1,"armR",-1)}
  <path d="M${WL-4} ${bot-6} L${WR+4} ${bot-6} L${WR+7} ${bot+16} L${cx+2} ${bot+11} L${cx-2} ${bot+11} L${WL-7} ${bot+16}Z" fill="${o.shorts}" stroke="#00000030" stroke-width="1.4"/>
  <rect x="${WL-4}" y="${bot-6}" width="${ww+8}" height="5" fill="#00000028"/>
  <path d="${torso}" fill="${o.shirt}"/>
  <g clip-path="url(#${id})">
   ${o.pat=="v"?[0,1,2,3,4,5,6,7,8].map((i)=>`<rect x="${TL+i*sw2/9+sw2/18}" y="${top}" width="${sw2/18}" height="44" fill="${o.s2}" opacity=".6"/>`).join(""):""}
   ${o.pat=="h"?[0,1,2,3].map((i)=>`<rect x="0" y="${top+8+i*9}" width="180" height="4.6" fill="${o.s2}" opacity=".7"/>`).join(""):""}
   ${o.pat=="zip"?`<rect x="${cx-2}" y="${top}" width="4" height="44" fill="${o.s2}"/><rect x="${TL}" y="${top+18}" width="${sw2}" height="5" fill="${o.s2}" opacity=".75"/>`:""}
   ${o.pat=="sash"?`<path d="M${TL} ${top+2} L${TR} ${top+28} L${TR} ${top+40} L${TL} ${top+14}Z" fill="${o.s2}" opacity=".78"/>`:""}
   <rect x="0" y="${bot-5}" width="180" height="6" fill="#00000030"/>
   <path d="${torso}" fill="url(#${id}g)"/>
  </g>
  <path d="M${cx-11} ${top} L${cx} ${top+11} L${cx+11} ${top}" fill="none" stroke="${o.s2}" stroke-width="4.4" stroke-linejoin="round"/>
  <g transform="translate(${cx-sw2/4} ${top+17}) scale(.8)"><path d="M-7 -8 h14 v9 q0 8 -7 11 q-7 -3 -7 -11Z" fill="#fff" stroke="${o.s2}" stroke-width="1.6"/><text y="4" text-anchor="middle" font-size="9" fill="${o.s2}">★</text></g>
  <text x="${cx+sw2/4}" y="${top+22}" text-anchor="middle" font-family="Impact,Haettenschweiler,sans-serif" font-size="11" fill="${o.pat=="sash"?"#fff":o.s2}" opacity="${o.num?1:0}">${o.num}</text>
  ${o.extra.includes("scarf")?`<rect x="${TL+3}" y="${top-5}" width="${sw2-6}" height="10" rx="5" fill="#34d399"/><rect x="${TR-20}" y="${top+2}" width="10" height="24" rx="3.5" fill="#34d399"/><path d="M${TR-20} ${top+23} h10" stroke="#fff" stroke-width="2.4" opacity=".6"/>`:""}
  ${o.extra.includes("armband")?`<rect x="${TL-13}" y="${top+12}" width="25" height="7" rx="2" fill="#f6c453" stroke="#10131c" stroke-width="1"/><text x="${TL-0.5}" y="${top+18}" text-anchor="middle" font-family="Impact,sans-serif" font-size="6.5" fill="#10131c">C</text>`:""}
  ${o.extra.includes("stitches")?`<path d="M${cx-11} ${top+3} h22" stroke="#22180e" stroke-width="2"/><path d="M${cx-8} ${top} v6 M${cx-3} ${top} v6 M${cx+2} ${top} v6 M${cx+7} ${top} v6" stroke="#22180e" stroke-width="1.6"/>`:""}
  ${o.extra.includes("slime")?`<path d="M${cx-2} ${top+16} q6 -4 12 0 q-1 8 -6 9 q-6 -1 -6 -9z" fill="#070b16"/><path d="M${cx+1} ${top+17} v6 M${cx+5} ${top+16} v7" stroke="#cfc6a2" stroke-width="1.6"/><path d="M${TL+8} ${top+22} q2 10 1 15 a3 3 0 1 0 6 0 q-1 -8 1 -14z" fill="#9be33a"/><path d="M${TR-12} ${top+30} q1 7 0 11 a2.6 2.6 0 1 0 5 0 q0 -6 1 -10z" fill="#9be33a"/><ellipse cx="${cx}" cy="${bot+52}" rx="30" ry="5" fill="#5fae1e" opacity=".75"/>`:""}
  ${o.extra.includes("whistle")?`<path d="M${cx} ${top+11} L${cx+6} ${top+27}" stroke="#10131c" stroke-width="1.6"/><circle cx="${cx+6}" cy="${top+29}" r="4.6" fill="#c9d4ea"/>`:""}
  ${o.extra.includes("clip")?`<g transform="rotate(10 ${TR+16} ${top+44})"><rect x="${TR+6}" y="${top+30}" width="22" height="28" rx="3" fill="#f4efe6"/><path d="M${TR+10} ${top+38} h14 M${TR+10} ${top+44} h14 M${TR+10} ${top+50} h9" stroke="#8f9bb6" stroke-width="1.8"/></g>`:""}
  ${o.extra.includes("ball")?`<g transform="translate(${TR+22} ${bot+36})"><circle r="12.5" fill="#fff" stroke="#10131c" stroke-width="2.2"/><path d="M0 -7 l6 4.6 -2.3 7 h-7.4 l-2.3 -7Z" fill="#10131c"/></g>`:""}
  </g>`;
 const vh=o.crop==="bust"?150:214; const W=196*o.sc, H=vh*o.sc;
 const flies = o.extra.includes("flies") ? `<g class="flies"><circle cx="34" cy="20" r="2.6" fill="#111"/><circle cx="150" cy="10" r="2.6" fill="#111"/><circle cx="160" cy="44" r="2.2" fill="#111"/><path d="M30 26 q24 -30 52 -14 q28 14 70 -10" stroke="#8f9bb6" stroke-width="1.2" fill="none" stroke-dasharray="2 4"/></g>` : "";
 return `<svg class="mfig${o.crop === "bust" ? " mfig--bust" : ""}" viewBox="-8 0 196 ${vh}" width="${W}" height="${H}" style="--d:${o.d}s" role="img" aria-label="${o.label}">${body}<g class="headg"><g transform="translate(90 72) scale(1.5) translate(-80 -58)">${head}</g></g>${flies}</svg>`;
}
