// « L'atelier des personnages » (behind the parents' code): how much each character talks, whether he walks about,
// whether he can be thrown; the injuries; how the Referee and the Doctor behave.
import { useEffect, useState } from "react";
import { cx } from "../util";
import { Fig } from "./Fig";
import { PERSOS } from "./lines";
import { CARAC } from "./caractere";
import { interOf, setInter, setInterOf, setZopt, useMascot, type PersoInter } from "./state";
import { heal, onWounds, wounds } from "./wounds";

const TALK = ["Muet", "Peu", "Normal", "Beaucoup"] as const;

function Chips<T extends string | number | boolean>({ value, items, onPick, label }: { value: T; items: { v: T; t: string }[]; onPick: (v: T) => void; label: string }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {items.map((it) => (
        <button key={String(it.v)} type="button" role="radio" aria-checked={value === it.v} className={cx("chip", value === it.v && "chip--on")} onClick={() => onPick(it.v)}>{it.t}</button>
      ))}
    </div>
  );
}
const yesNo = [{ v: true, t: "Oui" }, { v: false, t: "Non" }];

export function Atelier() {
  const m = useMascot();
  const [w, setW] = useState(wounds);
  useEffect(() => onWounds(() => setW(wounds())), []);
  const it = m.s.inter;
  const hurt = w.b > 0 || w.legA || w.legB || w.arm;
  return (
    <div className="atelier">
      <p className="mm__label">Chaque personnage</p>
      {PERSOS.map((p) => {
        const pi: PersoInter = interOf(p.mode);
        return (
          <div key={p.mode} className="atelier__row">
            <div className="atelier__who">
              <Fig look={m.s.looks[p.mode] ?? CARAC[p.mode].tenue} size={44} crop="bust" mouth={p.mouth} />
              <strong>{p.name}</strong>
            </div>
            <p className="atelier__q">Il parle et bouge tout seul :</p>
            <Chips label="Combien il parle" value={pi.talk} items={TALK.map((t, i) => ({ v: i as PersoInter["talk"], t }))} onPick={(v) => setInterOf(p.mode, { talk: v })} />
            <p className="atelier__q">Il se promène sur l'écran :</p>
            <Chips label="Il se promène" value={pi.wander} items={yesNo} onPick={(v) => setInterOf(p.mode, { wander: v })} />
            <p className="atelier__q">On peut le lancer avec le doigt :</p>
            <Chips label="On peut le lancer" value={pi.throwable} items={yesNo} onPick={(v) => setInterOf(p.mode, { throwable: v })} />
          </div>
        );
      })}

      <p className="mm__label">Les blessures (Médecin, bandages, plâtres)</p>
      <Chips label="Blessures" value={it.injuries} items={yesNo} onPick={(v) => setInter({ injuries: v })} />
      <p className="mm__label">Le Médecin</p>
      <Chips label="Le Médecin" value={it.docFast} items={[{ v: false, t: "Prend son temps" }, { v: true, t: "Pressé" }]} onPick={(v) => setInter({ docFast: v })} />
      <button type="button" className="btn btn--soft" disabled={!hurt} onClick={heal}>{hurt ? "🩹 Soigner le personnage tout de suite" : "Le personnage n'est pas blessé"}</button>

      <p className="mm__label">L'Arbitre carré passe sur le terrain</p>
      <Chips label="Visites de l'Arbitre" value={it.refVisits} items={yesNo} onPick={(v) => setInter({ refVisits: v })} />
      <p className="mm__label">Son caractère</p>
      <Chips label="Caractère de l'Arbitre" value={it.refMood} items={[{ v: 0, t: "Gentil (pas de carton)" }, { v: 1, t: "Normal" }, { v: 2, t: "Sévère" }]} onPick={(v) => setInter({ refMood: v as 0 | 1 | 2 })} />
    </div>
  );
}

/** « Le Zombie » : how he plays with the others. */
export function ZombieOptions() {
  const m = useMascot();
  const z = m.s.zopt;
  return (
    <div className="atelier">
      <p className="atelier__q">Il perd sa tête et ses bras quand on le lance fort :</p>
      <Chips label="Il perd ses membres" value={z.limbs} items={yesNo} onPick={(v) => setZopt({ limbs: v })} />
      <p className="atelier__q">Les autres ont peur de lui :</p>
      <Chips label="La peur" value={z.fear} items={[{ v: 2, t: "Très peur" }, { v: 1, t: "Un peu" }, { v: 0, t: "Pas du tout" }]} onPick={(v) => setZopt({ fear: v as 0 | 1 | 2 })} />
      <p className="atelier__q">Il poursuit les autres :</p>
      <Chips label="La poursuite" value={z.chase} items={yesNo} onPick={(v) => setZopt({ chase: v })} />
      <p className="atelier__q">Sa tête tombe quand le ballon le touche :</p>
      <Chips label="Tête et ballon" value={z.ballHead} items={yesNo} onPick={(v) => setZopt({ ballHead: v })} />
      <p className="atelier__q">Il éternue (et sa tête s'envole) :</p>
      <Chips label="Éternuement" value={z.sneeze} items={yesNo} onPick={(v) => setZopt({ sneeze: v })} />
      <p className="atelier__q">Le chat du stade passe de temps en temps :</p>
      <Chips label="Le chat" value={z.cat} items={yesNo} onPick={(v) => setZopt({ cat: v })} />
    </div>
  );
}
