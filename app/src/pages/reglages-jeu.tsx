// The parents' menu for the game numbers: cards in a pack, chances, chest, gains. Everything works offline.
import { type ReactNode, useState } from "react";
import { annulerMission, lancerMission, useMission } from "../mission";
import { RARITY } from "../cards";
import { FBX, RARITY as FRAR } from "../fbx/art";
import { ClipTest } from "../fbx/ui";
import { update, useMascot } from "../mascot/state";
import { setCoffreTout, useCoffreTout } from "./coffre";
import { DEFAUT, type Odds, regler, remettreOrigine, totalOdds, useReglages } from "../reglages-jeu";

function Nombre({ label, aide, value, min, max, step = 1, suffixe, onChange }: { label: string; aide?: string; value: number; min: number; max: number; step?: number; suffixe?: string; onChange: (n: number) => void }) {
  const id = `rg-${label.replace(/\W+/g, "")}`;
  return (
    <div className="rg__row">
      <label htmlFor={id}>
        <b>{label}</b>
        {aide ? <small>{aide}</small> : null}
      </label>
      <span className="rg__ctl">
        <button type="button" className="btn btn--soft rg__step" aria-label={`Moins : ${label}`} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}>−</button>
        <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} onChange={(e: { target: { value: string } }) => { const n = parseFloat(e.target.value.replace(",", ".")); if (isFinite(n)) onChange(Math.max(min, Math.min(max, n))); }} />
        <button type="button" className="btn btn--soft rg__step" aria-label={`Plus : ${label}`} onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}>+</button>
        {suffixe ? <span className="rg__unit">{suffixe}</span> : null}
      </span>
    </div>
  );
}

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <details className="rg__bloc">
      <summary>{titre}</summary>
      <div className="rg__body">{children}</div>
    </details>
  );
}

const NOMS: { k: keyof Odds; nom: string }[] = [
  { k: "base", nom: RARITY.base.label },
  { k: "rare", nom: RARITY.rare.label },
  { k: "eclat", nom: RARITY.eclat.label },
  { k: "legende", nom: RARITY.legende.label },
  { k: "moment", nom: RARITY.moment.label },
];

function Chances({ titre, aide, odds, onChange }: { titre: string; aide: string; odds: Odds; onChange: (o: Odds) => void }) {
  const t = totalOdds(odds);
  const pct = (n: number) => (t ? Math.round((n / t) * 1000) / 10 : 0);
  return (
    <div className="rg__odds">
      <h4>{titre}</h4>
      <p className="note">{aide}</p>
      {NOMS.map(({ k, nom }) => (
        <Nombre key={k} label={`${nom} (poids)`} aide={`= ${pct(odds[k]).toString().replace(".", ",")} % des cartes`} value={odds[k]} min={0} max={1000} step={0.1} onChange={(n) => onChange({ ...odds, [k]: n })} />
      ))}
      <p className={t > 0 ? "rg__total" : "rg__total rg__total--bad"}>
        Total : {Math.round(t * 10) / 10} {t > 0 ? "→ les pourcentages sont calculés tout seuls." : "→ mets au moins une valeur."}
      </p>
      <button type="button" className="btn btn--soft" disabled={t <= 0 || Math.abs(t - 100) < 0.05} onClick={() => onChange(Object.fromEntries(NOMS.map(({ k }) => [k, Math.round((odds[k] / t) * 1000) / 10])) as Odds)}>
        Ramener le total à 100
      </button>
    </div>
  );
}

