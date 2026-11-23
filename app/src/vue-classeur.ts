// Ce que montre le classeur quand on l'ouvre : le vrai classeur (pages et pochettes) ou la liste des cartes.
// Réglé dans Paramètres > Apparence ; gardé dans le téléphone.
import { useSyncExternalStore } from "react";
import { storageGet, storageSet } from "./util";

export type VueClasseur = "livre" | "liste";
const CLE = "footdex.classeur.vue";
const ecoute = new Set<() => void>();

export function vueClasseur(): VueClasseur {
  return storageGet(CLE) === "liste" ? "liste" : "livre";
}
export function choisirVueClasseur(v: VueClasseur) {
  storageSet(CLE, v);
  for (const fn of ecoute) fn();
}
export function useVueClasseur(): VueClasseur {
  return useSyncExternalStore(
    (cb) => {
      ecoute.add(cb);
      return () => ecoute.delete(cb);
    },
    vueClasseur,
  );
}

// ------------------------------------------------------------------ les couleurs du classeur (choisies par l'enfant)

export type Couv = { id: string; nom: string; a: string; b: string; ligne: string };
export const COUVS: Couv[] = [
  { id: "violet", nom: "Violet royal", a: "#2e1f66", b: "#160e38", ligne: "#c9a24a" },
  { id: "pelouse", nom: "Pelouse", a: "#1f7a3f", b: "#0b3a1c", ligne: "#ffe9a8" },
  { id: "bleu", nom: "Bleu des Bleus", a: "#1d3f9a", b: "#0a1a4a", ligne: "#ffffff" },
  { id: "rouge", nom: "Rouge passion", a: "#8a1c24", b: "#3d070c", ligne: "#f6c453" },
  { id: "cuir", nom: "Cuir marron", a: "#7a4a26", b: "#3a200c", ligne: "#e9c88a" },
  { id: "carbone", nom: "Noir carbone", a: "#2f343e", b: "#0c0e12", ligne: "#9fd8ff" },
  { id: "or", nom: "Or des champions", a: "#b8892a", b: "#5a3d0a", ligne: "#fff3c4" },
  { id: "rose", nom: "Rose fluo", a: "#c2367a", b: "#4a0a2a", ligne: "#ffd0ea" },
];
export type Papier = { id: string; nom: string; a: string; b: string; num: string };
export const PAPIERS: Papier[] = [
  { id: "creme", nom: "Crème", a: "#d9d0b9", b: "#f8f2e2", num: "#8a7f60" },
  { id: "blanc", nom: "Blanc", a: "#dfe3ea", b: "#ffffff", num: "#7d8696" },
  { id: "nuit", nom: "Nuit", a: "#0b1226", b: "#1a2547", num: "#9aa6c4" },
];
const CLE_COUV = "footdex.classeur.couv";
const CLE_PAPIER = "footdex.classeur.papier";
const ecouteCouleurs = new Set<() => void>();
let snap = "";
function lireCouleurs(): string {
  const c = storageGet(CLE_COUV) || "violet";
  const p = storageGet(CLE_PAPIER) || "creme";
  const v = `${c}|${p}`;
  if (v !== snap) snap = v;
  return snap;
}
export function choisirCouv(id: string) {
  storageSet(CLE_COUV, id);
  for (const fn of ecouteCouleurs) fn();
}
export function choisirPapier(id: string) {
  storageSet(CLE_PAPIER, id);
  for (const fn of ecouteCouleurs) fn();
}
/** Les variables CSS du classeur des joueurs, selon les couleurs choisies. */
export function useCouleursClasseur(): { couv: Couv; papier: Papier; style: Record<string, string> } {
  const v = useSyncExternalStore(
    (cb) => {
      ecouteCouleurs.add(cb);
      return () => ecouteCouleurs.delete(cb);
    },
    lireCouleurs,
  );
  const [c, p] = v.split("|");
  const couv = COUVS.find((x) => x.id === c) ?? COUVS[0];
  const papier = PAPIERS.find((x) => x.id === p) ?? PAPIERS[0];
  return {
    couv,
    papier,
    style: { "--cv-a": couv.a, "--cv-b": couv.b, "--cv-l": couv.ligne, "--pg-a": papier.a, "--pg-b": papier.b, "--pg-n": papier.num },
  };
}
