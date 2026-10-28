// The guided update (from the Encyclopédie de la vie), told by Footdex's own character:
// « Nouvelle mise à jour ! » → Mettre à jour → loading bar → Redémarrer → « Mise à jour terminée ! »
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Fig } from "../mascot/Fig";
import { PERSOS } from "../mascot/lines";
import { useMascot } from "../mascot/state";
import { fanfare } from "../sound";
import { EST_APK } from "./env";
import { CLE_MAJ_WEB, accepterMiseAJour, useHorsLigne } from "./hors-ligne";
import { fermerMaj, lancerMajApk, redemarrerApk, telechargerApk, useMajApk } from "./maj-apk";
import { useNouveautes } from "./nouveautes";

export function MiseAJour() {
  const web = useHorsLigne();
  const apk = useMajApk();
  const m = useMascot();
  const perso = PERSOS[m.s.perso];
  const [plusTard, setPlusTard] = useState(false);
  const [webPhase, setWebPhase] = useState<"rien" | "pret" | "termine">("rien");

  useEffect(() => {
    try {
      if (!EST_APK && localStorage.getItem(CLE_MAJ_WEB) === "oui") {
        localStorage.removeItem(CLE_MAJ_WEB);
        setWebPhase("termine");
      }
    } catch {
      /* nothing */
    }
  }, []);

  const phase = EST_APK ? apk.phase : webPhase === "rien" && web.majDisponible ? "propose" : webPhase;
  const liste = useNouveautes(phase === "propose" || phase === "termine");
  const derniere = liste.find((n) => n.type === "appli") ?? liste[0];

  useEffect(() => {
    if (phase === "termine") fanfare("legende");
  }, [phase]);

  if (phase === "rien" || (phase === "propose" && plusTard)) return null;

  if (phase === "propose") {
    return createPortal(
      <div className="majbar" role="dialog" aria-label="Nouvelle mise à jour">
        <div className="majbar__head">
          <Fig look={m.s.look} size={52} crop="bust" mouth="open" />
          <p className="majbar__title">Nouvelle mise à jour !</p>
        </div>
        {derniere ? (
          <ul className="majbar__list">
            {derniere.points.map((p) => <li key={p}>{p}</li>)}
          </ul>
        ) : null}
        <p className="majbar__note">Tes cartes, tes étoiles et ton classeur sont gardés.</p>
        {EST_APK && apk.taille ? <p className="majbar__note"><strong>Téléchargement : environ {apk.taille} Mo. Mieux avec le Wi-Fi.</strong></p> : null}
        <div className="majbar__actions">
          <button type="button" className="btn btn--gold btn--glow" onClick={() => (EST_APK ? lancerMajApk() : setWebPhase("pret"))}>Mettre à jour</button>
          <button type="button" className="btn btn--soft" onClick={() => setPlusTard(true)}>Plus tard</button>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="majfull" role="dialog" aria-modal="true" aria-label="Mise à jour">
      <div className="majfull__box">
        <Fig look={m.s.look} size={110} crop="bust" mouth={phase === "erreur" ? "flat" : "open"} talk={phase === "telechargement"} cheer={phase === "termine"} mode={perso.mode} />
        {phase === "telechargement" ? (
          <>
            <p className="majfull__title">Chargement…</p>
            <p>Laisse l'application ouverte.</p>
            <div className="majfull__bar" role="progressbar" aria-valuenow={apk.pourcent} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${Math.max(4, apk.pourcent)}%` }} />
            </div>
            <p className="majfull__pct">{apk.pourcent} %</p>
          </>
        ) : null}
        {phase === "pret" ? (
          <>
            <p className="majfull__title">C'est prêt !</p>
            <div className="majfull__bar is-done"><span style={{ width: "100%" }} /></div>
            <p>Touche le bouton : l'application va se relancer toute seule.</p>
            <button type="button" className="btn btn--gold btn--big" onClick={() => (EST_APK ? redemarrerApk() : accepterMiseAJour())}>Redémarrer l'application</button>
          </>
        ) : null}
        {phase === "erreur" ? (
          <>
            <p className="majfull__title">Oups !</p>
            <p>Le chargement s'est arrêté, peut-être à cause d'Internet. Ton application n'a pas changé : tout marche comme avant.</p>
            {apk.detail ? <p className="majfull__small">Raison : {apk.detail}</p> : null}
            <div className="majbar__actions">
              <button type="button" className="btn btn--gold" onClick={() => lancerMajApk()}>Réessayer</button>
              <button type="button" className="btn btn--soft" onClick={() => fermerMaj()}>Plus tard</button>
            </div>
            <button type="button" className="btn btn--soft" onClick={() => telechargerApk()}>Installer la version complète</button>
            <p className="majfull__small">Un grand fichier se télécharge : ouvre-le, puis touche « Mettre à jour ». Tes cartes et tes réglages sont gardés.</p>
          </>
        ) : null}
        {phase === "termine" ? (
          <>
            <p className="majfull__title">Mise à jour terminée !</p>
            {derniere ? (
              <ul className="majbar__list">
                {derniere.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            ) : null}
            <button type="button" className="btn btn--gold btn--big" onClick={() => (EST_APK ? fermerMaj() : setWebPhase("rien"))}>Super !</button>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
