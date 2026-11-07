// Every number of the game that a parent can change, kept in the tablet (works offline).
// Defaults are the balanced values proposed with the father; « Remettre les valeurs d'origine » brings them back.
import { useSyncExternalStore } from "react";
import { storageGet, storageSet } from "./util";

export type Odds = { base: number; rare: number; eclat: number; legende: number; moment: number };

export type Reglages = {
  cartesParPaquet: number;
  chancesNormal: Odds; // chances for cards 1..n-1 of a pack (any positive numbers: they are shown as percentages)
  chancesDerniere: Odds; // chances for the last card (better)
  nouvellesCartes: number; // 0..100 : % of draws that prefer a card the child does not own yet (the rest is pure chance, so duplicates)
  garantieEclat: number; // an Éclat or better at least every N packs (0 = off)
  garantieLegende: number; // a Légende or better at least every N packs (0 = off)
  brainRotMoyenne: number; // on average one Footballini (Brain Rot) card every N packs (0 = never)
  brainRotMax: number; // and one at the latest every N packs
  valeurDoublon: number[]; // coins for a duplicate Footballini, by rarity (5 numbers)
  gainMachine: number; // stars the first time a card goes into the machine
  gainJeu: number; // stars for a game won (once a day per game)
  coffreEtoiles: number;
  coffrePieces: number;
  coffreChances: { pieces: number; paquet: number; carteFbx: number; figurine: number; style: number };
  codeMission: string; // chosen by the parent (never written in the code)
  questionsPerso: Question[]; // the parent's own questions for the mission
};
export type Question = { type: "foot" | "science" | "maths"; q: string; choix: string[]; bonne: number };

export const DEFAUT: Reglages = {
  cartesParPaquet: 5,
  chancesNormal: { base: 71.6, rare: 22, eclat: 5, legende: 0.8, moment: 0.6 },
  chancesDerniere: { base: 0, rare: 70, eclat: 24, legende: 3.5, moment: 2.5 },
  nouvellesCartes: 60,
  garantieEclat: 10,
  garantieLegende: 40,
  brainRotMoyenne: 7,
  brainRotMax: 12,
  valeurDoublon: [1, 2, 5, 12, 30],
  gainMachine: 2,
  gainJeu: 3,
  coffreEtoiles: 25,
  coffrePieces: 60,
  coffreChances: { pieces: 34, paquet: 30, carteFbx: 7, figurine: 13, style: 6 },
  codeMission: "",
  questionsPerso: [],
};

const KEY = "footdex.reglages.jeu";
const KEY_COMPTEURS = "footdex.reglages.compteurs";
const num = (v: unknown, d: number, min: number, max: number) => (typeof v === "number" && isFinite(v) ? Math.max(min, Math.min(max, v)) : d);
const odds = (v: unknown, d: Odds): Odds => {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return { base: num(o.base, d.base, 0, 1000), rare: num(o.rare, d.rare, 0, 1000), eclat: num(o.eclat, d.eclat, 0, 1000), legende: num(o.legende, d.legende, 0, 1000), moment: num(o.moment, d.moment, 0, 1000) };
};

