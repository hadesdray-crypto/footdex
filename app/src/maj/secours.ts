// Les copies de secours de la progression, et la garde du démarrage.
// Ce fichier est lu TOUT EN PREMIER (première ligne de main.tsx) : avant que la collection, le personnage
// ou les histoires soient chargés, on vérifie que leur sauvegarde se lit bien. Si l'une est abîmée,
// on garde l'abîmée de côté (rien n'est jamais jeté) et on remet la dernière bonne copie.
// Il ne dépend de rien d'autre dans l'appli, pour pouvoir passer avant tout le monde.

/** Ce que l'enfant a gagné : ces sauvegardes ne doivent jamais se perdre. */
export const PRECIEUX = [
  "footdex.etat.v3", // cartes, pièces, paquets en réserve, coffre, classeur
  "footdex.collection", // pièces d'or, Footballinis, figurines, personnages gagnés
  "footdex.mascotte.v1", // le personnage, ses habits, sa voix
  "footdex.histoires.v1", // les histoires découvertes
  "footdex.histoires.armees.v1",
  "footdex.carte.v1",
  "footdex.mission",
  "footdex.blessures",
  "footdex.reglages.compteurs",
] as const;

export const NOMS: Record<string, string> = {
  "footdex.etat.v3": "tes cartes et tes paquets",
  "footdex.collection": "ton coffre et tes pièces d'or",
  "footdex.mascotte.v1": "ton personnage",
  "footdex.histoires.v1": "tes histoires",
  "footdex.histoires.armees.v1": "tes histoires",
  "footdex.carte.v1": "ta carte du monde",
  "footdex.mission": "tes missions",
  "footdex.blessures": "les pansements du personnage",
  "footdex.reglages.compteurs": "les compteurs des paquets",
};

const CLE_VITE = "footdex.secours.vite"; // la copie rapide (dans le stockage local), lue au démarrage
const CLE_ABIME = "footdex.secours.abime"; // les sauvegardes abîmées, gardées de côté
export const CLE_LANCEMENT = "footdex.maj.lancement"; // « en-cours » tant que l'appli n'est pas bien ouverte
export const CLE_A_RESTAURER = "footdex.maj.restaurer"; // une réparation à finir au prochain démarrage
export const CLE_RESULTAT = "footdex.maj.reparation"; // le résultat à montrer après le redémarrage

function lire(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function ecrire(k: string, v: string): boolean {
  try {
    localStorage.setItem(k, v);
    return true;
  } catch {
    return false;
  }
}
function effacer(k: string) {
  try {
    localStorage.removeItem(k);
  } catch {
    /* rien */
  }
}

/** Une sauvegarde se lit-elle bien ? (absente = rien à réparer) */
export function lisible(cle: string, texte: string | null): boolean {
  if (texte === null) return true;
  try {
    const v = JSON.parse(texte) as unknown;
    if (cle === "footdex.carte.v1") return Array.isArray(v);
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    if (cle === "footdex.etat.v3") {
      const s = v as { v?: unknown; cards?: unknown };
      return s.v === 3 && !!s.cards && typeof s.cards === "object" && !Array.isArray(s.cards);
    }
    return true;
  } catch {
    return false;
  }
}

/** Combien de choses gagnées dans une sauvegarde (pour comparer deux copies). */
export function richesse(cle: string, texte: string | null): number {
  if (!texte || !lisible(cle, texte)) return 0;
  try {
    const v = JSON.parse(texte) as Record<string, unknown>;
    if (cle === "footdex.etat.v3") {
      const n = (x: unknown) => (typeof x === "number" && isFinite(x) ? x : 0);
      const l = (x: unknown) => (Array.isArray(x) ? x.length : 0);
      // (les paquets du jour en réserve ne comptent pas : l'appli en redonne toute seule)
      return Object.keys((v.cards as object) ?? {}).length * 10 + n(v.opened) + n(v.stars) + l(v.chest) * 5 + l(v.gifts);
    }
    if (cle === "footdex.collection") {
      const somme = (o: unknown) => Object.values(o && typeof o === "object" ? (o as Record<string, number>) : {}).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
      return (typeof v.coins === "number" ? v.coins : 0) + (somme(v.cards) + somme(v.figs) + somme(v.figsC)) * 5 + (Array.isArray(v.styles) ? v.styles.length * 5 : 0);
    }
    return 1;
  } catch {
    return 0;
  }
}

// ------------------------------------------------------------------ toutes les données de l'appli

/** Tout ce que Footdex garde (sauf les mises à jour et les copies de secours elles-mêmes). */
export function toutesLesDonnees(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("footdex.") && !k.startsWith("footdex.maj.") && !k.startsWith("footdex.secours.")) out[k] = localStorage.getItem(k) ?? "";
    }
  } catch {
    /* stockage bloqué */
  }
  return out;
}

