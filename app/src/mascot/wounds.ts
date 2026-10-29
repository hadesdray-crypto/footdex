// The character's injuries, that stay on him: bandages put on by the Doctor, and casts (a leg, the other leg, an arm).
// They pile up: too many bandages, or both legs in a cast, and the Referee sends him off the pitch.
// They heal slowly by themselves (one bandage every quarter of an hour), and a substitute starts fresh.
import { storageGet, storageSet } from "../util";

export type Wounds = { b: number; legA: boolean; legB: boolean; arm: boolean };
export const NONE: Wounds = { b: 0, legA: false, legB: false, arm: false };
export const MAX_BANDAGES = 6;
const KEY = "footdex.blessures";

function load(): Wounds {
  try {
    const w = JSON.parse(storageGet(KEY) ?? "null") as Partial<Wounds> | null;
    if (!w) return { ...NONE };
    return { b: Math.max(0, Math.min(MAX_BANDAGES, Math.floor(Number(w.b) || 0))), legA: !!w.legA, legB: !!w.legB, arm: !!w.arm };
  } catch {
    return { ...NONE };
  }
}

let cur: Wounds = load();
const subs = new Set<() => void>();
function set(w: Wounds) {
  cur = w;
  storageSet(KEY, JSON.stringify(w));
  subs.forEach((f) => f());
}

export const wounds = () => cur;
export const onWounds = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};
export const hasCast = () => cur.legA || cur.legB;
/** Both legs in a cast, or covered in bandages: he cannot play any more. */
export const isOut = () => (cur.legA && cur.legB) || cur.b >= MAX_BANDAGES;

export function addBandage() {
  set({ ...cur, b: Math.min(MAX_BANDAGES, cur.b + 1) });
}
/** A broken bone: the first leg, then the other one (sometimes the arm first). Returns what was put in a cast. */
export function addCast(): "legA" | "legB" | "arm" {
  let part: "legA" | "legB" | "arm";
  // legB first: in the side view it is the leg that stays stiff when he hobbles
  if (!cur.legA && !cur.legB) part = !cur.arm && Math.random() < 0.25 ? "arm" : "legB";
  else part = cur.legB ? "legA" : "legB";
  set({ ...cur, [part]: true });
  return part;
}
export function heal() {
  set({ ...NONE });
}

// One bandage comes off every 15 minutes of use (the casts stay until a substitute comes in).
if (typeof window !== "undefined") {
  window.setInterval(() => {
    if (document.visibilityState === "visible" && cur.b > 0) set({ ...cur, b: cur.b - 1 });
  }, 15 * 60 * 1000);
}

// ------------------------------------------------------------------ drawings

/** On the big front figure (look.ts coordinates). Head ones are in the head's own 160-wide frame. */
const PLASTER = "#f4d9b6";
const EDGE = "#b98d5c";
const plaster = (x: number, y: number, r = 0, w = 26, h = 10) =>
  `<g transform="rotate(${r} ${x} ${y})"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="3" fill="${PLASTER}" stroke="${EDGE}" stroke-width="1.3"/><rect x="${x - 4}" y="${y - h / 2 + 1.5}" width="8" height="${h - 3}" fill="#fff" opacity=".7"/></g>`;
export function frontHead(w: Wounds): string {
  // in the order they come: cheek, other cheek, (knee), (arm), forehead, a bandage all round the head
  const list = [
    `<circle cx="108" cy="80" r="6.5" fill="${PLASTER}" stroke="${EDGE}" stroke-width="1.4"/><path d="M105 80 h6 M108 77 v6" stroke="${EDGE}" stroke-width="1.2"/>`,
    plaster(52, 82, 30, 18, 8),
    "", // knee (body)
    "", // arm (body)
    plaster(66, 40, -14, 30, 11),
    `<path d="M38 40 Q80 18 122 40 L122 50 Q80 28 38 50Z" fill="#fbfbf6" stroke="#c9ccd6" stroke-width="1.4"/><path d="M100 29 h8 M104 25 v8" stroke="#e0284f" stroke-width="2.4"/>`,
  ];
  return list.slice(0, w.b).join("");
}
export function frontArm(w: Wounds, armX: number, top: number): string {
  return w.b >= 4 && !w.arm ? `<g><rect x="${armX - 7.5}" y="${top + 24}" width="15" height="9" rx="3" fill="#fbfbf6" stroke="#c9ccd6" stroke-width="1.2"/><path d="M${armX - 6} ${top + 28.5} h12" stroke="#c9ccd6"/></g>` : "";
}
export function frontLegs(w: Wounds, g: { ls: number[]; lw: number; bot: number }): string {
  const { ls, lw, bot } = g;
  const cast = (x: number) =>
    `<rect x="${x - 2.5}" y="${bot + 6}" width="${lw + 5}" height="${34}" rx="6" fill="#fbfbf6" stroke="#b9c2d6" stroke-width="1.6"/><path d="M${x + 1} ${bot + 15} h${lw - 2} M${x + 1} ${bot + 24} h${lw - 2} M${x + 1} ${bot + 33} h${lw - 2}" stroke="#d3d8e4" stroke-width="1.3"/><text x="${x + lw / 2}" y="${bot + 22}" text-anchor="middle" font-size="7" fill="#e0284f">♥</text>`;
  let s = "";
  if (w.b >= 3 && !w.legA) s += `<rect x="${ls[0] - 1}" y="${bot + 10}" width="${lw + 2}" height="7" rx="2" fill="${PLASTER}" stroke="${EDGE}" stroke-width="1.2"/>`;
  if (w.legA) s += cast(ls[0]);
  if (w.legB) s += cast(ls[1]);
  return s;
}

/** On the side-view footballer (player.ts): head 52,34 r 24.5; shin from the knee, 17 long. */
export function sideHead(w: Wounds): string {
  let s = "";
  if (w.b >= 1) s += `<circle cx="60" cy="46" r="4.6" fill="${PLASTER}" stroke="${EDGE}" stroke-width="1.1"/>`;
  if (w.b >= 5) s += `<g transform="rotate(-18 50 16)"><rect x="37" y="13" width="26" height="9" rx="3" fill="${PLASTER}" stroke="${EDGE}" stroke-width="1.1"/></g>`;
  if (w.b >= 6) s += `<path d="M28 26 Q52 12 76 26 L76 33 Q52 19 28 33Z" fill="#fbfbf6" stroke="#c9ccd6" stroke-width="1.1"/>`;
  return s;
}
export const sideShinCast = () => `<rect x="-7.4" y="-2" width="14.8" height="21" rx="5" fill="#fbfbf6" stroke="#b9c2d6" stroke-width="1.3"/><path d="M-5 5 h10 M-5 11 h10" stroke="#d3d8e4" stroke-width="1.1"/>`;
export const sideArmCast = () => `<rect x="-5.4" y="-2" width="10.8" height="15" rx="4" fill="#fbfbf6" stroke="#b9c2d6" stroke-width="1.2"/>`;
