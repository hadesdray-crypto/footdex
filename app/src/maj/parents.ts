// The parents' corner: what needs internet is off until an adult turns it on (from the Encyclopédie de la vie).
import { useEffect, useState } from "react";
import { say } from "../mascot/state";
import { storageGet, storageSet } from "../util";

const CLE = "footdex.parents.internet";
const abonnes = new Set<(v: boolean) => void>();
export const internetPermis = () => storageGet(CLE) === "oui";
export function permettreInternet(oui: boolean) {
  storageSet(CLE, oui ? "oui" : "non");
  abonnes.forEach((f) => f(oui));
}
export function useInternetPermis() {
  const [v, setV] = useState(internetPermis);
  useEffect(() => {
    abonnes.add(setV);
    return () => void abonnes.delete(setV);
  }, []);
  return v;
}

/** YouTube buttons and other links that leave the app: blocked until an adult allows them. */
export function garderLesLiensExternes() {
  document.addEventListener(
    "click",
    (ev) => {
      const a = (ev.target as Element | null)?.closest?.("a[href^='http']") as HTMLAnchorElement | null;
      if (!a || internetPermis()) return;
      try {
        if (new URL(a.href).hostname === location.hostname) return;
      } catch {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      say("Ça, c'est sur Internet. Un adulte peut l'allumer dans le Coin des parents, dans « Plus ».");
    },
    true,
  );
}

/** A multiplication only an adult will answer: a different one each time. */
export function questionAdulte(): [number, number] {
  return [12 + Math.floor(Math.random() * 8), 6 + Math.floor(Math.random() * 4)];
}