function MissionParent() {
  const r = useReglages();
  const m = useMission();
  const [q, setQ] = useState({ type: "foot" as "foot" | "science" | "maths", q: "", a: "", b: "", c: "", bonne: 0 });
  const ok = q.q.trim() && q.a.trim() && q.b.trim();
  return (
    <>
      <p className="note">L'enfant doit répondre à 3 questions (foot, science, maths). Il a besoin du code que tu lui donnes. Le code n'est jamais écrit dans l'appli : c'est toi qui le choisis.</p>
      <div className="rg__row">
        <label htmlFor="rg-code"><b>Code de la mission</b><small>Au moins 3 caractères. Tu le donnes à l'enfant quand il vient te le demander.</small></label>
        <input id="rg-code" className="mission__code" value={r.codeMission} maxLength={12} autoComplete="off" onChange={(e: { target: { value: string } }) => regler({ codeMission: e.target.value.trim() })} />
      </div>
      <div className="chips">
        <button type="button" className="btn btn--gold" disabled={r.codeMission.length < 3 || m.en} onClick={lancerMission}>Envoyer la mission à l'enfant</button>
        {m.en ? <button type="button" className="btn btn--ghost" onClick={annulerMission}>Annuler la mission</button> : null}
      </div>
      <p className="note">{m.en ? "Une mission attend l'enfant sur son accueil." : r.codeMission.length < 3 ? "Choisis d'abord un code." : "Aucune mission envoyée pour l'instant."}</p>
      <h4>Tes propres questions ({r.questionsPerso.length})</h4>
      <p className="note">Elles s'ajoutent aux questions de l'appli. Tape la question et deux ou trois réponses, puis choisis la bonne.</p>
      <div className="chips">
        {(["foot", "science", "maths"] as const).map((t) => <button key={t} type="button" className={"chip" + (q.type === t ? " chip--on" : "")} onClick={() => setQ({ ...q, type: t })}>{t === "foot" ? "Foot" : t === "science" ? "Science" : "Maths"}</button>)}
      </div>
      <input className="mission__code" placeholder="La question" value={q.q} onChange={(e: { target: { value: string } }) => setQ({ ...q, q: e.target.value })} />
      {(["a", "b", "c"] as const).map((k, i) => (
        <div key={k} className="chips">
          <input className="mission__code" placeholder={`Réponse ${i + 1}${i === 2 ? " (facultative)" : ""}`} value={q[k]} onChange={(e: { target: { value: string } }) => setQ({ ...q, [k]: e.target.value })} />
          <button type="button" className={"chip" + (q.bonne === i ? " chip--on" : "")} onClick={() => setQ({ ...q, bonne: i })}>{q.bonne === i ? "Bonne réponse" : "C'est la bonne"}</button>
        </div>
      ))}
      <button type="button" className="btn btn--soft" disabled={!ok} onClick={() => {
        const choix = [q.a, q.b, q.c].map((x) => x.trim()).filter(Boolean);
        regler({ questionsPerso: [...r.questionsPerso, { type: q.type, q: q.q.trim(), choix, bonne: Math.min(q.bonne, choix.length - 1) }] });
        setQ({ ...q, q: "", a: "", b: "", c: "", bonne: 0 });
      }}>Ajouter cette question</button>
      {r.questionsPerso.map((x, i) => (
        <div key={i} className="chips"><span className="note">{x.type} : {x.q}</span><button type="button" className="btn btn--ghost" onClick={() => regler({ questionsPerso: r.questionsPerso.filter((_, j) => j !== i) })}>Supprimer</button></div>
      ))}
    </>
  );
}

