// L'arbitre de fluidité : l'appli compte en continu combien d'images par seconde l'écran affiche.
// Si ça rame plusieurs secondes de suite (et pas pendant un défilement ni en arrière-plan), l'Arbitre entre,
// siffle, dit pourquoi, et enlève ce qui fait ramer, dans cet ordre, jusqu'à ce que ce soit fluide :
//   1) les effets de lumière et les paillettes (classe « fluide-leger » sur la page)
//   2) les petites scènes de vie entre les copains
//   3) les copains en trop, un à la fois
// Ce qu'il a trouvé est retenu pour cette tablette : tant que c'est fluide, il ne vient jamais.
import { useSyncExternalStore } from "react";
import { storageGet, storageSet } from "./util";

const CLE = "footdex.fluidite.v1";
/** Moins de SEUIL images par seconde pendant FENETRES secondes d'affilée : ça rame (un écran fluide en affiche 60). */
const SEUIL = 36;
const FENETRES = 4;
/** Le nombre de personnages à l'écran au plus (le personnage principal compris). */
export const MAX_PERSONNAGES = 4;

export type Etape = 0 | 1 | 2 | 3;
export type Fluidite = {
  /** l'arbitre de fluidité surveille (réglage des grands) */
  actif: boolean;
  /** personnages à l'écran au maximum, lui compris (1 à 4) */
  max: number;
  /** le maximum a été choisi à la main par un grand : l'arbitre ne le change plus */
  manuel: boolean;
  /** jusqu'où l'arbitre est allé : 0 rien, 1 lumières éteintes, 2 scènes coupées, 3 copains sortis */
  etape: Etape;
  /** la dernière mesure, en images par seconde (0 = pas encore mesuré) */
  ips: number;
  /** les copains que l'arbitre a fait sortir (ils reviennent si un grand remet à zéro ou monte le maximum) */
  sortis: string[];
};
const DEFAUT: Fluidite = { actif: true, max: MAX_PERSONNAGES, manuel: false, etape: 0, ips: 0, sortis: [] };

function lire(): Fluidite {
  try {
    const v = JSON.parse(storageGet(CLE) ?? "null") as Partial<Fluidite> | null;
    if (!v || typeof v !== "object") return { ...DEFAUT };
    const max = typeof v.max === "number" ? Math.max(1, Math.min(MAX_PERSONNAGES, Math.round(v.max))) : MAX_PERSONNAGES;
    const etape = (typeof v.etape === "number" ? Math.max(0, Math.min(3, Math.round(v.etape))) : 0) as Etape;
    const sortis = Array.isArray(v.sortis) ? v.sortis.filter((x): x is string => typeof x === "string").slice(0, 3) : [];
    return { actif: v.actif !== false, max, manuel: v.manuel === true, etape, ips: typeof v.ips === "number" ? Math.round(v.ips) : 0, sortis };
  } catch {
    return { ...DEFAUT };
  }
}
let etat: Fluidite = lire();
const abonnes = new Set<() => void>();
function changer(patch: Partial<Fluidite>, garder = true) {
  etat = { ...etat, ...patch };
  if (garder) storageSet(CLE, JSON.stringify(etat));
  appliquer();
  abonnes.forEach((f) => f());
}
export const fluidite = () => etat;
export function useFluidite(): Fluidite {
  return useSyncExternalStore(
    (f: () => void) => {
      abonnes.add(f);
      return () => void abonnes.delete(f);
    },
    () => etat,
  );
}

/** Les effets lourds sont coupés (lumières, paillettes, flous). */
export const effetsLegers = () => etat.etape >= 1;
/** Les petites scènes entre les copains ne se lancent plus. */
export const scenesCoupees = () => etat.etape >= 2;
/** Combien de copains peuvent être à l'écran à côté du personnage principal. */
export const maxCopains = () => Math.max(0, Math.min(MAX_PERSONNAGES, etat.max) - 1);

function appliquer() {
  if (typeof document === "undefined") return;
  const h = document.documentElement;
  if (etat.etape >= 1) h.classList.add("fluide-leger");
  else h.classList.remove("fluide-leger");
}

// ------------------------------------------------------------------ les réglages des grands

