// « Papa te propose une mission » (3 questions → a special card). The card machine is in machine.tsx.
import { useState } from "react";
import { type Album } from "../data";
import { fanfare, click } from "../sound";
import { say } from "../mascot/state";
import { PageTitle, Section } from "../ui/bits";
import { cx } from "../util";
import { CARTES_SPECIALES, codeValide, gagnerMission, tirerQuestions, useMission, type Q } from "../mission";
import { useReglages } from "../reglages-jeu";
import { go } from "../router";

type Etape = "intro" | "code" | "quiz" | "gagne" | "rate";

export function Mission() {
  const m = useMission();
  const r = useReglages();
  const [etape, setEtape] = useState<Etape>("intro");
  const [saisi, setSaisi] = useState("");
  const [erreur, setErreur] = useState("");
  const [qs, setQs] = useState<Q[]>(() => tirerQuestions());
  const [i, setI] = useState(0);
  const [choix, setChoix] = useState<number | null>(null);

  if (!m.en && etape !== "gagne") {
    return (
      <div>
        <PageTitle kicker="Mission" title="Mission de Papa" />
        <p className="note">Pas de mission pour l'instant. Quand ton père t'en propose une, un message apparaît sur l'accueil.</p>
        {m.gagnees.length ? <Gagnees /> : null}
      </div>
    );
  }
  const q = qs[i];
  const recommencer = () => {
    setQs(tirerQuestions());
    setI(0);
    setChoix(null);
    setEtape("quiz");
  };
  return (
    <div className="mission">
      <PageTitle kicker="Mission" title="Une mission pour toi !" />
      {etape === "intro" ? (
        <Section>
          <div className="mission__box">
            <p className="mission__big">📩 Ton père te propose une mission.</p>
            <p>Réponds juste à 3 questions : une sur le foot, une de science et une de maths. Si tu réussis, tu gagnes la carte <b>Mbappé</b> spéciale !</p>
            <div className="chips">
              <button type="button" className="btn btn--gold btn--big btn--glow" onClick={() => { click("button"); setEtape("code"); }}>J'accepte la mission</button>
              <button type="button" className="btn btn--ghost" onClick={() => go({ page: "accueil" })}>Pas maintenant</button>
            </div>
          </div>
        </Section>
      ) : null}
      {etape === "code" ? (
        <Section>
          <div className="mission__box">
            <p className="mission__big">🔑 Demande le code de la mission à ton père.</p>
            {!r.codeMission.trim() ? <p className="note">Papa n'a pas encore choisi de code : il doit le faire dans Réglages, « Pour les grands », « Réglages du jeu ».</p> : null}
            <input className="mission__code" value={saisi} aria-label="Code de la mission" inputMode="text" autoComplete="off" maxLength={12} onChange={(e: { target: { value: string } }) => { setSaisi(e.target.value); setErreur(""); }} />
            {erreur ? <p className="rg__total rg__total--bad">{erreur}</p> : null}
            <div className="chips">
              <button type="button" className="btn btn--gold btn--big" onClick={() => {
                if (codeValide(saisi)) { click("button"); setSaisi(""); recommencer(); } else setErreur("Ce n'est pas le bon code. Demande-le à ton père.");
              }}>Commencer la mission</button>
              <button type="button" className="btn btn--ghost" onClick={() => setEtape("intro")}>Retour</button>
            </div>
          </div>
        </Section>
      ) : null}
      {etape === "quiz" && q ? (
        <Section title={`Question ${i + 1} sur 3`} kicker={q.type === "foot" ? "Football" : q.type === "science" ? "Science du ballon" : "Maths"}>
          <div className="mission__box">
            <div className="mission__visuel" aria-hidden="true">{q.visuel}</div>
            <p className="mission__big">{q.q}</p>
            <div className="mission__choix">
              {q.choix.map((c, k) => (
                <button key={c} type="button" disabled={choix !== null}
                  className={cx("btn", "btn--soft", choix !== null && k === q.bonne && "mission__ok", choix === k && k !== q.bonne && "mission__ko")}
                  onClick={() => setChoix(k)}>{c}</button>
              ))}
            </div>
            {choix !== null ? (
              <>
                <p className={choix === q.bonne ? "rg__total" : "rg__total rg__total--bad"}>{choix === q.bonne ? "Bravo, c'est juste !" : "Pas tout à fait…"} {q.explication}</p>
                <button type="button" className="btn btn--gold btn--big" onClick={() => {
                  if (choix !== q.bonne) { setEtape("rate"); setChoix(null); return; }
                  if (i + 1 < qs.length) { setI(i + 1); setChoix(null); } else { gagnerMission("mbappe"); fanfare("legende"); say("Mission réussie ! Tu as gagné la carte Mbappé !"); setEtape("gagne"); }
                }}>{choix === q.bonne ? (i + 1 < qs.length ? "Question suivante" : "Terminer la mission") : "Continuer"}</button>
              </>
            ) : null}
          </div>
        </Section>
      ) : null}
      {etape === "rate" ? (
        <Section>
          <div className="mission__box">
            <p className="mission__big">Presque ! La mission reste ouverte.</p>
            <p>Tu peux réessayer tout de suite avec de nouvelles questions.</p>
            <div className="chips">
              <button type="button" className="btn btn--gold btn--big" onClick={recommencer}>Réessayer</button>
              <button type="button" className="btn btn--ghost" onClick={() => go({ page: "accueil" })}>Plus tard</button>
            </div>
          </div>
        </Section>
      ) : null}
      {etape === "gagne" ? (
        <Section>
          <div className="mission__box mission__win">
            <p className="mission__big">🎉 Mission réussie !</p>
            <div className="speccard"><b>{CARTES_SPECIALES.mbappe.nom}</b><span>{CARTES_SPECIALES.mbappe.sous}</span></div>
            <p>Mets-la dans la machine à secrets pour découvrir plein d'anecdotes sur Mbappé.</p>
            <button type="button" className="btn btn--gold btn--big btn--glow" onClick={() => go({ page: "machine" })}>Aller à la machine</button>
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Gagnees() {
  const m = useMission();
  return (
    <Section title="Mes cartes spéciales">
      <div className="chips">{m.gagnees.map((id) => <span key={id} className="speccard"><b>{CARTES_SPECIALES[id]?.nom ?? id}</b><span>{CARTES_SPECIALES[id]?.sous}</span></span>)}</div>
    </Section>
  );
}
