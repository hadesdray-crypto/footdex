// The collection beyond the album: Footballinis cards, figurines, styled characters, gold coins,
// and the treasure chest that gives them out. Kept in the phone (localStorage), like the rest of the progress.
import { useSyncExternalStore } from "react";
import { storageGet, storageSet } from "../util";
import { ACCESSORIES, BODIES, HAIR_COLORS, HAIRS, OUTFITS, SKINS, SPECIAL_OUTFITS, type Look } from "../mascot/look";
import { FBX, type Rarity } from "./art";
import type { Edition } from "./Standee";
import { addGift, gagnerEtoiles } from "../store";
import { brainRotTombe, ecrireCompteurs, lireCompteurs, reglages } from "../reglages-jeu";

export type Loot =
  | { k: "coins"; n: number }
  | { k: "pack"; cards: string[] }
  | { k: "gift" }
  | { k: "fig"; id: string; v: Edition; fresh: boolean }
  | { k: "style"; look: Look; name: string };

export type Collec = {
  coins: number;
  cards: Record<string, number>; // how many of each Footballini card
  figs: Record<string, number>; // how many of each figurine, Studio edition (the image-AI drawing)
  figsC: Record<string, number>; // … and Classique edition (the game's own drawing)
  styles: { look: Look; name: string }[]; // characters won in a chest (a style, no character of their own yet)
  freeDay: string; // the day the free chest was opened
  chests: number; // chests opened, ever
};

const KEY = "footdex.collection";
const blank = (): Collec => ({ coins: 0, cards: {}, figs: {}, figsC: {}, styles: [], freeDay: "", chests: 0 });
function load(): Collec {
  try {
    const raw = JSON.parse(storageGet(KEY) ?? "null") as Partial<Collec> | null;
    if (!raw) return blank();
    const nums = (o: unknown) => Object.fromEntries(Object.entries(o && typeof o === "object" ? o : {}).filter(([k, v]) => FBX.some((f) => f.id === k) && typeof v === "number" && v > 0)) as Record<string, number>;
    return {
      coins: typeof raw.coins === "number" && raw.coins >= 0 ? Math.floor(raw.coins) : 0,
      cards: nums(raw.cards),
      figs: nums(raw.figs),
      figsC: nums(raw.figsC),
      styles: Array.isArray(raw.styles) ? raw.styles.filter((x) => x && typeof x === "object" && "look" in x).slice(0, 60) : [],
      freeDay: typeof raw.freeDay === "string" ? raw.freeDay : "",
      chests: typeof raw.chests === "number" ? raw.chests : 0,
    };
  } catch {
    return blank();
  }
}

let state = load();
// one single currency now: the old coins of the chest become pièces of the main purse (once)
if (state.coins > 0) {
  const old = state.coins;
  state = { ...state, coins: 0 };
  storageSet(KEY, JSON.stringify(state));
  gagnerEtoiles(old);
}
const subs = new Set<() => void>();
function commit(next: Collec) {
  state = next;
  storageSet(KEY, JSON.stringify(next));
  subs.forEach((f) => f());
}
export const getCollec = () => state;
export function useCollec(): Collec {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => state,
  );
}

/** No more free chest: the chest is opened with coins only. */
export const freeChestToday = () => false;
export const chestStars = () => reglages().coffreEtoiles;

// ------------------------------------------------------------------ chance
const roll = <T,>(items: [T, number][]): T => {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of items) {
    r -= w;
    if (r <= 0) return v;
  }
  return items[items.length - 1][0];
};
/** How often each rarity comes out of a pack. */
const RAR_W: [Rarity, number][] = [
  [0, 58],
  [1, 27],
  [2, 10],
  [3, 4.4],
  [4, 0.6],
];
/** Footballini cards come 5 at a time (a pack is never a single card), all different when possible. */
function drawFive(): string[] {
  const out: string[] = [];
  for (let n = 0; n < 60 && out.length < 5; n += 1) {
    const id = drawCard();
    if (!out.includes(id) || n > 40) out.push(id);
  }
  return out;
}
function drawCard(): string {
  const r = roll(RAR_W);
  const pool = FBX.filter((f) => f.rar === r);
  return pool[Math.floor(Math.random() * pool.length)].id;
}
function drawFig(): string {
  // the empty one is a figurine too… a very rare empty pedestal
  return roll(FBX.map((f) => [f.id, f.rar === 4 ? 0.4 : [10, 6, 3, 1.5][f.rar]] as [string, number]));
}
const NAMES_A = ["Capitaine", "Petit", "Grand", "Super", "Professeur", "Docteur", "Mister", "Turbo", "Prince", "Roi"];
const NAMES_B = ["Crampon", "Lucarne", "Corner", "Dribble", "Penalty", "Ciseau", "Tacle", "Pelouse", "Filet", "Poteau"];
function randomLook(): Look {
  const pickI = (n: number) => Math.floor(Math.random() * n);
  const acc = ACCESSORIES.map((a) => a.id).filter((id) => !["slime", "stitches", "eyedrop", "flies", "refcards"].includes(id));
  const chosen = acc.filter(() => Math.random() < 0.18).slice(0, 3);
  return { body: pickI(BODIES.length), skin: pickI(SKINS.length - 1), hair: pickI(HAIRS.length), hairColor: pickI(HAIR_COLORS.length), outfit: OUTFITS.map((_, i) => i).filter((i) => !SPECIAL_OUTFITS.includes(i))[pickI(OUTFITS.length - SPECIAL_OUTFITS.length)], acc: chosen };
}

