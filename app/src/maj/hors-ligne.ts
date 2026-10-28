// The site's offline copy and its updates (adapted from the Encyclopédie de la vie).
// A new version downloads in the background but NEVER replaces the old one by itself:
// the child sees « Nouvelle mise à jour ! » and chooses. Until then, the old version keeps working.
import { useEffect, useState } from "react";
import { HORS_LIGNE } from "./env";

export type EtatHorsLigne = { possible: boolean; majDisponible: boolean; verification: "" | "en-cours" | "a-jour" | "hors-ligne" };

let dernier: EtatHorsLigne = { possible: false, majDisponible: false, verification: "" };
const abonnes = new Set<(e: EtatHorsLigne) => void>();
let enregistrement: ServiceWorkerRegistration | null = null;

function publier(e: Partial<EtatHorsLigne>) {
  dernier = { ...dernier, ...e };
  for (const f of abonnes) f(dernier);
}

function surveiller(reg: ServiceWorkerRegistration) {
  if (reg.waiting && navigator.serviceWorker.controller) publier({ majDisponible: true });
  reg.addEventListener("updatefound", () => {
    const nouveau = reg.installing;
    nouveau?.addEventListener("statechange", () => {
      if (nouveau.state === "installed" && navigator.serviceWorker.controller) publier({ majDisponible: true });
    });
  });
}

export async function demarrerHorsLigne() {
  const inViewer = Boolean((window as unknown as { claude?: unknown }).claude);
  if (!HORS_LIGNE || inViewer || !("serviceWorker" in navigator) || location.protocol !== "https:") return;
  try {
    const avaitUneVersion = !!navigator.serviceWorker.controller;
    enregistrement = await navigator.serviceWorker.register("sw.js");
    surveiller(enregistrement);
    await navigator.serviceWorker.ready;
    publier({ possible: true });
    let recharge = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recharge || !avaitUneVersion) return;
      recharge = true;
      location.reload();
    });
    verifierMiseAJour();
    window.setInterval(() => document.visibilityState === "visible" && verifierMiseAJour(), 60 * 60 * 1000);
  } catch {
    /* no service worker: the app works, online only */
  }
}

export async function verifierMiseAJour() {
  if (!enregistrement) return;
  if (!navigator.onLine) return publier({ verification: "hors-ligne" });
  publier({ verification: "en-cours" });
  try {
    await enregistrement.update();
  } catch {
    /* we will try again */
  }
  window.setTimeout(() => {
    if (!dernier.majDisponible) publier({ verification: "a-jour" });
  }, 4000);
}

export const CLE_MAJ_WEB = "footdex.maj.web";

export function accepterMiseAJour() {
  try {
    localStorage.setItem(CLE_MAJ_WEB, "oui");
  } catch {
    /* nothing */
  }
  const enAttente = enregistrement?.waiting;
  if (enAttente) enAttente.postMessage("mettre-a-jour");
  else location.reload();
}

export function useHorsLigne() {
  const [etat, setEtat] = useState(dernier);
  useEffect(() => {
    abonnes.add(setEtat);
    setEtat(dernier);
    return () => void abonnes.delete(setEtat);
  }, []);
  return etat;
}
