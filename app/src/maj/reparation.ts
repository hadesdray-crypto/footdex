// « Réparer l'appli » : les vérifications, l'une après l'autre. Chacune dit ce qu'elle a trouvé et ce qu'elle a fait.
// Règle d'or : on ne perd JAMAIS ce qui a été gagné. Avant de toucher à la sauvegarde, on en fait une copie.
import { SKINS, changerApparence } from "../apparence";
import { fetchJson, jsonDemandes, oublierJson, remplirJson } from "../data";
import { getMascot, stopTalking, update } from "../mascot/state";
import { DEFAUT, reglages, regler } from "../reglages-jeu";
import { setSound, soundOn, unlockAudio } from "../sound";
import { getState, lireEtat, rechargerEtat, reecrireEtat } from "../store";
import { EST_APK, FICHIERS_DONNEES, HORS_LIGNE, SITE } from "./env";
import { etatHorsLigne, horsLigneActif, verifierMiseAJour } from "./hors-ligne";
import { etatMajApk, verifierApk } from "./maj-apk";
import { permettreInternet } from "./parents";
import {
  CLE_A_RESTAURER, NOMS, PRECIEUX, type Copie, copieRapide, copiesCompletes, demarrage, garderAbimee, lisible, prendreCopie, richesse,
} from "./secours";
import { LIMITES, LIMITE_DEFAUT, choisirLimiteEcran } from "./temps-ecran";

export type Statut = "attente" | "en-cours" | "ok" | "repare" | "attention";
export type Resultat = { statut: Exclude<Statut, "attente" | "en-cours">; texte: string; fait: string[] };
export type Avancement = (detail: string) => void;

const attendre = (ms: number) => new Promise<void>((ok) => window.setTimeout(ok, ms));

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
    return localStorage.getItem(k) === v;
  } catch {
    return false;
  }
}

/** Ce que la réparation a trouvé d'important, pour la phrase de Philippe. */
export const bilan = { majDispo: false, sauvegarde: false, fichiers: false, autre: false, probleme: false, relancer: false };

// ------------------------------------------------------------------ 1. mises à jour

/** Rouvre la fenêtre « Nouvelle mise à jour ! » même si « Plus tard » avait été touché. */
export function reproposerMaj() {
  window.dispatchEvent(new Event("footdex:maj-reproposer"));
}

export async function etapeMaj(): Promise<Resultat> {
  if (EST_APK) {
    await verifierApk();
    const e = etatMajApk();
    if (e.phase === "propose" || e.phase === "pret" || e.phase === "telechargement" || (e.nouvelle ?? 0) > 0) {
      bilan.majDispo = true;
      reproposerMaj();
      return { statut: "repare", texte: "Une nouvelle version existe : je te la propose.", fait: ["Une mise à jour t'attend"] };
    }
    if (e.verification === "hors-ligne") return { statut: "ok", texte: "Pas d'Internet : je regarderai plus tard.", fait: [] };
    if (e.verification === "erreur") return { statut: "ok", texte: "Je n'ai pas pu regarder. Je réessaierai tout seul.", fait: [] };
    return { statut: "ok", texte: "Tu as la dernière version.", fait: [] };
  }
  if (HORS_LIGNE && horsLigneActif()) {
    await verifierMiseAJour();
    for (let i = 0; i < 25 && etatHorsLigne().verification === "en-cours" && !etatHorsLigne().majDisponible; i++) await attendre(250);
    if (etatHorsLigne().majDisponible) {
      bilan.majDispo = true;
      reproposerMaj();
      return { statut: "repare", texte: "Une nouvelle version existe : je te la propose.", fait: ["Une mise à jour t'attend"] };
    }
    if (etatHorsLigne().verification === "hors-ligne") return { statut: "ok", texte: "Pas d'Internet : je regarderai plus tard.", fait: [] };
    return { statut: "ok", texte: "Tu as la dernière version.", fait: [] };
  }
  return { statut: "ok", texte: "Cette version se met à jour toute seule.", fait: [] };
}

// ------------------------------------------------------------------ 2. fichiers de l'appli

const ESSENTIELS = ["data/core.json", "data/album-faces.json", "data/card-doubts.json", "data/portraits-small.json"];
const aDesCaches = () => typeof caches !== "undefined" && location.protocol === "https:";