/** Le menu développeur : chaque bouton lance l'essai tout de suite. */
export function Essais() {
  const [clipTest, setClipTest] = useState(false);
  const [msg, setMsg] = useState("");
  const m = useMascot();
  const tout = useCoffreTout();
  const lance = (quoi: string, texte: string) => { window.dispatchEvent(new CustomEvent("footdex:essai", { detail: { quoi } })); setMsg(texte); };
  return (
    <div className="rg">
      <p className="note">Chaque bouton lance l'essai tout de suite. Regarde ensuite les personnages à l'écran (ferme ce menu avec la flèche si besoin).</p>
      <div className="chips">
        <button type="button" className="btn btn--gold" onClick={() => lance("chapardeur", "Le chapardeur arrive. Touche 2 fois son trou noir pour l'attraper !")}>Tester le chapardeur</button>
        <button type="button" className="btn btn--gold" onClick={() => lance("fete", "La fête commence.")}>Tester la fête</button>
        <button type="button" className="btn btn--gold" onClick={() => setClipTest(true)}>Tester la figurine à clipser</button>
      </div>
      {msg ? <p className="note" role="status">{msg}</p> : null}
      <p className="mm__label">Le coffre</p>
      <div className="chips">
        <button type="button" className={"chip" + (!tout ? " chip--on" : "")} aria-pressed={!tout} onClick={() => setCoffreTout(false)}>Caché, comme pour l'enfant</button>
        <button type="button" className={"chip" + (tout ? " chip--on" : "")} aria-pressed={tout} onClick={() => setCoffreTout(true)}>Tout voir et tout ouvrir (essai)</button>
      </div>
      <p className="note">Pour l'enfant, le contenu du coffre reste caché : on ne le trouve qu'en ouvrant le coffre avec des pièces. Ici, tu peux tout voir et tout ouvrir gratuitement pour tester.</p>
      <p className="mm__label">Phrases des personnages</p>
      <div className="chips">
        <button type="button" className={"chip" + (!m.s.toutes ? " chip--on" : "")} aria-pressed={!m.s.toutes} onClick={() => update({ toutes: false })}>Seulement les bien audibles</button>
        <button type="button" className={"chip" + (m.s.toutes ? " chip--on" : "")} aria-pressed={m.s.toutes} onClick={() => update({ toutes: true })}>Toutes, telles qu'écrites</button>
      </div>
      <p className="note">Par défaut, la voix lit les phrases mises en forme pour la synthèse vocale (cris étirés, points de suspension, chiffres), et ne lit pas les simples bruitages. « Toutes » lit tout, tel quel.</p>
      {clipTest ? <ClipTest onClose={() => setClipTest(false)} /> : null}
    </div>
  );
}

