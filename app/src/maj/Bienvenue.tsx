// Premier lancement : 4 petits écrans pour comprendre l'appli. Une seule fois ; on peut le revoir dans Paramètres.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Fig } from "../mascot/Fig";
import { PERSOS } from "../mascot/lines";
import { useMascot } from "../mascot/state";

const CLE = "footdex.bienvenue.v1";
export const EVT_BIENVENUE = "footdex:bienvenue";

const ETAPES = [
  { titre: "Bienvenue dans Footdex !", texte: "Collectionne les cartes des joueurs et des clubs, et apprends plein de choses sur le football." },
  { titre: "Ouvre des paquets", texte: "Dans l'onglet des paquets, ouvre-en pour gagner de nouvelles cartes. Elles se rangent toutes seules dans ton classeur." },
  { titre: "Joue chaque jour", texte: "Le défi du jour et les jeux te donnent des pièces et des étoiles pour avoir encore plus de cartes." },
  { titre: "Ton personnage", texte: "Touche-le : il parle et il joue avec toi. Tu peux changer sa voix et ses copains dans Paramètres." },
];

export function voirBienvenue() {
  window.dispatchEvent(new Event(EVT_BIENVENUE));
}

export function Bienvenue() {
  const m = useMascot();
  const [i, setI] = useState<number | null>(null);
  useEffect(() => {
    try {
      const essai = location.search.includes("essai-terrain") || location.search.includes("essai-maj");
      if (!essai && !localStorage.getItem(CLE)) setI(0);
    } catch {
      /* nothing */
    }
    const rouvre = () => setI(0);
    window.addEventListener(EVT_BIENVENUE, rouvre);
    return () => window.removeEventListener(EVT_BIENVENUE, rouvre);
  }, []);
  // si la fenêtre de mise à jour est ouverte, on attend qu'elle soit fermée
  const [autre, setAutre] = useState(false);
  useEffect(() => {
    if (i === null) return; // nothing to show: no need to look at the page
    const t = window.setInterval(() => setAutre(!!document.querySelector('.majfull:not([aria-label="Bienvenue"])')), 300);
    return () => window.clearInterval(t);
  }, [i]);
  if (i === null || autre) return null;
  const fin = () => {
    try { localStorage.setItem(CLE, "1"); } catch { /* nothing */ }
    setI(null);
  };
  const e = ETAPES[i];
  const dernier = i === ETAPES.length - 1;
  return createPortal(
    <div className="majfull" role="dialog" aria-modal="true" aria-label="Bienvenue">
      <div className="majfull__box majfull__box--scroll">
        <div className="majfull__scroll">
          <Fig look={m.s.look} size={90} crop="bust" mouth="open" />
          <p className="majfull__title">{e.titre}</p>
          <p className="majbar__note">{e.texte}</p>
          <p className="majbar__note">{PERSOS[m.s.perso].name} · {i + 1} / {ETAPES.length}</p>
        </div>
        <div className="majfull__actions">
          <button type="button" className="btn btn--gold btn--glow" onClick={() => (dernier ? fin() : setI(i + 1))}>{dernier ? "C'est parti !" : "Suivant"}</button>
          {dernier ? null : <button type="button" className="btn btn--soft" onClick={fin}>Passer</button>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