export type Copie = { id?: number; date: number; raison: string; data: Record<string, string> };

// ------------------------------------------------------------------ la copie rapide (stockage local)

/** Lit la copie rapide (ou rien si elle est abîmée). */
export function copieRapide(): Copie | null {
  try {
    const c = JSON.parse(lire(CLE_VITE) ?? "null") as Copie | null;
    return c && typeof c === "object" && c.data && typeof c.data === "object" ? c : null;
  } catch {
    return null;
  }
}

/** Garde une copie rapide des sauvegardes précieuses, seulement celles qui se lisent bien. */
function ecrireCopieRapide(data: Record<string, string>) {
  const ancienne = copieRapide();
  const garde: Record<string, string> = {};
  for (const k of PRECIEUX) {
    const t = data[k];
    if (t !== undefined && lisible(k, t)) garde[k] = t;
    // une sauvegarde abîmée ne remplace jamais sa bonne copie
    else if (ancienne?.data[k] !== undefined) garde[k] = ancienne.data[k];
  }
  const texte = JSON.stringify({ date: Date.now(), raison: "auto", data: garde });
  // jamais plus de 600 Ko : la place doit rester pour la vraie sauvegarde
  if (texte.length > 600_000) return;
  ecrire(CLE_VITE, texte);
}

// ------------------------------------------------------------------ les copies complètes (base du téléphone)

const BASE = "footdex-secours";
const MAGASIN = "copies";
const MAX_COPIES = 6;

function base(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try {
      if (typeof indexedDB === "undefined") return ok(null);
      const r = indexedDB.open(BASE, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(MAGASIN, { keyPath: "id", autoIncrement: true });
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
      r.onblocked = () => ok(null);
    } catch {
      ok(null);
    }
  });
}

/** Toutes les copies complètes, la plus récente d'abord. */
export async function copiesCompletes(): Promise<Copie[]> {
  const db = await base();
  if (!db) return [];
  return new Promise((ok) => {
    try {
      const r = db.transaction(MAGASIN, "readonly").objectStore(MAGASIN).getAll();
      r.onsuccess = () => {
        const l = (r.result as Copie[]).filter((c) => c && c.data && typeof c.data === "object");
        ok(l.sort((a, b) => b.date - a.date));
        db.close();
      };
      r.onerror = () => {
        ok([]);
        db.close();
      };
    } catch {
      ok([]);
    }
  });
}

async function ajouterCopie(c: Copie): Promise<boolean> {
  const db = await base();
  if (!db) return false;
  const anciennes = await copiesCompletes();
  return new Promise((ok) => {
    try {
      const tx = db.transaction(MAGASIN, "readwrite");
      const st = tx.objectStore(MAGASIN);
      st.add(c);
      // on garde les plus récentes, mais toujours au moins une copie « automatique » qui se lit bien
      const trop = anciennes.slice(MAX_COPIES - 1);
      for (const v of trop) if (v.id !== undefined) st.delete(v.id);
      tx.oncomplete = () => {
        db.close();
        ok(true);
      };
      tx.onerror = () => {
        db.close();
        ok(false);
      };
    } catch {
      ok(false);
    }
  });
}

let derniereEmpreinte = "";
let derniereCopie = 0;

/**
 * Prend une copie de secours de tout ce que l'appli garde.
 * `avant-reparation` : copie de l'état exact du moment, même abîmé (pour pouvoir tout remettre comme avant).
 */
