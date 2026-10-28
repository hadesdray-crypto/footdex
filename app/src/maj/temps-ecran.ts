// (From the Encyclopédie de la vie.) Le temps d'écran de Raphaël : un parent choisit une durée par jour (dans le Coin des parents).
// On compte seulement le temps où l'application est vraiment ouverte devant elle.
// Repère : les directives canadiennes conseillent au plus 2 heures d'écran de loisir par jour, tous écrans confondus.
import { useEffect, useState } from "react";

const CLE_LIMITE = "footdex.ecran.limite";
const CLE_JOUR = "footdex.ecran.jour";
export const LIMITES = [0, 20, 30, 45, 60, 90] as const; // 0 = pas de limite
export const LIMITE_DEFAUT = 0; // Footdex : pas de limite tant qu'un parent n'en choisit pas

type Jour = { date: string; secondes: number; bonus: number; libre: boolean; prevenu: boolean };

function aujourdhui() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function lire<T>(cle: string, defaut: T): T {
  try {
    const v = localStorage.getItem(cle);
    return v === null ? defaut : (JSON.parse(v) as T);
  } catch {
    return defaut;
  }
}
function ecrire(cle: string, v: unknown) {
  try {
    localStorage.setItem(cle, JSON.stringify(v));
  } catch {
    /* rien */
  }
}

export function limiteEcran(): number {
  return lire(CLE_LIMITE, LIMITE_DEFAUT);
}
export function choisirLimiteEcran(min: number) {
  ecrire(CLE_LIMITE, min);
  publier();
}

function jour(): Jour {
  const j = lire<Jour | null>(CLE_JOUR, null);
  if (!j || j.date !== aujourdhui()) return { date: aujourdhui(), secondes: 0, bonus: 0, libre: false, prevenu: false };
  return j;
}

export type EtatEcran = { minutes: number; reste: number | null; fini: boolean; prevenir: boolean };
function calculer(): EtatEcran {
  const j = jour();
  const limite = limiteEcran();
  const minutes = Math.floor(j.secondes / 60);
  if (!limite || j.libre) return { minutes, reste: null, fini: false, prevenir: false };
  const reste = limite + j.bonus - minutes;
  return { minutes, reste, fini: reste <= 0, prevenir: reste <= 10 && reste > 0 && !j.prevenu };
}

const abonnes = new Set<(e: EtatEcran) => void>();
function publier() {
  const e = calculer();
  abonnes.forEach((f) => f(e));
}
export function useTempsEcran() {
  const [e, setE] = useState(calculer);
  useEffect(() => {
    abonnes.add(setE);
    setE(calculer());
    return () => {
      abonnes.delete(setE);
    };
  }, []);
  return e;
}

/** Le personnage a prévenu « encore un petit moment » : elle ne le redit pas aujourd'hui. */
export function marquerPrevenu() {
  ecrire(CLE_JOUR, { ...jour(), prevenu: true });
  publier();
}
/** Un adulte donne un peu de temps en plus, ou enlève la limite pour aujourd'hui. */
export function encoreDuTemps(min: number) {
  const j = jour();
  ecrire(CLE_JOUR, { ...j, bonus: j.bonus + min, prevenu: false });
  publier();
}
export function sansLimiteAujourdhui() {
  ecrire(CLE_JOUR, { ...jour(), libre: true });
  publier();
}

let demarre = false;
export function demarrerTempsEcran() {
  if (demarre) return;
  demarre = true;
  let dernier = Date.now();
  window.setInterval(() => {
    const maintenant = Date.now();
    const ecoule = Math.min(30, (maintenant - dernier) / 1000); // jamais plus de 30 s d'un coup (veille, etc.)
    dernier = maintenant;
    if (document.visibilityState !== "visible") return;
    const j = jour();
    ecrire(CLE_JOUR, { ...j, secondes: j.secondes + ecoule });
    publier();
  }, 15000);
  document.addEventListener("visibilitychange", () => {
    dernier = Date.now();
    publier();
  });
}
