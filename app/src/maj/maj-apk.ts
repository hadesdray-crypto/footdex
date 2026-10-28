// (Adapted from the Encyclopédie de la vie.) Mises à jour de l'application Android, tout à l'intérieur de l'application :
// 1. elle regarde sur GitHub s'il y a une nouvelle version (seulement avec Internet) ;
// 2. on touche « Mettre à jour » : le nouveau contenu se télécharge, avec une barre ;
// 3. « Redémarrer » : l'application se relance toute seule et dit « Mise à jour terminée ».
// Rien d'autre ne s'ouvre. Rien ne se fait sans qu'on l'ait demandé.
import { useEffect, useState } from "react";
import { appeler, ecouter, moduleDisponible } from "../natif";
import { DEPOT, EST_APK, LIEN_APK, VERSION_APK } from "./env";

const API = "https://api.github.com/repos/hadesdray-crypto/footdex/releases/latest";
const CLE_TERMINEE = "footdex.maj.apk";

type Bundle = { id: string; version: string };
const UPD = "CapacitorUpdater";
function updater() {
  if (!moduleDisponible(UPD)) return undefined;
  return {
    notifyAppReady: () => appeler(UPD, "notifyAppReady"),
    download: (o: { url: string; version: string; checksum: string }) => appeler<Bundle>(UPD, "download", o),
    set: (o: { id: string }) => appeler<void>(UPD, "set", o),
    addListener: (evt: string, f: (e: { percent: number }) => void) => ecouter(UPD, evt, f as (d: never) => void),
  };
}

export type EtatMaj = {
  nouvelle: number | null;
  phase: "rien" | "propose" | "telechargement" | "pret" | "erreur" | "termine";
  pourcent: number;
  verification: "" | "en-cours" | "a-jour" | "hors-ligne" | "erreur";
  taille: number; // poids du téléchargement, en Mo (0 = inconnu)
  detail: string; // la raison d'une erreur, pour comprendre ce qui bloque
};

let etat: EtatMaj = { nouvelle: null, phase: "rien", pourcent: 0, verification: "", taille: 0, detail: "" };
// L'empreinte (SHA-256) du paquet : le module de mise à jour la demande pour vérifier que le fichier est intact.
let empreinte = "";
let bundle: Bundle | null = null;
const abonnes = new Set<(e: EtatMaj) => void>();
function publier(e: Partial<EtatMaj>) {
  etat = { ...etat, ...e };
  abonnes.forEach((f) => f(etat));
}

export function useMajApk() {
  const [e, setE] = useState(etat);
  useEffect(() => {
    abonnes.add(setE);
    setE(etat);
    return () => {
      abonnes.delete(setE);
    };
  }, []);
  return e;
}

export async function verifierApk() {
  if (!EST_APK || etat.phase === "telechargement" || etat.phase === "pret") return;
  // On n'écoute pas « navigator.onLine » : sur certains téléphones, il dit « pas de connexion »
  // alors qu'Internet marche. On essaie vraiment, et on attend au plus 15 secondes.
  publier({ verification: "en-cours" });
  try {
    const arret = new AbortController();
    const minuteur = window.setTimeout(() => arret.abort(), 15000);
    const r = await fetch(API, { cache: "no-store", signal: arret.signal });
    window.clearTimeout(minuteur);
    if (!r.ok) throw new Error(String(r.status));
    const rel = await r.json();
    const n = Number(String(rel.tag_name || "").replace(/\D/g, ""));
    const zip = (rel.assets ?? []).find((a: { name: string }) => a.name === "web.zip");
    const taille = zip ? Math.round(zip.size / 1048576) : 0;
    // GitHub donne l'empreinte de chaque fichier (« sha256:… ») ; sinon, elle est écrite dans les notes de la version.
    empreinte = String(zip?.digest || "").replace(/^sha256:/, "") || (String(rel.body || "").match(/web\.zip sha256 : ([0-9a-f]{64})/)?.[1] ?? "");
    if (n > VERSION_APK) publier({ nouvelle: n, taille, phase: etat.phase === "termine" ? "termine" : "propose", verification: "" });
    else publier({ verification: "a-jour" });
  } catch {
    publier({ verification: navigator.onLine ? "erreur" : "hors-ligne" });
  }
}

/** « Mettre à jour » : on télécharge le nouveau contenu, dans l'application. */
export async function lancerMajApk() {
  const u = updater();
  const n = etat.nouvelle;
  if (!n) return;
  if (!u) {
    // Ancienne application sans le module de mise à jour : il faut la réinstaller une fois.
    window.location.href = LIEN_APK;
    return;
  }
  if (!empreinte) await verifierApk();
  publier({ phase: "telechargement", pourcent: 0, detail: "" });
  const arreter = await u.addListener("download", (e) => publier({ pourcent: Math.max(0, Math.min(100, Math.round(e.percent))) }));
  try {
    bundle = await u.download({ url: `${DEPOT}/releases/download/android-${n}/web.zip`, version: String(n), checksum: empreinte.toLowerCase() });
    publier({ phase: "pret", pourcent: 100 });
  } catch (e) {
    publier({ phase: "erreur", detail: e instanceof Error ? e.message : String(e) });
  } finally {
    arreter();
  }
}

/** « Redémarrer » : l'application se relance avec la nouvelle version. */
export async function redemarrerApk() {
  const u = updater();
  if (!u || !bundle) return;
  try {
    localStorage.setItem(CLE_TERMINEE, String(etat.nouvelle));
  } catch {
    /* rien */
  }
  await u.set({ id: bundle.id });
}

export function fermerMaj() {
  publier({ phase: "rien" });
}

export function telechargerApk() {
  window.location.href = LIEN_APK;
}

export function demarrerMajApk() {
  if (!EST_APK) return;
  // Dire au module que cette version démarre bien (sinon il revient à l'ancienne, par sécurité).
  updater()?.notifyAppReady().catch(() => {});
  try {
    const terminee = Number(localStorage.getItem(CLE_TERMINEE));
    if (terminee && terminee === VERSION_APK) {
      localStorage.removeItem(CLE_TERMINEE);
      publier({ phase: "termine" });
    }
  } catch {
    /* rien */
  }
  verifierApk();
  window.addEventListener("online", () => verifierApk());
  // On regarde aussi quand on revient dans l'application, et toutes les 30 minutes.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") verifierApk();
  });
  window.setInterval(() => verifierApk(), 30 * 60 * 1000);
}
