// The child's own progress: cards, path, stars, rewards, daily quiz, favourites, fiches read.
// Saved in this browser, and also in the artifact's private per-person store
// when the page is opened signed in on claude.ai.
import { useSyncExternalStore } from "react";
import { CARDS_PER_CHEMIN, MILESTONES, RARITY, SHINY_STARS, cheminOf, milestoneRewards, type GiftKind, type Pulled, type Reward } from "./cards";
import { dayKey, daysSinceEpoch, storageGet, storageSet } from "./util";

/** count, first day (days since 1970), order of arrival, number of shiny copies */
export type Owned = [count: number, firstDay: number, order: number, shiny: number];
export type PackKind = "jour" | "bonus" | GiftKind | "boutique";
export type PackLog = { day: string; kind: PackKind; cards: string[] };
export type QuizResult = { day: string; score: number; total: number; passed: boolean };
export type Gift = { id: string; kind: GiftKind; from: string };

export type State = {
  v: 3;
  cards: Record<string, Owned>;
  order: number;
  opened: number;
  packs: number;
  stars: number;
  gifts: Gift[];
  claimed: number;
  backs: string[];
  back: string;
  freeDay: string;
  bonusDay: string;
  quiz: QuizResult | null;
  seen: string[];
  fav: string[];
  quizBest: number;
  log: PackLog[];
  chest: string[];
  gamesDay: Record<string, string>;
  gamesWon: number;
  book: Record<string, (string | null)[]>;
  updated: number;
};

// New collection: the cards of the first version are not carried over (fresh start asked on 22 October 2026).
const KEY = "footdex.etat.v3";

function blank(): State {
  return {
    v: 3, cards: {}, order: 0, opened: 0, packs: 0, stars: 0, gifts: [], claimed: 0, backs: ["dos-0"], back: "dos-0",
    freeDay: "", bonusDay: "", quiz: null, seen: [], fav: [], quizBest: 0, log: [], chest: [], gamesDay: {}, gamesWon: 0, book: {}, updated: 0,
  };
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

/** Accepts a saved state of this version only: anything older means a new, empty collection. */
function sane(raw: unknown): State | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (s.v !== 3 || typeof s.cards !== "object" || s.cards == null) return null;
  const st = s as unknown as Partial<State>;
  return {
    ...blank(),
    ...st,
    v: 3,
    cards: st.cards as State["cards"],
    gifts: Array.isArray(st.gifts) ? st.gifts : [],
    backs: strings(st.backs).length ? strings(st.backs) : ["dos-0"],
    seen: strings(st.seen),
    fav: strings(st.fav),
    log: Array.isArray(st.log) ? st.log : [],
    chest: strings(st.chest),
    gamesDay: st.gamesDay && typeof st.gamesDay === "object" ? st.gamesDay : {},
    book: st.book && typeof st.book === "object" ? st.book : {},
  };
}

function safeParse(text: string | null): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

let state: State = sane(safeParse(storageGet(KEY))) ?? blank();
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function commit(next: State) {
  state = { ...next, updated: Date.now() };
  storageSet(KEY, JSON.stringify(state));
  emit();
  scheduleRemote();
}

export function useStore(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export function getState(): State {
  return state;
}

// ------------------------------------------------------------- remote copy (claude.ai)

type DocRef = { get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>; set(data: Record<string, unknown>): Promise<void> };
let remote: DocRef | null = null;
let remoteBusy = false;
let remoteAgain = false;
let remoteTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRemote() {
  if (!remote) return;
  if (remoteTimer) clearTimeout(remoteTimer);
  remoteTimer = setTimeout(pushRemote, 900);
}

async function pushRemote() {
  if (!remote) return;
  if (remoteBusy) {
    remoteAgain = true;
    return;
  }
  remoteBusy = true;
  try {
    await remote.set(JSON.parse(JSON.stringify(state)) as Record<string, unknown>);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "unavailable" || code === "resource_exhausted") remoteAgain = true;
    else remote = null;
  } finally {
    remoteBusy = false;
    if (remoteAgain && remote) {
      remoteAgain = false;
      setTimeout(pushRemote, 3000);
    }
  }
}

