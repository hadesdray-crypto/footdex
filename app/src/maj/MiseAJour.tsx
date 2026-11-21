// The guided update (from the Encyclopédie de la vie), told by Footdex's own character:
// « Nouvelle mise à jour ! » → Mettre à jour → loading bar → Redémarrer → « Mise à jour terminée ! »
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Fig } from "../mascot/Fig";
import { PERSOS } from "../mascot/lines";
import { useMascot } from "../mascot/state";
import { fanfare } from "../sound";
import { EST_APK, VERSION_APK } from "./env";
import { prendreCopie } from "./secours";
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

  // « ?essai-maj » in the address shows the window, to check how it looks
  const essai = typeof location !== "undefined" && location.search.includes("essai-maj") && webPhase === "rien";
  const phase = essai ? "propose" : EST_APK ? apk.phase : webPhase === "rien" && web.majDisponible ? "propose" : webPhase;
  const liste = useNouveautes(phase === "propose" || phase === "termine");
  const derniere = liste.find((n) => n.type === "appli") ?? liste[0];
  // Tout ce qui est nouveau depuis la version du téléphone (au plus 4 versions), sinon la dernière nouveauté.
  const numero = (t: string) => Number(/Version (\d+)/.exec(t)?.[1] ?? 0);
  const depuis = EST_APK ? liste.filter((n) => n.type === "appli" && numero(n.titre) > VERSION_APK).slice(0, 4) : [];
  const nouveautes = depuis.length ? depuis : derniere ? [derniere] : [];

  useEffect(() => {
    if (phase === "termine") fanfare("legende");
  }, [phase]);

  // « Réparer l'appli » rouvre la fenêtre, même après « Plus tard ».
  useEffect(() => {
    const f = () => setPlusTard(false);
    window.addEventListener("footdex:maj-reproposer", f);
    return () => window.removeEventListener("footdex:maj-reproposer", f);
  }, []);

  // Le chargement est fini : l'appli se relance toute seule (le bouton reste là si elle ne le fait pas).
  useEffect(() => {
    if (phase !== "pret") return;
    const t = window.setTimeout(() => (EST_APK ? void redemarrerApk() : accepterMiseAJour()), 1500);
    return () => window.clearTimeout(t);
  }, [phase]);

  function accepter() {
    void prendreCopie("auto"); // une copie de secours de la progression, juste avant
    if (EST_APK) void lancerMajApk();
    else setWebPhase("pret");
  }

  if (phase === "rien" || (phase === "propose" && plusTard)) return null;

  if (phase === "propose") {
    return createPortal(
      <div className="majfull" role="dialog" aria-modal="true" aria-label="Nouvelle mise à jour">
        <div className="majfull__box majfull__box--scroll">
          <div className="majfull__scroll">
            <Fig look={m.s.look} size={90} crop="bust" mouth="open" />
            <p className="majfull__title">Nouvelle mise à jour !</p>
            {nouveautes.length ? <p className="majbar__note">Voici ce qui est nouveau :</p> : null}
            {nouveautes.map((n) => (
              <div key={n.date + n.titre} className="majfull__nouveau">
                <p className="majbar__note"><strong>{n.titre}</strong></p>
                <ul className="majbar__list">
                  {n.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
            ))}
            <p className="majbar__note">Tes cartes, tes pièces et ton classeur sont gardés.</p>
            {EST_APK && apk.taille ? <p className="majbar__note"><strong>Téléchargement : environ {apk.taille} Mo. Mieux avec le Wi-Fi.</strong></p> : null}
          </div>
          <div className="majfull__ask">
            <p className="majfull__q">Tu veux la faire ?</p>
            <div className="majfull__actions">
              <button type="button" className="btn btn--gold btn--big btn--glow" onClick={accepter}>OK</button>
              <button type="button" className="btn btn--soft btn--big" onClick={() => setPlusTard(true)}>Plus tard</button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="majfull" role="dialog" aria-modal="true" aria-label="Mise à jour">
      <div className="majfull__box majfull__box--long">
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
            <p>L'application se relance toute seule. Si rien ne se passe, touche le bouton.</p>
            <button type="button" className="btn btn--gold btn--big" onClick={() => (EST_APK ? redemarrerApk() : accepterMiseAJour())}>Relancer maintenant</button>
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