export function activerArbitre(oui: boolean) {
  changer({ actif: oui });
  if (oui) {
    plusRienAEnlever = false;
    demarrerMesure();
  } else arreterMesure();
}
/** Les copains sortis reviennent sur le terrain, autant qu'il y a de place (branché par les personnages). */
function faireRevenir() {
  if (!etat.sortis.length) return;
  const revenus = rappeler(etat.sortis);
  changer({ sortis: etat.sortis.filter((k) => !revenus.includes(k)) });
}
/** Un grand choisit le maximum à la main : l'arbitre ne le change plus. */
export function choisirMax(n: number) {
  changer({ max: Math.max(1, Math.min(MAX_PERSONNAGES, Math.round(n))), manuel: true });
  faireRevenir();
}
/** Efface tout ce que l'arbitre avait retenu : tout revient comme au départ, et il surveille de nouveau. */
export function remettreAZero() {
  changer({ max: MAX_PERSONNAGES, manuel: false, etape: 0, ips: 0 });
  faireRevenir();
  plusRienAEnlever = false;
  fen.length = 0;
  calmeJusqua = performance.now() + 4000;
  demarrerMesure();
}

// ------------------------------------------------------------------ la puissance de la tablette

/** Une estimation au démarrage : le nombre de cœurs du processeur et la mémoire (quand le navigateur le dit). */
export function puissance(): { coeurs: number; memoire: number; faible: boolean } {
  const n = typeof navigator !== "undefined" ? navigator : ({} as Navigator);
  const coeurs = typeof n.hardwareConcurrency === "number" && n.hardwareConcurrency > 0 ? n.hardwareConcurrency : 0;
  const memoire = typeof (n as Navigator & { deviceMemory?: number }).deviceMemory === "number" ? (n as Navigator & { deviceMemory?: number }).deviceMemory ?? 0 : 0;
  const faible = (coeurs > 0 && coeurs <= 2) || (memoire > 0 && memoire <= 1);
  return { coeurs, memoire, faible };
}
/** Le maximum que la tablette peut porter d'après sa puissance seule. */
function maxSelonPuissance(): number {
  const p = puissance();
  if (p.faible) return 2;
  if ((p.coeurs > 0 && p.coeurs <= 4) && (p.memoire > 0 && p.memoire <= 2)) return 3;
  return MAX_PERSONNAGES;
}

// ------------------------------------------------------------------ la mesure, en continu

/** Ce que l'appli doit fournir pour que l'arbitre puisse agir (branché par les personnages). */
export type Intervention = (etape: Etape, nouveauMax: number) => Promise<boolean>;
let intervenir: Intervention | null = null;
let copainsVisibles: () => number = () => 0;
let rappeler: (cles: string[]) => string[] = () => [];
export function brancherArbitre(f: Intervention, visibles: () => number, revenir: (cles: string[]) => string[]) {
  intervenir = f;
  copainsVisibles = visibles;
  rappeler = revenir;
}
/** Un copain vient de sortir du terrain sur ordre de l'arbitre : on s'en souvient pour pouvoir le faire revenir. */
export function noterSorti(cle: string) {
  if (!etat.sortis.includes(cle)) changer({ sortis: [...etat.sortis, cle].slice(-3) });
}

const fen: number[] = []; // images par seconde des dernières secondes
let ipsDirect = 0;
let raf = 0;
let debut = 0;
let images = 0;
let derniere = 0;
let sali = false; // la seconde en cours ne compte pas (défilement, trou dans l'affichage)
let calmeJusqua = 0;
let enCours = false;
let plusRienAEnlever = false;
let essaiJusqua = 0;
const ecranOccupe = () => !!document.querySelector(".mm, .wd, .reveal, .majfull, .subst, .vis--arbitre");

/** Ce que l'arbitre ferait maintenant (null : plus rien à enlever). */
function prochaineEtape(): { etape: Etape; max: number } | null {
  if (etat.etape < 1) return { etape: 1, max: etat.max };
  if (etat.etape < 2) return { etape: 2, max: etat.max };
  const vus = copainsVisibles();
  if (!etat.manuel && vus > 0) return { etape: 3, max: vus }; // un copain de moins : vus + 1 personnages - 1
  return null;
}

function image(t: number) {
  raf = requestAnimationFrame(image);
  if (document.hidden || t < calmeJusqua || enCours) {
    debut = t;
    images = 0;
    derniere = t;
    sali = false;
    return;
  }
  if (document.documentElement.classList.contains("is-scrolling")) sali = true;
  if (t - derniere > 1500) sali = true; // l'écran s'est arrêté (onglet caché, appareil en veille…) : on ne compte pas
  derniere = t;
  images += 1;
  const duree = t - debut;
  if (duree < 1000) return;
  const ips = ((images - 1) * 1000) / duree;
  const compte = !sali && !ecranOccupe();
  debut = t;
  images = 1;
  sali = false;
  if (!compte) {
    fen.length = 0;
    return;
  }
  fen.push(ips);
  if (fen.length > FENETRES) fen.shift();
  ipsDirect = fen.reduce((a, b) => a + b, 0) / fen.length;
  if (fen.length >= FENETRES && fen.every((x) => x < SEUIL)) void ramer(ipsDirect);
}

