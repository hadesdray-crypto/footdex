// « Change ma voix ! » : a voice picker a child of 8 can use alone.
// 1. Choose the character. 2. Touch a voice card: he speaks with it. 3. « C'est elle ! » keeps it. A slider makes it higher or lower.
import { useEffect, useState } from "react";
import { cx } from "../util";
import { Fig } from "./Fig";
import { PERSOS } from "./lines";
import { CARAC } from "./caractere";
import { FUNS, optionKey, setVoiceOf, tryVoice, useMascot, voiceCatalog, voiceOf, type Fun, type VoiceKey, type VoiceOption } from "./state";
import { visitorFace } from "./visitor";

/** Everybody who speaks: the six characters, then the Doctor and the Referee. */
type Who = { key: VoiceKey; name: string; sample: string; face: (m: ReturnType<typeof useMascot>) => JSX.Element };
const WHO: Who[] = [
  ...PERSOS.map((p) => ({
    key: p.mode as VoiceKey,
    name: p.name,
    sample: p.sample,
    face: (m: ReturnType<typeof useMascot>) => <Fig look={m.s.looks[p.mode] ?? CARAC[p.mode].tenue} size={46} crop="bust" mouth={p.mouth} />,
  })),
  { key: "medecin", name: "Le Médecin", sample: "Pas de panique, le docteur arrive ! Un petit bandage et ça repart.", face: () => <span className="vp__vis" dangerouslySetInnerHTML={{ __html: visitorFace("medecin") }} /> },
  { key: "arbitre", name: "L'Arbitre", sample: "TUUUT ! Carton jaune ! On ne lance pas les joueurs !", face: () => <span className="vp__vis" dangerouslySetInnerHTML={{ __html: visitorFace("arbitre") }} /> },
];

export function VoicePicker({ compact = false }: { compact?: boolean }) {
  const m = useMascot();
  const [who, setWho] = useState(m.s.perso);
  const [list, setList] = useState<VoiceOption[] | null>(null);
  const mode = WHO[who].key;
  const mine = voiceOf(mode);
  const [sel, setSel] = useState<string>(optionKey(mine));
  const [pitch, setPitch] = useState(mine.pitch);
  const [fun, setFun] = useState<Fun>(mine.fun ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void voiceCatalog().then(setList);
    // the phone's voices sometimes arrive a moment later
    const t = window.setTimeout(() => void voiceCatalog().then(setList), 1200);
    return () => window.clearTimeout(t);
  }, [m.s.piper]);
  useEffect(() => {
    const v = voiceOf(WHO[who].key);
    setSel(optionKey(v));
    setPitch(v.pitch);
    setFun(v.fun ?? "");
    setSaved(false);
  }, [who]);

  const current = list?.find((o) => o.key === sel);
  const listen = (o: VoiceOption | undefined, p = pitch, f = fun) => tryVoice({ engine: o?.v.engine ?? "auto", native: o?.v.native ?? -1, phone: o?.v.phone ?? "", pitch: p, fun: f }, WHO[who].sample);
  const keep = () => {
    if (current) setVoiceOf(mode, { ...current.v, pitch, fun });
    else setVoiceOf(mode, { pitch, fun });
    setSaved(true);
    tryVoice({ engine: current?.v.engine ?? "auto", native: current?.v.native ?? -1, phone: current?.v.phone ?? "", pitch, fun }, "Super ! Je garde cette voix !");
  };

  return (
    <div className={cx("vp", compact && "vp--compact")}>
      <p className="vp__step"><b>1</b> Choisis le personnage</p>
      <div className="vp__who" role="radiogroup" aria-label="Personnage">
        {WHO.map((p, i) => (
          <button key={p.name} type="button" role="radio" aria-checked={who === i} className={cx("vp__face", who === i && "is-on")} onClick={() => setWho(i)}>
            {p.face(m)}
            <span>{p.name.replace(/^(Le |L')/, "")}</span>
          </button>
        ))}
      </div>

      <p className="vp__step"><b>2</b> Touche une voix pour l'écouter</p>
      <div className="vp__cards">
        {(list ?? []).map((o) => (
          <button key={o.key} type="button" className={cx("vp__card", sel === o.key && "is-on", `s${o.stars}`)} aria-pressed={sel === o.key} onClick={() => { setSel(o.key); setSaved(false); listen(o); }}>
            <span className="vp__stars" aria-label={`${o.stars} étoiles`}>{"⭐".repeat(o.stars)}</span>
            <strong>{o.label}</strong>
            <em>{o.stars === 3 ? "Super fluide" : o.stars === 2 ? "Bien" : "Rigolo"}</em>
            <small>{o.tag}</small>
          </button>
        ))}
        {list === null ? <p className="note">Je cherche les voix du téléphone…</p> : null}
      </div>

      <p className="vp__step"><b>3</b> Plus aigu ou plus grave ?</p>
      <div className="vp__pitch">
        <span aria-hidden="true">🐭</span>
        <input type="range" min={0.6} max={1.6} step={0.05} value={2.2 - pitch} aria-label="Aigu ou grave"
          onChange={(e: { target: { value: string } }) => { setPitch(2.2 - Number(e.target.value)); setSaved(false); }}
          onPointerUp={() => listen(current, pitch)} onKeyUp={() => listen(current, pitch)} />
        <span aria-hidden="true">🐻</span>
      </div>

      <p className="vp__step"><b>4</b> Une voix rigolote ?</p>
      <div className="vp__fun" role="radiogroup" aria-label="Voix rigolote">
        {FUNS.map((f) => (
          <button key={f.id || "n"} type="button" role="radio" aria-checked={fun === f.id} className={cx("vp__funbtn", fun === f.id && "is-on")} onClick={() => { setFun(f.id); setSaved(false); listen(current, pitch, f.id); }}>
            <span aria-hidden="true">{f.icon}</span> {f.label}
          </button>
        ))}
      </div>

      <button type="button" className="btn btn--gold btn--big btn--glow vp__keep" onClick={keep}>
        {saved ? "✅ Gardée !" : `C'est elle ! (voix de ${WHO[who].name.replace(/^(Le |L')/, "")})`}
      </button>
    </div>
  );
}
