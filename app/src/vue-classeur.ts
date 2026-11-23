// Les réglages des classeurs (celui des joueurs et celui des Footballinis), choisis par l'enfant
// dans le classeur lui-même ou dans Paramètres > Apparence. Gardés dans le téléphone.
import { useSyncExternalStore } from "react";
import { storageGet, storageSet } from "./util";

export type Quel = "joueurs" | "fbx";
/** page : le classeur dans la page ; grand : le classeur seul, en plein écran ; liste : la liste des cartes. */
export type Vue = "page" | "grand" | "liste";
export type Reglages = {
  vue: Vue;
  couv: string;
  papier: string;
  fond: string;
  anneaux: string;
  pochettes: "brillantes" | "mates";
  son: boolean;
  vitesse: "douce" | "rapide";
  numeros: boolean;
};

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
export type Fond = { id: string; nom: string; css: string };
export const FONDS: Fond[] = [
  { id: "nuit", nom: "Nuit étoilée", css: "radial-gradient(120% 80% at 50% 0%, #1a2a5c, #070b16 70%)" },
  { id: "bois", nom: "Bureau en bois", css: "repeating-linear-gradient(90deg, #6b4423 0 60px, #5e3b1e 60px 120px, #72492a 120px 170px), #6b4423" },
  { id: "pelouse", nom: "Pelouse du stade", css: "repeating-linear-gradient(90deg, #2f8f4a 0 50px, #287e41 50px 100px)" },
  { id: "tableau", nom: "Tableau du coach", css: "radial-gradient(120% 90% at 40% 20%, #2c3d34, #142019 75%)" },
  { id: "ciel", nom: "Ciel bleu", css: "linear-gradient(#3b8ed8, #a9d8ff)" },
  { id: "vestiaire", nom: "Vestiaire", css: "repeating-linear-gradient(90deg, #39465e 0 70px, #2f3a50 70px 74px), #39465e" },
];
export type Anneau = { id: string; nom: string; a: string; b: string; c: string };
export const ANNEAUX: Anneau[] = [
  { id: "argent", nom: "Argent", a: "#ffffff", b: "#cfd6e0", c: "#7d8696" },
  { id: "or", nom: "Or", a: "#fff3c4", b: "#f3cf6a", c: "#a8761c" },
  { id: "noir", nom: "Noir", a: "#6b7280", b: "#2a2f38", c: "#0c0e12" },
];

const DEFAUT: Record<Quel, Reglages> = {
  joueurs: { vue: "page", couv: "violet", papier: "creme", fond: "nuit", anneaux: "argent", pochettes: "brillantes", son: true, vitesse: "douce", numeros: true },
  fbx: { vue: "page", couv: "pelouse", papier: "creme", fond: "nuit", anneaux: "argent", pochettes: "brillantes", son: true, vitesse: "douce", numeros: true },
};
const cle = (q: Quel) => `footdex.classeur.reglages.${q}`;

function lire(q: Quel): Reglages {
  let r: Partial<Reglages> = {};
  try {
    r = (JSON.parse(storageGet(cle(q)) ?? "null") as Partial<Reglages> | null) ?? {};
  } catch {
    r = {};
  }
  // les choix faits avant (version 69) sont repris
  if (q === "joueurs") {
    if (!r.couv && storageGet("footdex.classeur.couv")) r.couv = storageGet("footdex.classeur.couv") as string;
    if (!r.papier && storageGet("footdex.classeur.papier")) r.papier = storageGet("footdex.classeur.papier") as string;
    if (!r.vue && storageGet("footdex.classeur.vue") === "liste") r.vue = "liste";
  }
  const d = DEFAUT[q];
  return {
    vue: r.vue === "grand" || r.vue === "liste" ? r.vue : "page",
    couv: COUVS.some((c) => c.id === r.couv) ? (r.couv as string) : d.couv,
    papier: PAPIERS.some((c) => c.id === r.papier) ? (r.papier as string) : d.papier,
    fond: FONDS.some((c) => c.id === r.fond) ? (r.fond as string) : d.fond,
    anneaux: ANNEAUX.some((c) => c.id === r.anneaux) ? (r.anneaux as string) : d.anneaux,
    pochettes: r.pochettes === "mates" ? "mates" : "brillantes",
    son: r.son !== false,
    vitesse: r.vitesse === "rapide" ? "rapide" : "douce",
    numeros: r.numeros !== false,
  };
}

const cache: Partial<Record<Quel, Reglages>> = {};
const ecoute = new Set<() => void>();
export function reglagesClasseur(q: Quel): Reglages {
  return (cache[q] ??= lire(q));
}
export function changerClasseur(q: Quel, part: Partial<Reglages>) {
  const next = { ...reglagesClasseur(q), ...part };
  cache[q] = next;
  storageSet(cle(q), JSON.stringify(next));
  for (const fn of ecoute) fn();
}
export function remettreClasseur(q: Quel) {
  cache[q] = { ...DEFAUT[q] };
  storageSet(cle(q), JSON.stringify(cache[q]));
  for (const fn of ecoute) fn();
}

/** Les réglages d'un classeur et les variables CSS qui vont avec. */
export function useClasseur(q: Quel): Reglages & { style: Record<string, string>; flipMs: number; classes: string } {
  const r = useSyncExternalStore(
    (cb) => {
      ecoute.add(cb);
      return () => ecoute.delete(cb);
    },
    () => reglagesClasseur(q),
  );
  const couv = COUVS.find((x) => x.id === r.couv) ?? COUVS[0];
  const papier = PAPIERS.find((x) => x.id === r.papier) ?? PAPIERS[0];
  const fond = FONDS.find((x) => x.id === r.fond) ?? FONDS[0];
  const ann = ANNEAUX.find((x) => x.id === r.anneaux) ?? ANNEAUX[0];
  const flipMs = r.vitesse === "rapide" ? 380 : 640;
  return {
    ...r,
    flipMs,
    classes: [r.pochettes === "mates" && "classeur--mates", !r.numeros && "classeur--sansnum"].filter(Boolean).join(" "),
    style: {
      "--cv-a": couv.a, "--cv-b": couv.b, "--cv-l": couv.ligne,
      "--pg-a": papier.a, "--pg-b": papier.b, "--pg-n": papier.num,
      "--fond": fond.css,
      "--ring-a": ann.a, "--ring-b": ann.b, "--ring-c": ann.c,
      "--flip-ms": `${flipMs}ms`,
    },
  };
}
