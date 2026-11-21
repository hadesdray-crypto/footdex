// L'écran « Réparer l'appli » (dans Paramètres, sans code : l'enfant peut s'en servir seul),
// et la question au démarrage quand l'appli s'est mal fermée la fois d'avant.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Fig } from "../mascot/Fig";
import { CARAC } from "../mascot/caractere";
import { PERSOS } from "../mascot/lines";
import { getMascot, say, speakAs, stopTalking, useMascot } from "../mascot/state";
import { go } from "../router";
import { unlockAudio } from "../sound";
import { cx } from "../util";
import {
  type Resultat, type Statut, bilan, etapeFichiers, etapeFluidite, etapeMaj, etapeNettoyage, etapeReglages, etapeSauvegarde, phraseFinale, remettreBilan,
} from "./reparation";
import { demarrage, finLancement, marquerStable } from "./secours";

type Ligne = { id: string; titre: string; statut: Statut; texte: string };

const ETAPES: { id: string; titre: string; attente: string }[] = [
  { id: "maj", titre: "Mises à jour", attente: "Je regarde s'il y a une nouvelle version…" },
  { id: "fichiers", titre: "Fichiers de l'appli", attente: "Je vérifie que chaque fichier se lit bien…" },
  { id: "sauvegarde", titre: "Ta sauvegarde", attente: "Je compare tes sauvegardes…" },
  { id: "nettoyage", titre: "Nettoyage, voix et micro", attente: "Je range et je vérifie la voix…" },
  { id: "reglages", titre: "Réglages", attente: "Je vérifie les réglages…" },
  { id: "fluidite", titre: "Fluidité", attente: "Je mesure si l'appli est fluide (2 secondes)…" },
  { id: "resultat", titre: "Résultat", attente: "Philippe fait le bilan…" },
];

const MOTS: Record<Statut, string> = { attente: "À venir", "en-cours": "En cours", ok: "Bon", repare: "Réparé", attention: "À revoir" };

/** Demandé depuis la question du démarrage : la vérification commence toute seule. */
let lancerAuto = false;

/** Philippe parle : sa propre voix, ou la voix du personnage si c'est lui à l'écran. */
function philippeDit(texte: string) {
  const m = getMascot();
  stopTalking();
  if (PERSOS[m.s.perso].mode === "philippe") say(texte, { cut: true });
  else speakAs(texte, "philippe");
}