async function nosCaches(): Promise<Cache[]> {
  if (!aDesCaches()) return [];
  try {
    const noms = (await caches.keys()).filter((k) => k.startsWith("footdex-"));
    return Promise.all(noms.map((n) => caches.open(n)));
  } catch {
    return [];
  }
}
async function copieEnCache(path: string): Promise<Response | undefined> {
  if (!aDesCaches()) return undefined;
  try {
    for (const c of await nosCaches()) {
      const r = await c.match(path);
      if (r) return r;
    }
  } catch {
    /* rien */
  }
  return undefined;
}
async function effacerDuCache(path: string) {
  for (const c of await nosCaches()) {
    try {
      await c.delete(path);
      await c.delete(new URL(path, location.href).href);
    } catch {
      /* rien */
    }
  }
}
async function rangerDansLeCache(path: string, texte: string) {
  const l = await nosCaches();
  const c = l[l.length - 1];
  if (!c) return;
  try {
    await c.put(new URL(path, location.href).href, new Response(texte, { headers: { "Content-Type": "application/json" } }));
  } catch {
    /* rien */
  }
}
async function texteDe(url: string, init?: RequestInit): Promise<string> {
  const arret = new AbortController();
  const minuteur = window.setTimeout(() => arret.abort(), 20000);
  try {
    const r = await fetch(url, { ...init, signal: arret.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.text();
  } finally {
    window.clearTimeout(minuteur);
  }
}

/** Relit un fichier abîmé ou absent. Plusieurs façons, l'une après l'autre : si l'une échoue, la suivante. */
export async function rechargerFichier(path: string): Promise<boolean> {
  oublierJson(path);
  await effacerDuCache(path);
  const essai = `${path}?r=${Date.now()}`;
  const facons: (() => Promise<string>)[] = [
    () => texteDe(path, { cache: "reload" }),
    () => texteDe(essai, { cache: "no-store" }),
    () => texteDe(path, { cache: "no-store" }),
    () => (navigator.onLine !== false && !location.href.startsWith(SITE) ? texteDe(`${SITE}${path}`, { cache: "no-store" }) : Promise.reject(new Error("hors ligne"))),
  ];
  for (const f of facons) {
    try {
      const t = await f();
      const v = JSON.parse(t) as unknown;
      remplirJson(path, v);
      await rangerDansLeCache(path, t);
      await effacerDuCache(essai);
      return true;
    } catch {
      /* la façon suivante */
    }
  }
  await effacerDuCache(essai);
  return false;
}

/** Un fichier se lit-il ? (la copie gardée par le téléphone d'abord, sinon le fichier lui-même) */
async function fichierLisible(path: string, deMemoire: boolean): Promise<boolean> {
  try {
    if (deMemoire) await fetchJson(path);
    const c = await copieEnCache(path);
    const t = c ? await c.text() : await texteDe(path);
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}

export async function etapeFichiers(av: Avancement): Promise<Resultat> {
  const demandes = new Set(jsonDemandes());
  let liste: string[];
  if (EST_APK) liste = FICHIERS_DONNEES;
  else {
    // sur le site, on ne télécharge pas les 30 Mo : on vérifie les fichiers déjà gardés ou déjà ouverts
    const gardes: string[] = [];
    for (const f of FICHIERS_DONNEES) if (await copieEnCache(f)) gardes.push(f);
    liste = [...new Set([...ESSENTIELS, ...gardes, ...demandes].filter((f) => f.startsWith("data/")))];
  }
  const repares: string[] = [];
  const rates: string[] = [];
  for (let i = 0; i < liste.length; i++) {
    const f = liste[i];
    av(`Fichier ${i + 1} sur ${liste.length}`);
    if (await fichierLisible(f, demandes.has(f) || ESSENTIELS.includes(f))) continue;
    if (await rechargerFichier(f)) repares.push(f);
    else rates.push(f);
  }
  if (rates.length) {
    bilan.probleme = true;
    return { statut: "attention", texte: `${rates.length} fichier${rates.length > 1 ? "s" : ""} n'a pas pu être rechargé. Réessaie avec Internet.`, fait: [`${rates.length} fichier à recharger avec Internet`] };
  }
  if (repares.length) {
    bilan.fichiers = true;
    const n = repares.length;
    return { statut: "repare", texte: `J'ai rechargé ${n} fichier${n > 1 ? "s" : ""} abîmé${n > 1 ? "s" : ""}.`, fait: [`${n} fichier${n > 1 ? "s" : ""} de l'appli rechargé${n > 1 ? "s" : ""}`] };
  }
  return { statut: "ok", texte: `Les ${liste.length} fichiers se lisent bien.`, fait: [] };
}

// ------------------------------------------------------------------ 3. sauvegarde

/** La meilleure copie d'une sauvegarde : la plus récente qui se lit bien. */
function meilleureCopie(cle: string, copies: Copie[]): string | undefined {
  for (const c of copies) {
    const t = c.data[cle];
    if (t !== undefined && lisible(cle, t)) return t;
  }
  return undefined;
}

export async function etapeSauvegarde(): Promise<Resultat> {
  const fait: string[] = [];
  // Avant toute réparation : une copie de l'état exact d'aujourd'hui, même abîmé.
  await prendreCopie("avant-reparation");
  const rapide = copieRapide();
  const copies = [...(await copiesCompletes()).filter((c) => c.raison !== "avant-reparation"), ...(rapide ? [rapide] : [])].sort((a, b) => b.date - a.date);
  const aRelancer: Record<string, string> = {};
  let probleme = false;
  const dit = new Set<string>();
  const noter = (cle: string) => {
    const nom = NOMS[cle] ?? "une sauvegarde";
    if (!dit.has(nom)) fait.push(`Sauvegarde réparée : ${nom}`);
    dit.add(nom);
  };

  for (const k of demarrage.reparees) noter(k);

  for (const cle of PRECIEUX) {
    const t = lire(cle);
    const copie = meilleureCopie(cle, copies);

    if (cle === "footdex.etat.v3") {
      const memoire = JSON.stringify(getState());
      if (!lisible(cle, t)) {
        // abîmée : on choisit la plus riche entre la progression en mémoire et la dernière bonne copie
        if (t !== null) garderAbimee(cle, t);
        const choix = copie !== undefined && richesse(cle, copie) > richesse(cle, memoire) ? copie : memoire;
        if (choix === memoire ? reecrireEtat() || (libererPlace() && reecrireEtat()) : ecrire(cle, choix) && rechargerEtat()) noter(cle);
        else probleme = true;
        continue;
      }
      // elle se lit, mais elle est vide alors qu'une copie garde des cartes : on reprend la copie
      if (copie !== undefined && richesse(cle, t) === 0 && richesse(cle, copie) > 0) {
        if (ecrire(cle, copie) && rechargerEtat()) noter(cle);
        else probleme = true;
        continue;
      }
      // elle se lit, mais n'est pas celle en mémoire (l'écriture avait échoué) : la plus récente gagne
      if (t !== memoire) {
        const lu = lireEtat(t);
        if (lu && lu.updated > getState().updated) rechargerEtat();
        else if (reecrireEtat() || (libererPlace() && reecrireEtat())) noter(cle);
        else probleme = true;
      }
      continue;
    }

    if (!lisible(cle, t)) {
      if (t !== null) garderAbimee(cle, t);
      if (copie !== undefined) {
        aRelancer[cle] = copie;
        noter(cle);
      } else probleme = true;
      continue;
    }
    if (cle === "footdex.collection" && copie !== undefined && richesse(cle, t) === 0 && richesse(cle, copie) > 0) {
      aRelancer[cle] = copie;
      noter(cle);
    }
  }

  if (Object.keys(aRelancer).length) {
    // ces sauvegardes sont remises au prochain démarrage, AVANT que l'appli les lise (rien ne peut les écraser)
    if (ecrire(CLE_A_RESTAURER, JSON.stringify(aRelancer))) bilan.relancer = true;
    else probleme = true;
  }
  if (fait.length) bilan.sauvegarde = true;
  if (!Object.keys(aRelancer).length) await prendreCopie(fait.length ? "apres-reparation" : "auto");
  if (probleme) {
    bilan.probleme = true;
    return { statut: "attention", texte: "Une partie de la sauvegarde n'a pas pu être réparée. Tout ce qui se lisait est gardé.", fait: [...fait, "Une sauvegarde n'a pas pu être réparée"] };
  }
  if (fait.length) return { statut: "repare", texte: "J'ai réparé la sauvegarde. Rien n'est perdu.", fait };
  const nb = copies.length;
  return { statut: "ok", texte: `Ta sauvegarde est en bon état${nb ? ` (${nb} copie${nb > 1 ? "s" : ""} de secours)` : ""}.`, fait: [] };
}

/** Le téléphone est plein : on enlève les copies abîmées gardées pour comprendre (jamais la progression). */
function libererPlace(): boolean {
  try {
    localStorage.removeItem("footdex.secours.abime");
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ 4. nettoyage, voix, micro

async function etatMicro(): Promise<"oui" | "non" | "pas-encore" | "inconnu"> {
  // 1. demander seulement l'état, sans jamais redemander l'autorisation
  try {
    const p = await navigator.permissions?.query({ name: "microphone" as PermissionName });
    if (p?.state === "granted") return "oui";
    if (p?.state === "denied") return "non";
    if (p?.state === "prompt") return "pas-encore";
  } catch {
    /* méthode suivante */
  }
  // 2. la liste des micros : leurs noms ne sont visibles que si l'accès a déjà été donné
  try {
    const l = await navigator.mediaDevices?.enumerateDevices();
    const micros = (l ?? []).filter((d) => d.kind === "audioinput");
    if (!micros.length) return "inconnu";
    return micros.some((d) => d.label) ? "oui" : "pas-encore";
  } catch {
    return "inconnu";
  }
}

export async function etapeNettoyage(): Promise<Resultat> {
  const fait: string[] = [];
  const textes: string[] = [];
  // les copies gardées par le téléphone qui sont abîmées (réponse en erreur, essai de rechargement oublié)
  let videes = 0;
  for (const c of await nosCaches()) {
    try {
      for (const req of await c.keys()) {
        const r = await c.match(req);
        if (req.url.includes("?r=") || (r && r.type !== "opaque" && !r.ok)) {
          await c.delete(req);
          videes += 1;
        }
      }
    } catch {
      /* rien */
    }
  }
  if (videes) fait.push(`${videes} copie${videes > 1 ? "s" : ""} abîmée${videes > 1 ? "s" : ""} vidée${videes > 1 ? "s" : ""}`);

  // la voix : on la débloque et on la rallume si elle était coupée
  stopTalking();
  try {
    if (typeof speechSynthesis !== "undefined" && speechSynthesis.paused) speechSynthesis.resume();
  } catch {
    /* rien */
  }
  unlockAudio();
  if (!getMascot().s.auto) {
    update({ auto: true });
    fait.push("Voix rallumée");
    textes.push("J'ai rallumé la voix.");
  } else textes.push("La voix marche.");

  const micro = await etatMicro();
  if (micro === "oui") textes.push("Le micro est autorisé.");
  else if (micro === "non") textes.push("Le micro est refusé : un adulte peut l'autoriser dans les réglages du téléphone.");
  else if (micro === "pas-encore") textes.push("Le micro sera demandé la première fois que tu enregistres un bruit.");

  if (videes) bilan.autre = true;
  return { statut: fait.length ? "repare" : "ok", texte: [videes ? `J'ai vidé ${videes} copie${videes > 1 ? "s" : ""} abîmée${videes > 1 ? "s" : ""}.` : "", ...textes].filter(Boolean).join(" "), fait };
}

// ------------------------------------------------------------------ 5. réglages cassés (jamais la collection)

function json(k: string): { ok: boolean; v: unknown } {
  const t = lire(k);
  if (t === null) return { ok: true, v: undefined };
  try {
    return { ok: true, v: JSON.parse(t) as unknown };
  } catch {
    return { ok: false, v: undefined };
  }
}

export async function etapeReglages(): Promise<Resultat> {
  const fait: string[] = [];

  // l'apparence
  const a = json("footdex.apparence.v1");
  const av = a.v as Record<string, unknown> | undefined;
  const apparenceCassee =
    !a.ok ||
    (av !== undefined &&
      (typeof av !== "object" || av === null || (av.skin !== undefined && !SKINS.some((s) => s.id === av.skin)) || ["lisible", "contraste", "calme"].some((k) => av[k] !== undefined && typeof av[k] !== "boolean")));
  if (apparenceCassee) {
    changerApparence({});
    fait.push("Apparence remise comme il faut");
  }

  // les sons
  const son = lire("footdex.son");
  if (son !== null && son !== "on" && son !== "off") {
    setSound(soundOn());
    fait.push("Réglage des sons remis");
  }

  // les réglages du jeu (le code de mission et les questions des parents sont gardés)
  const j = json("footdex.reglages.jeu");
  if (!j.ok) {
    regler({});
    fait.push("Réglages du jeu remis par défaut");
  } else if (j.v && typeof j.v === "object") {
    const brut = j.v as Record<string, unknown>;
    const bon = reglages() as unknown as Record<string, unknown>;
    if (Object.keys(DEFAUT).some((k) => brut[k] !== undefined && JSON.stringify(brut[k]) !== JSON.stringify(bon[k]))) {
      regler({});
      fait.push("Valeurs du jeu impossibles remises comme il faut");
    }
  } else if (j.v !== undefined) {
    regler({});
    fait.push("Réglages du jeu remis par défaut");
  }

  // les réglages du personnage (sa vitesse, sa voix, sa place) : son habit et ses copains ne changent pas
  if (!lire(CLE_A_RESTAURER)?.includes("footdex.mascotte.v1")) {
    const m = json("footdex.mascotte.v1");
    const mv = m.ok && m.v && typeof m.v === "object" ? (m.v as Record<string, unknown>) : null;
    const s = getMascot().s as unknown as Record<string, unknown>;
    if (mv && ["perso", "speed", "engine", "voiceType", "fx", "fy", "nativeVoice"].some((k) => mv[k] !== undefined && JSON.stringify(mv[k]) !== JSON.stringify(s[k]))) {
      update({});
      fait.push("Réglages de la voix remis comme il faut");
    }
  }

  // le temps d'écran
  const l = json("footdex.ecran.limite");
  if (!l.ok || (l.v !== undefined && !(LIMITES as readonly number[]).includes(l.v as number))) {
    choisirLimiteEcran(LIMITE_DEFAUT);
    fait.push("Temps d'écran remis à 45 minutes");
  }
  const jour = json("footdex.ecran.jour");
  if (!jour.ok || (jour.v !== undefined && (typeof jour.v !== "object" || jour.v === null))) {
    try {
      localStorage.removeItem("footdex.ecran.jour");
    } catch {
      /* rien */
    }
    fait.push("Compteur du temps d'écran remis");
  }

  // Internet (pour les grands) : une valeur impossible veut dire « éteint »
  const net = lire("footdex.parents.internet");
  if (net !== null && net !== "oui" && net !== "non") {
    permettreInternet(false);
    fait.push("Options Internet remises (éteintes)");
  }

  if (fait.length) {
    bilan.autre = true;
    return { statut: "repare", texte: `J'ai remis ${fait.length} réglage${fait.length > 1 ? "s" : ""} comme il faut. Ta collection n'a pas bougé.`, fait };
  }
  return { statut: "ok", texte: "Tous les réglages sont bons.", fait: [] };
}

// ------------------------------------------------------------------ 6. fluidité

async function mesurerImages(ms = 2000): Promise<number> {
  return new Promise((ok) => {
    let n = 0;
    let debut = 0;
    const tour = (t: number) => {
      if (!debut) debut = t;
      n += 1;
      if (t - debut < ms) requestAnimationFrame(tour);
      else ok(Math.round(((n - 1) * 1000) / Math.max(1, t - debut)));
    };
    requestAnimationFrame(tour);
    // page cachée : requestAnimationFrame s'arrête, on ne bloque pas la réparation
    window.setTimeout(() => ok(Math.round((n * 1000) / ms)), ms + 1500);
  });
}

export async function etapeFluidite(): Promise<Resultat & { images: number; persos: number }> {
  let images = 0;
  let persos = 0;
  try {
    const m: any = await import("../perf"); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (typeof m.testerFluidite === "function") {
      const r = await m.testerFluidite();
      images = Math.round(Number(r?.imagesParSeconde) || 0);
      persos = Math.round(Number(r?.maxPersonnages) || 0);
    }
  } catch {
    /* la mesure simple prend le relais */
  }
  if (!images) images = await mesurerImages();
  const qualite = images >= 50 ? "très fluide" : images >= 30 ? "fluide" : "un peu lent";
  const texte = `${images} images par seconde : c'est ${qualite}.${persos ? ` Jusqu'à ${persos} personnage${persos > 1 ? "s" : ""} à l'écran sans ralentir.` : ""}${images < 30 ? " Fermer les autres applis peut aider." : ""}`;
  return { statut: "ok", texte, fait: [], images, persos };
}

// ------------------------------------------------------------------ 7. la phrase de Philippe

export function phraseFinale(): string {
  if (bilan.probleme) return "J'ai réparé presque tout, regarde la liste.";
  if (bilan.relancer) return "J'ai réparé la sauvegarde, touche Relancer pour finir.";
  if (bilan.sauvegarde) return "J'ai réparé la sauvegarde, rien n'est perdu.";
  if (bilan.fichiers) return "J'ai réparé les fichiers de l'appli.";
  if (bilan.autre) return bilan.majDispo ? "J'ai tout remis en ordre, et une mise à jour t'attend." : "J'ai tout remis en ordre.";
  return bilan.majDispo ? "Tout va bien, et une mise à jour t'attend." : "Tout va bien.";
}

export function remettreBilan() {
  Object.assign(bilan, { majDispo: false, sauvegarde: false, fichiers: false, autre: false, probleme: false, relancer: false });
}