async function ramer(ips: number) {
  if (enCours || !etat.actif || performance.now() < essaiJusqua) return;
  const p = prochaineEtape();
  if (!p || !intervenir) {
    // plus rien à enlever : il ne reviendra plus (jusqu'à la remise à zéro)
    plusRienAEnlever = true;
    changer({ ips: Math.round(ips) });
    arreterMesure();
    return;
  }
  enCours = true;
  fen.length = 0;
  try {
    const fait = await intervenir(p.etape, p.max);
    if (fait) changer({ etape: p.etape, max: p.etape === 3 ? p.max : etat.max, ips: Math.round(ips) });
  } catch {
    /* il réessaiera plus tard */
  } finally {
    enCours = false;
    fen.length = 0;
    calmeJusqua = performance.now() + 3500; // le temps que tout se calme avant de mesurer de nouveau
  }
}

function demarrerMesure() {
  if (raf || typeof requestAnimationFrame === "undefined" || !etat.actif || plusRienAEnlever) return;
  debut = performance.now();
  derniere = debut;
  images = 0;
  raf = requestAnimationFrame(image);
}
function arreterMesure() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

/** Au démarrage de l'appli : la page s'allège tout de suite si c'était retenu, puis la mesure commence (après le chargement). */
export function surveillerFluidite() {
  appliquer();
  calmeJusqua = performance.now() + 10000;
  // en revenant sur l'appli, ou quand l'écran tourne, on laisse le temps à l'affichage de reprendre
  document.addEventListener("visibilitychange", () => {
    fen.length = 0;
    calmeJusqua = performance.now() + 2500;
  });
  window.addEventListener("resize", () => {
    fen.length = 0;
    calmeJusqua = Math.max(calmeJusqua, performance.now() + 2000);
  });
  demarrerMesure();
}
/** Les images par seconde des dernières secondes (0 : pas encore mesuré). */
export const imagesParSecondeMesurees = () => Math.round(ipsDirect || etat.ips);

// ------------------------------------------------------------------ le test rapide (écran « Réparer l'appli »)

/** Un test rapide (environ 2 secondes et demie) : compte les images par seconde, règle et retient le maximum de personnages. */
export function testerFluidite(): Promise<{ imagesParSeconde: number; maxPersonnages: number }> {
  return new Promise((ok) => {
    essaiJusqua = performance.now() + 4000; // l'arbitre ne s'en mêle pas pendant le test
    let fini = false;
    const fin = () => {
      if (fini) return;
      fini = true;
      const ips = Math.round(compte > 1 ? ((compte - 1) * 1000) / Math.max(1, dernier - premier) : 60);
      const max = Math.min(ips >= 52 ? 4 : ips >= 44 ? 3 : ips >= 34 ? 2 : 1, maxSelonPuissance());
      // ce qui est déjà allégé le reste (la mesure s'est faite avec la page allégée)
      const etape = Math.max(etat.etape, ips < 52 || max < MAX_PERSONNAGES ? 1 : 0, max <= 2 ? 2 : 0, max <= 1 ? 3 : 0) as Etape;
      changer({ max, manuel: false, etape, ips });
      faireRevenir();
      plusRienAEnlever = false;
      fen.length = 0;
      calmeJusqua = performance.now() + 3000;
      demarrerMesure();
      ok({ imagesParSeconde: ips, maxPersonnages: max });
    };
    let premier = 0;
    let dernier = 0;
    let compte = 0;
    const t0 = performance.now();
    if (typeof requestAnimationFrame === "undefined") return fin();
    const pas = (t: number) => {
      if (!premier) premier = t;
      dernier = t;
      compte += 1;
      if (t - t0 < 2500) requestAnimationFrame(pas);
      else fin();
    };
    requestAnimationFrame(pas);
    // si l'appli est cachée pendant le test, l'affichage s'arrête : on donne quand même une réponse
    window.setTimeout(() => {
      if (performance.now() - t0 >= 4500 && dernier - t0 < 2500) fin();
    }, 4600);
  });
}

// Pour vérifier dans un navigateur : l'adresse avec « ?essai-terrain ».
if (typeof location !== "undefined" && location.search.includes("essai-terrain")) {
  (window as unknown as { __fluidite?: unknown }).__fluidite = { fluidite, testerFluidite, remettreAZero, imagesParSecondeMesurees, fen };
}