export function Reparation() {
  const m = useMascot();
  const [lignes, setLignes] = useState<Ligne[]>(() => ETAPES.map((e) => ({ id: e.id, titre: e.titre, statut: "attente", texte: "" })));
  const [phase, setPhase] = useState<"debut" | "en-cours" | "fini">("debut");
  const [faits, setFaits] = useState<string[]>([]);
  const [phrase, setPhrase] = useState("");
  const [parle, setParle] = useState(false);
  const enCours = useRef(false);
  const fin = useRef<HTMLDivElement | null>(null);

  const changer = (id: string, l: Partial<Ligne>) => setLignes((ls) => ls.map((x) => (x.id === id ? { ...x, ...l } : x)));

  async function lancer() {
    if (enCours.current) return;
    enCours.current = true;
    unlockAudio(); // le toucher réveille le son : Philippe pourra parler à la fin
    remettreBilan();
    setPhase("en-cours");
    setFaits([]);
    setLignes(ETAPES.map((e) => ({ id: e.id, titre: e.titre, statut: "attente", texte: "" })));
    const tous: string[] = [];
    const faire = async (id: string, f: () => Promise<Resultat>) => {
      changer(id, { statut: "en-cours", texte: ETAPES.find((e) => e.id === id)?.attente ?? "" });
      let r: Resultat;
      try {
        r = await f();
      } catch {
        r = { statut: "attention", texte: "Cette vérification n'a pas pu se faire. Le reste continue.", fait: [] };
      }
      changer(id, { statut: r.statut, texte: r.texte });
      tous.push(...r.fait);
    };
    await faire("maj", etapeMaj);
    await faire("fichiers", () => etapeFichiers((d) => changer("fichiers", { texte: `Je vérifie les fichiers… ${d}` })));
    await faire("sauvegarde", etapeSauvegarde);
    await faire("nettoyage", etapeNettoyage);
    await faire("reglages", etapeReglages);
    await faire("fluidite", etapeFluidite);
    const p = phraseFinale();
    changer("resultat", { statut: bilan.probleme ? "attention" : "ok", texte: p });
    setFaits(tous);
    setPhrase(p);
    setPhase("fini");
    enCours.current = false;
    // la question du démarrage n'a plus lieu d'être
    demarrage.plantage = false;
    window.setTimeout(() => {
      philippeDit(p);
      setParle(true);
      window.setTimeout(() => setParle(false), Math.max(2200, p.length * 75));
      fin.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }

  useEffect(() => {
    if (lancerAuto) {
      lancerAuto = false;
      void lancer();
    }
  }, []);

  const faites = lignes.filter((l) => l.statut !== "attente" && l.statut !== "en-cours").length;
  const pourcent = phase === "fini" ? 100 : Math.round((faites / ETAPES.length) * 100);
  const lookPhilippe = m.s.looks.philippe ?? CARAC.philippe.tenue;

  return (
    <div className="repar">
      <section className="sheet repar__haut">
        <Fig look={lookPhilippe} size={96} crop="bust" mouth={parle ? "open" : "flat"} talk={parle} mode="philippe" />
        <div className="repar__intro">
          {phase === "fini" ? (
            <p className="repar__phrase" role="status">{phrase}</p>
          ) : (
            <p className="repar__dit">Je vérifie toute l'appli : les mises à jour, les fichiers, ta sauvegarde, la voix et les réglages. Tu ne perds rien.</p>
          )}
        </div>
      </section>

      {phase === "debut" ? (
        <button type="button" className="btn btn--gold btn--big btn--glow repar__go" onClick={() => void lancer()}>Lancer la vérification</button>
      ) : (
        <>
          <div className="majfull__bar repar__bar" role="progressbar" aria-label="Avancement de la vérification" aria-valuenow={pourcent} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${Math.max(4, pourcent)}%` }} />
          </div>
          <p className="repar__pct">{pourcent} %</p>
        </>
      )}

      {phase !== "debut" ? (
        <ol className="repar__etapes">
          {lignes
            .filter((l) => l.statut !== "attente")
            .map((l, i) => (
              <li key={l.id} className={cx("repar__etape", `is-${l.statut}`)}>
                <span className="repar__num" aria-hidden="true">{i + 1}</span>
                <span className="repar__corps">
                  <strong>{l.titre}</strong>
                  <span>{l.texte}</span>
                </span>
                <span className="repar__mot">{MOTS[l.statut]}</span>
              </li>
            ))}
        </ol>
      ) : null}

      {phase === "fini" ? (
        <section className="sheet repar__fin" ref={fin}>
          <h2 className="sheet__title">Ce que j'ai fait</h2>
          {faits.length ? (
            <ul className="list list--compact">{faits.map((f) => <li key={f}>{f}</li>)}</ul>
          ) : (
            <p className="note">Rien à réparer : tout marchait déjà bien.</p>
          )}
          <div className="majbar__actions">
            {bilan.relancer ? (
              <button type="button" className="btn btn--gold btn--big" onClick={() => { finLancement(); location.reload(); }}>Relancer l'appli</button>
            ) : null}
            <button type="button" className={cx("btn", bilan.relancer ? "btn--soft" : "btn--gold")} onClick={() => philippeDit(phrase)}>Réécouter Philippe</button>
            <button type="button" className="btn btn--soft" onClick={() => void lancer()}>Vérifier encore</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Au démarrage : « L'appli s'est mal fermée. Veux-tu la réparer ? » (une seule fois par ouverture). */
export function ProposerReparation({ page }: { page: string }) {
  const sauvegarde = demarrage.abimeesSansCopie.length > 0 || demarrage.reparees.length > 0;
  const [ouvert, setOuvert] = useState(demarrage.plantage || sauvegarde);
  const m = useMascot();
  useEffect(() => {
    if (page === "reg-reparer") setOuvert(false);
  }, [page]);
  if (!ouvert) return null;
  const lookPhilippe = m.s.looks.philippe ?? CARAC.philippe.tenue;
  const fermer = () => {
    demarrage.plantage = false;
    setOuvert(false);
  };
  return createPortal(
    <div className="majfull" role="dialog" aria-modal="true" aria-label="Réparer l'appli">
      <div className="majfull__box majfull__box--scroll">
        <div className="majfull__scroll">
          <Fig look={lookPhilippe} size={90} crop="bust" mouth="flat" mode="philippe" />
          <p className="majfull__title">Petit souci</p>
          <p className="repar__question">{demarrage.plantage ? "L'appli s'est mal fermée. Veux-tu la réparer ?" : "Ta sauvegarde avait un souci. Veux-tu réparer l'appli ?"}</p>
          <p className="majbar__note">Tes cartes, tes pièces et tes personnages sont gardés.</p>
        </div>
        <div className="majfull__actions">
          <button type="button" className="btn btn--gold btn--big" onClick={() => { lancerAuto = true; fermer(); go({ page: "reg-reparer" }); }}>Oui</button>
          <button type="button" className="btn btn--soft btn--big" onClick={fermer}>Non</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** L'album est ouvert : 4 secondes plus tard, l'appli est stable (le drapeau du démarrage est retiré). */
let stableFait = false;
export function quandAlbumOuvert() {
  if (stableFait) return;
  stableFait = true;
  let erreur = false;
  const surErreur = () => {
    erreur = true;
  };
  window.addEventListener("error", surErreur);
  window.setTimeout(() => {
    window.removeEventListener("error", surErreur);
    if (!erreur) marquerStable();
  }, 4000);
}