function charge(): Reglages {
  try {
    const r = JSON.parse(storageGet(KEY) ?? "null") as Partial<Reglages> | null;
    if (!r) return structuredClone(DEFAUT);
    const d = DEFAUT;
    const c = (r.coffreChances ?? {}) as Record<string, unknown>;
    return {
      cartesParPaquet: Math.round(num(r.cartesParPaquet, d.cartesParPaquet, 5, 15)),
      chancesNormal: odds(r.chancesNormal, d.chancesNormal),
      chancesDerniere: odds(r.chancesDerniere, d.chancesDerniere),
      nouvellesCartes: num(r.nouvellesCartes, d.nouvellesCartes, 0, 100),
      garantieEclat: Math.round(num(r.garantieEclat, d.garantieEclat, 0, 200)),
      garantieLegende: Math.round(num(r.garantieLegende, d.garantieLegende, 0, 500)),
      brainRotMoyenne: Math.round(num(r.brainRotMoyenne, d.brainRotMoyenne, 0, 100)),
      brainRotMax: Math.round(num(r.brainRotMax, d.brainRotMax, 0, 200)),
      valeurDoublon: Array.isArray(r.valeurDoublon) && r.valeurDoublon.length === 5 ? r.valeurDoublon.map((n, i) => Math.round(num(n, d.valeurDoublon[i], 0, 1000))) : [...d.valeurDoublon],
      gainMachine: Math.round(num(r.gainMachine, d.gainMachine, 0, 50)),
      gainJeu: Math.round(num(r.gainJeu, d.gainJeu, 0, 50)),
      coffreEtoiles: Math.round(num(r.coffreEtoiles, d.coffreEtoiles, 1, 500)),
      coffrePieces: Math.round(num(r.coffrePieces, d.coffrePieces, 1, 2000)),
      coffreChances: {
        pieces: num(c.pieces, d.coffreChances.pieces, 0, 1000),
        paquet: num(c.paquet, d.coffreChances.paquet, 0, 1000),
        carteFbx: num(c.carteFbx, d.coffreChances.carteFbx, 0, 1000),
        figurine: num(c.figurine, d.coffreChances.figurine, 0, 1000),
        style: num(c.style, d.coffreChances.style, 0, 1000),
      },
      codeMission: typeof r.codeMission === "string" ? r.codeMission.slice(0, 12) : "",
      questionsPerso: Array.isArray(r.questionsPerso)
        ? r.questionsPerso
            .filter((q): q is Question => !!q && typeof q.q === "string" && Array.isArray(q.choix) && q.choix.length >= 2 && typeof q.bonne === "number" && ["foot", "science", "maths"].includes(q.type))
            .slice(0, 60)
        : [],
    };
  } catch {
    return structuredClone(DEFAUT);
  }
}

let etat = charge();
const abonnes = new Set<() => void>();
function ecrire(r: Reglages) {
  etat = r;
  storageSet(KEY, JSON.stringify(r));
  abonnes.forEach((f) => f());
}
export const reglages = () => etat;
export function useReglages(): Reglages {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => void abonnes.delete(f);
    },
    () => etat,
  );
}
export function regler(patch: Partial<Reglages>) {
  ecrire({ ...etat, ...patch });
}
export function remettreOrigine() {
  // the mission code and the parent's own questions are kept: they are not game numbers
  ecrire({ ...structuredClone(DEFAUT), codeMission: etat.codeMission, questionsPerso: etat.questionsPerso });
}
export const totalOdds = (o: Odds) => o.base + o.rare + o.eclat + o.legende + o.moment;

// ------------------------------------------------------------------ counters (packs since the last good card)
export type Compteurs = { depuisEclat: number; depuisLegende: number; depuisBrainRot: number };
function chargeCompteurs(): Compteurs {
  try {
    const c = JSON.parse(storageGet(KEY_COMPTEURS) ?? "null") as Partial<Compteurs> | null;
    return { depuisEclat: Math.max(0, Number(c?.depuisEclat) || 0), depuisLegende: Math.max(0, Number(c?.depuisLegende) || 0), depuisBrainRot: Math.max(0, Number(c?.depuisBrainRot) || 0) };
  } catch {
    return { depuisEclat: 0, depuisLegende: 0, depuisBrainRot: 0 };
  }
}
let compteurs = chargeCompteurs();
export const lireCompteurs = () => compteurs;
export function ecrireCompteurs(c: Compteurs) {
  compteurs = c;
  storageSet(KEY_COMPTEURS, JSON.stringify(c));
}

/** True when a Footballini (Brain Rot) card falls in this pack: on average 1 in N, and at the latest every `brainRotMax` packs. */
export function brainRotTombe(): boolean {
  const r = etat;
  if (!r.brainRotMoyenne) return false;
  const depuis = compteurs.depuisBrainRot + 1; // this pack is the (depuis)th since the last one
  if (r.brainRotMax && depuis >= r.brainRotMax) return true;
  return Math.random() < 1 / r.brainRotMoyenne;
}