/** Connects to the private per-person store when the viewer offers one. Never blocks the page. */
export async function connectRemote(): Promise<void> {
  const claude = (window as unknown as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
  if (!claude || typeof claude.use !== "function") return;
  try {
    const [db, user] = (await Promise.all([claude.use("db"), claude.use("user")])) as [
      { doc(path: string): DocRef } | null,
      { id(): Promise<string | null> } | null,
    ];
    if (!db || !user) return;
    const uid = await user.id();
    if (!uid) return;
    const ref = db.doc(`data/users/${uid}/footdex`);
    const snap = await ref.get();
    const saved = snap.exists ? sane(snap.data()) : null;
    remote = ref;
    if (saved && saved.updated >= state.updated) {
      state = saved;
      storageSet(KEY, JSON.stringify(state));
      emit();
    } else if (!saved || state.updated > saved.updated) {
      await pushRemote();
    }
  } catch {
    remote = null;
  }
}

// ------------------------------------------------------------------- path rewards

export type Granted = { at: number; chemin: number; rewards: Reward[] };

/** Gives every reward met between two card counts. */
function grant(s: State, from: number, to: number): { state: State; granted: Granted[] } {
  const granted: Granted[] = [];
  let next = { ...s, gifts: [...s.gifts], backs: [...s.backs] };
  for (let n = Math.floor(from / 20) * 20 + 20; n <= to; n += 20) {
    if (n <= next.claimed) continue;
    const chemin = Math.floor((n - 1) / CARDS_PER_CHEMIN);
    const step = n - chemin * CARDS_PER_CHEMIN;
    if (!MILESTONES.includes(step)) continue;
    const rewards = milestoneRewards(step, chemin);
    for (const r of rewards) {
      if (r.type === "stars") next.stars += r.amount;
      if (r.type === "gift") next.gifts.push({ id: `g${n}-${r.gift}`, kind: r.gift, from: `Palier ${step} du chemin ${chemin + 1}` });
      if (r.type === "back" && !next.backs.includes(r.back)) next.backs.push(r.back);
    }
    next.claimed = n;
    granted.push({ at: n, chemin, rewards });
  }
  return { state: next, granted };
}

// ------------------------------------------------------------------- actions

export function markSeen(id: string) {
  if (state.seen[state.seen.length - 1] === id) return;
  commit({ ...state, seen: [...state.seen.filter((x) => x !== id), id].slice(-2000) });
}

export function toggleFav(id: string) {
  const fav = state.fav.includes(id) ? state.fav.filter((x) => x !== id) : [...state.fav, id];
  commit({ ...state, fav });
}

export function chooseBack(back: string) {
  if (!state.backs.includes(back)) return;
  commit({ ...state, back });
}

export type PackStatus = { free: boolean; bonus: boolean; bonusLocked: boolean; gifts: number };

export function packStatus(s: State, today = dayKey()): PackStatus {
  const passed = s.quiz?.day === today && s.quiz.passed;
  return {
    free: s.freeDay !== today,
    bonus: passed && s.bonusDay !== today,
    bonusLocked: !passed && s.bonusDay !== today,
    gifts: s.gifts.length,
  };
}

export type PackResult = {
  fresh: Set<string>;
  starsByCard: Record<string, number>;
  stars: number;
  before: number;
  after: number;
  granted: Granted[];
  cheminBefore: number;
  cheminAfter: number;
};

/** Records an opened pack (daily, bonus, gift or bought card) and gives the path rewards. */
export function recordPack(kind: PackKind, pulled: Pulled[], giftId?: string, cost = 0): PackResult {
  const today = dayKey();
  const fresh = new Set<string>();
  const owned = { ...state.cards };
  const starsByCard: Record<string, number> = {};
  let order = state.order;
  let stars = 0;
  for (const { card, shiny } of pulled) {
    const had = owned[card.id];
    if (had) {
      owned[card.id] = [had[0] + 1, had[1], had[2], had[3] + (shiny ? 1 : 0)];
      const gain = RARITY[card.rarity].stars + (shiny ? SHINY_STARS : 0);
      starsByCard[card.id] = gain;
      stars += gain;
    } else {
      order += 1;
      owned[card.id] = [1, daysSinceEpoch(), order, shiny ? 1 : 0];
      fresh.add(card.id);
    }
  }
  const before = state.opened;
  const after = before + (kind === "boutique" ? 0 : pulled.length);
  const base: State = {
    ...state,
    cards: owned,
    order,
    opened: after,
    packs: state.packs + (kind === "boutique" ? 0 : 1),
    stars: state.stars + stars - cost,
    gifts: giftId ? state.gifts.filter((g) => g.id !== giftId) : state.gifts,
    freeDay: kind === "jour" ? today : state.freeDay,
    bonusDay: kind === "bonus" ? today : state.bonusDay,
    log: [{ day: today, kind, cards: pulled.map((p) => p.card.id) }, ...state.log].slice(0, 40),
  };
  const { state: withRewards, granted } = grant(base, before, after);
  commit(withRewards);
  return { fresh, starsByCard, stars, before, after, granted, cheminBefore: cheminOf(before).index, cheminAfter: cheminOf(after).index };
}

/** A card bought in the shop. Nothing happens when the stars are not enough. */
export function buyCard(pulled: Pulled[], price: number): PackResult | null {
  if (pulled.length === 0 || price > state.stars) return null;
  return recordPack("boutique", pulled, undefined, price);
}

export function recordQuiz(score: number, total: number, passMark: number) {
  const today = dayKey();
  if (state.quiz?.day === today) return;
  commit({ ...state, quiz: { day: today, score, total, passed: score >= passMark } });
}

export function recordBigQuiz(score: number) {
  if (score <= state.quizBest) return;
  commit({ ...state, quizBest: score });
}

// ------------------------------------------------------------------- chest, games, book

/** Spends stars on something else (the treasure chest of the Footballinis). False when there are not enough. */
export function spendStars(n: number): boolean {
  if (n > state.stars) return false;
  commit({ ...state, stars: state.stars - n });
  return true;
}

/** Opens something in the chest, for stars. False when the stars are not enough or it is already open. */
export function unlockChest(id: string, price: number): boolean {
  if (state.chest.includes(id) || price > state.stars) return false;
  commit({ ...state, chest: [...state.chest, id], stars: state.stars - price });
  return true;
}

/** A game won: 3 stars, once a day for each game, so nobody can farm stars by replaying. Returns the stars given. */
export function gameReward(game: string, win: boolean): number {
  const today = dayKey();
  if (!win || state.gamesDay[game] === today) return 0;
  commit({ ...state, stars: state.stars + 3, gamesWon: state.gamesWon + 1, gamesDay: { ...state.gamesDay, [game]: today } });
  return 3;
}

/** The binder book: for each page, nine pockets holding a card id or nothing. */
export function setBook(book: Record<string, (string | null)[]>) {
  commit({ ...state, book });
}
