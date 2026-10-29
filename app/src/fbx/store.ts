// The collection beyond the album: Footballinis cards, figurines, styled characters, gold coins,
// and the treasure chest that gives them out. Kept in the phone (localStorage), like the rest of the progress.
import { useSyncExternalStore } from "react";
import { storageGet, storageSet } from "../util";
import { ACCESSORIES, BODIES, HAIR_COLORS, HAIRS, OUTFITS, SKINS, SPECIAL_OUTFITS, type Look } from "../mascot/look";
import { FBX, type Rarity } from "./art";

export type Loot =
  | { k: "coins"; n: number }
  | { k: "pack"; cards: string[] }
  | { k: "fig"; id: string; fresh: boolean }
  | { k: "style"; look: Look; name: string };

export type Collec = {
  coins: number;
  cards: Record<string, number>; // how many of each Footballini card
  figs: Record<string, number>; // how many of each figurine
  styles: { look: Look; name: string }[]; // characters won in a chest (a style, no character of their own yet)
  freeDay: string; // the day the free chest was opened
  chests: number; // chests opened, ever
};

const KEY = "footdex.collection";
const blank = (): Collec => ({ coins: 0, cards: {}, figs: {}, styles: [], freeDay: "", chests: 0 });
function load(): Collec {
  try {
    const raw = JSON.parse(storageGet(KEY) ?? "null") as Partial<Collec> | null;
    if (!raw) return blank();
    const nums = (o: unknown) => Object.fromEntries(Object.entries(o && typeof o === "object" ? o : {}).filter(([k, v]) => FBX.some((f) => f.id === k) && typeof v === "number" && v > 0)) as Record<string, number>;
    return {
      coins: typeof raw.coins === "number" && raw.coins >= 0 ? Math.floor(raw.coins) : 0,
      cards: nums(raw.cards),
      figs: nums(raw.figs),
      styles: Array.isArray(raw.styles) ? raw.styles.filter((x) => x && typeof x === "object" && "look" in x).slice(0, 60) : [],
      freeDay: typeof raw.freeDay === "string" ? raw.freeDay : "",
      chests: typeof raw.chests === "number" ? raw.chests : 0,
    };
  } catch {
    return blank();
  }
}

let state = load();
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

const today = () => new Date().toISOString().slice(0, 10);
export const freeChestToday = () => state.freeDay !== today();
export const CHEST_STARS = 25;
export const CHEST_COINS = 60;

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

/** What a chest gives (one thing, sometimes two). */
function chestLoot(): Loot[] {
  const one = (): Loot => {
    const k = roll<string>([
      ["coins", 34],
      ["p1", 24],
      ["p2", 18],
      ["fig", 13],
      ["style", 6],
      ["p15", 5],
    ]);
    if (k === "coins") return { k: "coins", n: roll([[10, 4], [20, 4], [30, 2], [50, 1], [100, 0.3]]) };
    if (k === "fig") {
      const id = drawFig();
      return { k: "fig", id, fresh: !state.figs[id] };
    }
    if (k === "style") return { k: "style", look: randomLook(), name: `${NAMES_A[Math.floor(Math.random() * NAMES_A.length)]} ${NAMES_B[Math.floor(Math.random() * NAMES_B.length)]}` };
    const n = k === "p1" ? 1 : k === "p2" ? 2 : 15;
    return { k: "pack", cards: Array.from({ length: n }, drawCard) };
  };
  return Math.random() < 0.12 ? [one(), one()] : [one()];
}

/** Opens a chest: "free" (once a day), or paid with coins. The stars are spent by the caller (store.ts). */
export function openChest(pay: "free" | "coins" | "stars"): Loot[] | null {
  if (pay === "free" && !freeChestToday()) return null;
  if (pay === "coins" && state.coins < CHEST_COINS) return null;
  const loot = chestLoot();
  let next: Collec = { ...state, cards: { ...state.cards }, figs: { ...state.figs }, styles: [...state.styles], chests: state.chests + 1 };
  if (pay === "free") next.freeDay = today();
  if (pay === "coins") next.coins -= CHEST_COINS;
  for (const l of loot) {
    if (l.k === "coins") next.coins += l.n;
    if (l.k === "pack") for (const id of l.cards) next.cards[id] = (next.cards[id] ?? 0) + 1;
    if (l.k === "fig") next.figs[l.id] = (next.figs[l.id] ?? 0) + 1;
    if (l.k === "style") next.styles = [{ look: l.look, name: l.name }, ...next.styles].slice(0, 60);
  }
  commit(next);
  return loot;
}

/** What a duplicate is worth, in coins. */
export const DUP_VALUE = [3, 6, 15, 35, 80];
/** Swaps every duplicate card of one Footballini (keeps one) for coins. */
export function tradeDuplicates(id: string): number {
  const n = state.cards[id] ?? 0;
  if (n < 2) return 0;
  const f = FBX.find((x) => x.id === id);
  const gain = (n - 1) * DUP_VALUE[f?.rar ?? 0];
  commit({ ...state, cards: { ...state.cards, [id]: 1 }, coins: state.coins + gain });
  return gain;
}
export function tradeFigDuplicates(id: string): number {
  const n = state.figs[id] ?? 0;
  if (n < 2) return 0;
  const f = FBX.find((x) => x.id === id);
  const gain = (n - 1) * DUP_VALUE[f?.rar ?? 0] * 2;
  commit({ ...state, figs: { ...state.figs, [id]: 1 }, coins: state.coins + gain });
  return gain;
}