export function ReglagesJeu() {
  const r = useReglages();
  const w = r.coffreChances;
  const wt = w.pieces + w.paquet + w.carteFbx + w.figurine + w.style;
  const wp = (n: number) => (wt ? Math.round((n / wt) * 100) : 0);
  return (
    <div className="rg">
      <p className="note">Tout se règle ici, sans connexion. Chaque réglage s'applique tout de suite. Les valeurs d'origine sont celles qu'on a validées ensemble.</p>


      <Bloc titre="Les paquets">
        <Nombre label="Cartes par paquet" aide="Entre 5 et 15. La dernière carte est toujours la meilleure." value={r.cartesParPaquet} min={5} max={15} onChange={(n) => regler({ cartesParPaquet: Math.round(n) })} />
        <Nombre label="Cartes jamais vues" aide="Part des tirages qui cherchent une carte que l'enfant n'a pas. Le reste est du pur hasard (doublons possibles)." value={r.nouvellesCartes} min={0} max={100} step={5} suffixe="%" onChange={(n) => regler({ nouvellesCartes: n })} />
        <Chances titre="Cartes 1 à la dernière −1" aide="Les cartes normales du paquet. Plus le poids est grand, plus ça sort souvent." odds={r.chancesNormal} onChange={(o) => regler({ chancesNormal: o })} />
        <Chances titre="Dernière carte (la meilleure)" aide="La carte du bout du paquet, toujours meilleure." odds={r.chancesDerniere} onChange={(o) => regler({ chancesDerniere: o })} />
      </Bloc>

      <Bloc titre="Chance garantie (contre la malchance)">
        <Nombre label="Éclat ou mieux au moins tous les" aide="0 = jamais garanti." value={r.garantieEclat} min={0} max={200} suffixe="paquets" onChange={(n) => regler({ garantieEclat: Math.round(n) })} />
        <Nombre label="Légende ou Moment au moins tous les" aide="0 = jamais garanti." value={r.garantieLegende} min={0} max={500} suffixe="paquets" onChange={(n) => regler({ garantieLegende: Math.round(n) })} />
      </Bloc>

      <Bloc titre="Cartes Footballinis (Brain Rot) dans les paquets">
        <p className="note">Une carte Footballini peut tomber d'un paquet normal. C'est rare, pour que ce soit une vraie surprise.</p>
        <Nombre label="En moyenne, une tous les" aide="0 = elles ne tombent jamais des paquets." value={r.brainRotMoyenne} min={0} max={100} suffixe="paquets" onChange={(n) => regler({ brainRotMoyenne: Math.round(n) })} />
        <Nombre label="Et au plus tard tous les" aide="Une est garantie à ce moment-là. 0 = pas de garantie." value={r.brainRotMax} min={0} max={200} suffixe="paquets" onChange={(n) => regler({ brainRotMax: Math.round(n) })} />
        <h4>Valeur d'un doublon (en pièces)</h4>
        {FRAR.map((x, i) => (
          <Nombre key={x.name} label={x.name} value={r.valeurDoublon[i]} min={0} max={1000} onChange={(n) => regler({ valeurDoublon: r.valeurDoublon.map((v, j) => (j === i ? Math.round(n) : v)) })} />
        ))}
        <p className="note">{FBX.length} Footballinis existent pour l'instant.</p>
      </Bloc>

      <Bloc titre="Le coffre au trésor">
        <Nombre label="Prix en pièces" value={r.coffreEtoiles} min={1} max={500} suffixe="🪙" onChange={(n) => regler({ coffreEtoiles: Math.round(n) })} />
        <h4>Ce qu'il y a dedans (poids)</h4>
        <Nombre label="Pièces d'or" aide={`≈ ${wp(w.pieces)} %`} value={w.pieces} min={0} max={1000} onChange={(n) => regler({ coffreChances: { ...w, pieces: n } })} />
        <Nombre label="Paquet cadeau Footdex" aide={`≈ ${wp(w.paquet)} % · de vraies cartes de l'album`} value={w.paquet} min={0} max={1000} onChange={(n) => regler({ coffreChances: { ...w, paquet: n } })} />
        <Nombre label="Carte Footballini" aide={`≈ ${wp(w.carteFbx)} % · rare`} value={w.carteFbx} min={0} max={1000} onChange={(n) => regler({ coffreChances: { ...w, carteFbx: n } })} />
        <Nombre label="Figurine" aide={`≈ ${wp(w.figurine)} %`} value={w.figurine} min={0} max={1000} onChange={(n) => regler({ coffreChances: { ...w, figurine: n } })} />
        <Nombre label="Personnage stylé" aide={`≈ ${wp(w.style)} %`} value={w.style} min={0} max={1000} onChange={(n) => regler({ coffreChances: { ...w, style: n } })} />
        {wt <= 0 ? <p className="rg__total rg__total--bad">Mets au moins une valeur : sinon le coffre donnera toujours des pièces.</p> : null}
      </Bloc>

      <Bloc titre="Les gains des jeux">
        <Nombre label="Pièces la 1re fois qu'une carte passe dans la machine" value={r.gainMachine} min={0} max={50} suffixe="🪙" onChange={(n) => regler({ gainMachine: Math.round(n) })} />
        <Nombre label="Pièces pour un jeu gagné" aide="Une fois par jour et par jeu." value={r.gainJeu} min={0} max={50} suffixe="🪙" onChange={(n) => regler({ gainJeu: Math.round(n) })} />
      </Bloc>

      <Bloc titre="La mission de Papa (carte Mbappé)">
        <MissionParent />
      </Bloc>

      <button type="button" className="btn btn--ghost" onClick={() => { if (window.confirm("Remettre tous les réglages du jeu aux valeurs d'origine ?")) remettreOrigine(); }}>
        Remettre les valeurs d'origine
      </button>
      <p className="note">Valeurs d'origine : {DEFAUT.cartesParPaquet} cartes par paquet, une Footballini en moyenne tous les {DEFAUT.brainRotMoyenne} paquets.</p>
    </div>
  );
}