export async function prendreCopie(raison: "auto" | "avant-reparation" | "apres-reparation"): Promise<boolean> {
  const data = toutesLesDonnees();
  const precieux = PRECIEUX.filter((k) => data[k] !== undefined);
  // une copie automatique ne garde jamais une sauvegarde abîmée
  if (raison !== "avant-reparation" && precieux.some((k) => !lisible(k, data[k]))) return false;
  if (raison !== "avant-reparation") ecrireCopieRapide(data);
  const empreinte = JSON.stringify(data);
  if (raison === "auto" && empreinte === derniereEmpreinte) return true;
  const ok = await ajouterCopie({ date: Date.now(), raison, data });
  if (ok) derniereEmpreinte = empreinte;
  return ok;
}

/** Copie automatique, au plus une fois toutes les 10 minutes. */
export function copieAuto() {
  if (Date.now() - derniereCopie < 10 * 60 * 1000) return;
  derniereCopie = Date.now();
  void prendreCopie("auto");
}

// ------------------------------------------------------------------ les sauvegardes abîmées, gardées de côté

export type Abimee = { cle: string; date: number; texte: string };
export function abimees(): Abimee[] {
  try {
    const l = JSON.parse(lire(CLE_ABIME) ?? "[]") as Abimee[];
    return Array.isArray(l) ? l : [];
  } catch {
    return [];
  }
}
export function garderAbimee(cle: string, texte: string) {
  const l = abimees().filter((a) => !(a.cle === cle && a.texte === texte));
  l.unshift({ cle, date: Date.now(), texte: texte.slice(0, 300_000) });
  // trois au plus : c'est une copie pour comprendre, la vraie progression est dans les bonnes copies
  ecrire(CLE_ABIME, JSON.stringify(l.slice(0, 3)));
}

// ------------------------------------------------------------------ la garde du démarrage

export type Demarrage = { plantage: boolean; reparees: string[]; abimeesSansCopie: string[] };
export const demarrage: Demarrage = { plantage: false, reparees: [], abimeesSansCopie: [] };

function garderAuDemarrage() {
  // 1. Une réparation demandée avant le redémarrage : on la finit avant que l'appli lise ses sauvegardes.
  try {
    const a = JSON.parse(lire(CLE_A_RESTAURER) ?? "null") as Record<string, string> | null;
    if (a && typeof a === "object") for (const [k, v] of Object.entries(a)) if (k.startsWith("footdex.") && typeof v === "string") ecrire(k, v);
  } catch {
    /* rien */
  }
  effacer(CLE_A_RESTAURER);

  // 2. L'appli s'est-elle mal fermée la dernière fois ?
  demarrage.plantage = lire(CLE_LANCEMENT) === "en-cours";
  ecrire(CLE_LANCEMENT, "en-cours");

  // 3. Chaque sauvegarde précieuse se lit-elle ? Sinon : on garde l'abîmée de côté et on remet la bonne copie.
  const rapide = copieRapide();
  for (const k of PRECIEUX) {
    const t = lire(k);
    if (lisible(k, t)) continue;
    garderAbimee(k, t ?? "");
    const bonne = rapide?.data[k];
    if (bonne !== undefined && lisible(k, bonne) && ecrire(k, bonne)) demarrage.reparees.push(k);
    else demarrage.abimeesSansCopie.push(k);
  }
}

/** L'appli est bien ouverte et stable : on retire le drapeau, et on fait une copie de secours. */
export function marquerStable() {
  if (lire(CLE_LANCEMENT) === "en-cours") effacer(CLE_LANCEMENT);
  copieAuto();
}

/** Avant un redémarrage voulu (mise à jour, réparation), ce n'est pas un plantage. */
export function finLancement() {
  effacer(CLE_LANCEMENT);
}

garderAuDemarrage();
if (typeof window !== "undefined") {
  // L'appli est fermée normalement (ou passe derrière) : ce n'est pas un plantage.
  window.addEventListener("pagehide", () => {
    finLancement();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") copieAuto();
  });
}
