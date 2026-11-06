// "Apparence" : les choix de la personne qui utilise l'appli (couleurs de fond, police, contraste, calme).
// Rien ne change tant qu'elle ne choisit pas : le réglage par défaut est le look d'origine.
import { useSyncExternalStore } from "react";

export type Skin = "nuit" | "pelouse" | "stade" | "noir";
export type Apparence = { skin: Skin; lisible: boolean; contraste: boolean; calme: boolean };

export const SKINS: { id: Skin; nom: string; note: string; a: string; b: string }[] = [
  { id: "nuit", nom: "Nuit de match", note: "Le look d'origine", a: "#070b16", b: "#141d35" },
  { id: "pelouse", nom: "Pelouse", note: "Fond vert sombre", a: "#06140e", b: "#112d20" },
  { id: "stade", nom: "Stade rouge", note: "Fond bordeaux sombre", a: "#14080c", b: "#2d1520" },
  { id: "noir", nom: "Noir total", note: "Économise la batterie", a: "#000000", b: "#0d0f16" },
];

const KEY = "footdex.apparence.v1";
const EVT = "footdex:apparence";
export const PAR_DEFAUT: Apparence = { skin: "nuit", lisible: false, contraste: false, calme: false };

function lire(): Apparence {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Apparence>;
    const skin = SKINS.some((s) => s.id === v.skin) ? (v.skin as Skin) : "nuit";
    return { skin, lisible: v.lisible === true, contraste: v.contraste === true, calme: v.calme === true };
  } catch {
    return PAR_DEFAUT;
  }
}

let cache = lire();
let brut = JSON.stringify(cache);

function appliquer(a: Apparence) {
  const h = document.documentElement;
  if (a.skin === "nuit") h.removeAttribute("data-skin");
  else h.setAttribute("data-skin", a.skin);
  h.toggleAttribute("data-lisible", a.lisible);
  h.toggleAttribute("data-contraste", a.contraste);
  h.toggleAttribute("data-calme", a.calme);
  const m = document.querySelector('meta[name="theme-color"]');
  const fond = SKINS.find((s) => s.id === a.skin)?.a ?? "#070b16";
  m?.setAttribute("content", fond);
}

/** À appeler une fois au démarrage. */
export function appliquerApparence() {
  appliquer(cache);
}

export function changerApparence(patch: Partial<Apparence>) {
  cache = { ...cache, ...patch };
  brut = JSON.stringify(cache);
  try { localStorage.setItem(KEY, brut); } catch { /* nothing */ }
  appliquer(cache);
  window.dispatchEvent(new Event(EVT));
}

export function remettreApparence() {
  changerApparence(PAR_DEFAUT);
}

export function useApparence(): Apparence {
  useSyncExternalStore(
    (fn: () => void) => { window.addEventListener(EVT, fn); return () => window.removeEventListener(EVT, fn); },
    () => brut,
  );
  return cache;
}
