// When today's screen time is over, the character says it gently, each in his own way (from the Encyclopédie de la vie).
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Fig } from "../mascot/Fig";
import { PERSOS, type Mode } from "../mascot/lines";
import { say, stopTalking, useMascot } from "../mascot/state";
import { questionAdulte } from "./parents";
import { encoreDuTemps, marquerPrevenu, sansLimiteAujourdhui, useTempsEcran } from "./temps-ecran";

const FIN: Record<Mode, string> = {
  statue: "Hm. Assez d'écran pour aujourd'hui. Dehors, un vrai ballon t'attend. À demain.",
  poli: "Si tu le permets, Raphaël : c'est la fin du temps d'écran pour aujourd'hui. Un peu de foot dehors ? À demain !",
  pointu: "D'après les chiffres, un joueur progresse surtout en jouant. On éteint l'écran et on va s'entraîner dehors ? À demain, Raphaël !",
  joueur: "Coup de sifflet final pour l'écran ! Allez, on va jongler dehors avec un vrai ballon ! À demain !",
  excite: "C'EST LA MI-TEMPS DE L'ÉCRAN, Raphaël ! Le vrai match se joue dehors ! On y va ? À demain !",
};
const BIENTOT: Record<Mode, string> = {
  statue: "Hm. Encore un petit moment.",
  poli: "Encore dix minutes, Raphaël, et l'arbitre sifflera la fin.",
  pointu: "Il reste environ dix minutes d'écran aujourd'hui.",
  joueur: "Encore dix minutes, et on ira jouer dehors !",
  excite: "Plus que dix minutes ! Après, on fonce dehors !",
};
const enPartie = () => document.body.hasAttribute("data-jeu");

export function TempsEcran() {
  const e = useTempsEcran();
  const m = useMascot();
  const mode = PERSOS[m.s.perso].mode;
  useEffect(() => {
    if (!e.prevenir) return;
    marquerPrevenu();
    say(BIENTOT[mode]);
  }, [e.prevenir]);
  const montrer = e.fini && !enPartie();
  useEffect(() => {
    if (!montrer) return;
    stopTalking();
    const t = window.setTimeout(() => say(FIN[mode]), 600);
    return () => window.clearTimeout(t);
  }, [montrer]);
  if (!montrer) return null;
  return createPortal(<Repos mode={mode} />, document.body);
}

function Repos({ mode }: { mode: Mode }) {
  const m = useMascot();
  const [adulte, setAdulte] = useState(false);
  const [rep, setRep] = useState("");
  const [a, b] = useMemo(questionAdulte, []);
  const bon = rep.trim() === String(a * b);
  return (
    <div className="majfull" role="dialog" aria-modal="true" aria-label="Temps d'écran terminé">
      <div className="majfull__box">
        <Fig look={m.s.look} size={120} crop="full" mouth="smile" cheer mode={mode} />
        <p className="majfull__title">C'est l'heure d'aller dehors !</p>
        <p>{FIN[mode]}</p>
        <button type="button" className="btn btn--soft" onClick={() => say(FIN[mode])}>Écouter</button>
        <div className="parents__lock">
          {!adulte ? (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setAdulte(true)}>Pour un adulte</button>
          ) : (
            <>
              <label>Pour un adulte : combien font {a} × {b} ?
                <input inputMode="numeric" value={rep} onChange={(ev: { target: { value: string } }) => setRep(ev.target.value)} />
              </label>
              {bon ? (
                <div className="majbar__actions">
                  <button type="button" className="btn btn--gold" onClick={() => encoreDuTemps(15)}>15 min de plus</button>
                  <button type="button" className="btn btn--gold" onClick={() => encoreDuTemps(30)}>30 min de plus</button>
                  <button type="button" className="btn btn--soft" onClick={() => sansLimiteAujourdhui()}>Sans limite aujourd'hui</button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
