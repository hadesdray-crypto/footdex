// One journal for everything new: 🛠️ the app itself, 📊 the data (the Monday checks).
// The list is inside the app (works offline); when an update is offered, the newer list is read online.
import { useEffect, useState } from "react";
import { SITE } from "./env";

import { NOUVEAUTES, type Nouveaute } from "./nouveautes-liste";
export { NOUVEAUTES, type Nouveaute };

export function useNouveautes(actif: boolean): Nouveaute[] {
  const [liste, setListe] = useState<Nouveaute[]>(NOUVEAUTES);
  useEffect(() => {
    if (!actif || !navigator.onLine) return;
    const adresse = location.hostname.endsWith("github.io") ? "nouveautes.json" : `${SITE}nouveautes.json`;
    fetch(adresse, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((l) => Array.isArray(l) && l.length && setListe(l as Nouveaute[]))
      .catch(() => undefined);
  }, [actif]);
  return liste;
}