/** What a chest gives (one thing, sometimes two). A "pack" is a Footdex gift pack (players, legends, moments… the real album), opened in « Paquets ». */
function chestLoot(): Loot[] {
  const one = (): Loot => {
    const w = reglages().coffreChances;
    const k = roll<string>([
      ["coins", w.pieces],
      ["pack", w.paquet],
      ["fbx", w.carteFbx],
      ["fig", w.figurine],
      ["style", w.style],
    ]);
    if (k === "coins") return { k: "coins", n: roll([[5, 4], [10, 4], [15, 2], [25, 1], [50, 0.3]]) };
    if (k === "fig") {
      const id = drawFig();
      const v: Edition = roll<Edition>([["s", 40], ["c", 60]]);
      return { k: "fig", id, v, fresh: !(v === "c" ? state.figsC : state.figs)[id] };
    }
    if (k === "style") return { k: "style", look: randomLook(), name: `${NAMES_A[Math.floor(Math.random() * NAMES_A.length)]} ${NAMES_B[Math.floor(Math.random() * NAMES_B.length)]}` };
    if (k === "fbx") return { k: "pack", cards: drawFive() };
    return { k: "gift" };
  };
  return Math.random() < 0.12 ? [one(), one()] : [one()];
}

/** A Footballini (Brain Rot) card that falls from a normal pack: rare. Returns its id, or null. */
export function brainRotDuPaquet(): string | null {
  const c = lireCompteurs();
  if (!brainRotTombe()) {
    ecrireCompteurs({ ...c, depuisBrainRot: c.depuisBrainRot + 1 });
    return null;
  }
  ecrireCompteurs({ ...c, depuisBrainRot: 0 });
  const id = drawCard();
  commit({ ...state, cards: { ...state.cards, [id]: (state.cards[id] ?? 0) + 1 } });
  return id;
}

/** Opens a chest, paid with pièces (spent by the caller). */
export function openChest(pay: "paid"): Loot[] | null {
  const loot = chestLoot();
  let next: Collec = { ...state, cards: { ...state.cards }, figs: { ...state.figs }, figsC: { ...state.figsC }, styles: [...state.styles], chests: state.chests + 1 };
  for (const l of loot) {
    if (l.k === "gift") addGift("cadeau", "Le coffre au trésor");
    if (l.k === "coins") gagnerEtoiles(l.n);
    if (l.k === "pack") for (const id of l.cards) next.cards[id] = (next.cards[id] ?? 0) + 1;
    if (l.k === "fig") { const t = l.v === "c" ? next.figsC : next.figs; t[l.id] = (t[l.id] ?? 0) + 1; }
    if (l.k === "style") next.styles = [{ look: l.look, name: l.name }, ...next.styles].slice(0, 60);
  }
  commit(next);
  return loot;
}

/** What a duplicate is worth, in coins. */
export const dupValue = (rar: number) => reglages().valeurDoublon[rar] ?? 3;
/** Swaps every duplicate card of one Footballini (keeps one) for coins. */
export function tradeDuplicates(id: string): number {
  const n = state.cards[id] ?? 0;
  if (n < 2) return 0;
  const f = FBX.find((x) => x.id === id);
  const gain = (n - 1) * dupValue(f?.rar ?? 0);
  commit({ ...state, cards: { ...state.cards, [id]: 1 } });
  gagnerEtoiles(gain);
  return gain;
}
export function tradeFigDuplicates(id: string, v: Edition = "s"): number {
  const n = (v === "c" ? state.figsC : state.figs)[id] ?? 0;
  if (n < 2) return 0;
  const f = FBX.find((x) => x.id === id);
  const gain = (n - 1) * dupValue(f?.rar ?? 0) * 2;
  commit(v === "c" ? { ...state, figsC: { ...state.figsC, [id]: 1 } } : { ...state, figs: { ...state.figs, [id]: 1 } });
  gagnerEtoiles(gain);
  return gain;
}
