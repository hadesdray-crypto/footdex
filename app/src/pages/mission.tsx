// « Papa te propose une mission » (3 questions → a special card) and the card machine (secrets, anecdotes, videos).
import { useState } from "react";
import { type Album } from "../data";
import { fanfare, click } from "../sound";
import { say } from "../mascot/state";
import { gagnerEtoiles, useStore } from "../store";
import { PageTitle, Section } from "../ui/bits";
import { cx, youtubeSearch } from "../util";
import { CARTES_SPECIALES, SECRETS, codeValide, gagnerMission, marquerMachine, tirerQuestions, useMission, type Q } from "../mission";
import { reglages, useReglages } from "../reglages-jeu";
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
            {!r.codeMission.trim() ? <p className="note">Papa n'a pas encore choisi de code : il doit le faire dans le Coin des parents.</p> : null}
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

/** The card machine: put a card in, and the secrets come out. Special cards have the juiciest ones. */
export function Machine({ album }: { album: Album }) {
  const st = useStore();
  const m = useMission();
  const [sel, setSel] = useState<string | null>(null);
  const [phase, setPhase] = useState<"choix" | "marche" | "sortie">("choix");
  const owned = album.album.filter((p) => st.cards[`a:${p.id}`]).slice(0, 80);
  const nom = sel?.startsWith("s:") ? CARTES_SPECIALES[sel.slice(2)]?.nom ?? "" : album.byId.get(sel?.slice(2) ?? "")?.display ?? "";
  const joueur = sel?.startsWith("a:") ? album.byId.get(sel.slice(2)) : undefined;
  const secrets = sel?.startsWith("s:") ? SECRETS[sel.slice(2)] ?? [] : [];

  function mettre(id: string) {
    setSel(id);
    setPhase("marche");
    click("button");
    window.setTimeout(() => {
      setPhase("sortie");
      fanfare("rare");
      if (marquerMachine(id)) {
        const g = reglages().gainMachine;
        if (g > 0) { gagnerEtoiles(g); say(`Première fois dans la machine : +${g} pièces !`); }
      }
    }, 1800);
  }

  return (
    <div className="machine">
      <PageTitle kicker="Découvre" title="La machine à secrets">Glisse une carte dans la machine : des anecdotes et des vidéos en plus, et des secrets pour les cartes spéciales.</PageTitle>
      {phase === "choix" ? (
        <>
          {m.gagnees.length ? (
            <Section title="Cartes spéciales" kicker="Gagnées en mission">
              <div className="chips">{m.gagnees.map((id) => <button key={id} type="button" className="speccard" onClick={() => mettre(`s:${id}`)}><b>{CARTES_SPECIALES[id]?.nom ?? id}</b><span>Mettre dans la machine</span></button>)}</div>
            </Section>
          ) : null}
          <Section title="Mes cartes" kicker="Touche une carte">
            {owned.length ? (
              <div className="chips">{owned.map((p) => <button key={p.id} type="button" className="chip" onClick={() => mettre(`a:${p.id}`)}>{p.display}</button>)}</div>
            ) : (
              <p className="note">Tu n'as pas encore de carte de joueur. Ouvre un paquet pour en gagner !</p>
            )}
          </Section>
        </>
      ) : null}
      {phase === "marche" ? <div className="machine__run" role="status"><div className="machine__box" aria-hidden="true">⚙️</div><p className="mission__big">La machine lit la carte « {nom} »…</p></div> : null}
      {phase === "sortie" ? (
        <Section title={nom} kicker="Ce que la machine a trouvé">
          {secrets.map((x) => (
            <article key={x.titre} className="journal__item"><h3>{x.titre}</h3><p>{x.texte}</p></article>
          ))}
          {joueur?.anecdotes.map((x) => (
            <article key={x.title} className="journal__item"><h3>{x.title}</h3><p>{x.text}</p></article>
          ))}
          {joueur ? <a className="btn btn--pitch" href={youtubeSearch(joueur.videoQuery)} target="_blank" rel="noreferrer">▶ Voir des vidéos (il faut internet)</a> : null}
          {!secrets.length && !joueur?.anecdotes.length ? <p className="note">Cette carte n'a pas encore de secret. D'autres arrivent bientôt !</p> : null}
          <div className="chips">
            <button type="button" className="btn btn--gold" onClick={() => { setPhase("choix"); setSel(null); }}>Mettre une autre carte</button>
            <span className="note">{m.machine.length} carte(s) déjà passées dans la machine.</span>
          </div>
        </Section>
      ) : null}
    </div>
  );
}
