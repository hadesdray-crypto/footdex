// « Change ma voix ! » : a voice picker a child of 8 can use alone.
// 1. Choose the character. 2. Touch a voice card: he speaks with it. 3. « C'est elle ! » keeps it. A slider makes it higher or lower.
import { useEffect, useRef, useState } from "react";
import { LuCheck, LuWifi, LuWifiOff } from "react-icons/lu";
import { cx } from "../util";
import { Fig } from "./Fig";
import { PERSOS } from "./lines";
import { CARAC } from "./caractere";
import { FUNS, SPEEDS, optionKey, sample, setVoiceOf, tryVoice, update, useMascot, voiceCatalog, voiceOf, type Fun, type VoiceKey, type VoiceOption } from "./state";
import { visitorFace } from "./visitor";

/** Everybody who speaks: the six characters, then the Doctor and the Referee. */
type Who = { key: VoiceKey; name: string; sample: string; face: (m: ReturnType<typeof useMascot>) => JSX.Element };
export const WHO: Who[] = [
  ...PERSOS.map((p) => ({
    key: p.mode as VoiceKey,
    name: p.name,
    sample: p.sample,
    face: (m: ReturnType<typeof useMascot>) => <Fig look={m.s.looks[p.mode] ?? CARAC[p.mode].tenue} size={46} crop="bust" mouth={p.mouth} />,
  })),
  { key: "medecin", name: "Le Médecin", sample: "Pas de panique, le docteur arrive ! Un petit bandage et ça repart.", face: () => <span className="vp__vis" dangerouslySetInnerHTML={{ __html: visitorFace("medecin") }} /> },
  { key: "arbitre", name: "L'Arbitre", sample: "TUUUT ! Carton jaune ! On ne lance pas les joueurs !", face: () => <span className="vp__vis" dangerouslySetInnerHTML={{ __html: visitorFace("arbitre") }} /> },
];

const ITEM = 46; // height of one voice on a wheel (px)

/** A wheel of voices: roll it with a finger, and the voice that stops in the middle speaks at once. */
function Wheel({ items, value, onPick, title, icon, empty }: { items: VoiceOption[]; value: string; onPick: (o: VoiceOption) => void; title: string; icon: JSX.Element; empty: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const timer = useRef(0);
  const quiet = useRef(true); // true while the wheel is moved by the program (not by a finger): no voice then
  const at = items.findIndex((o) => o.key === value);
  useEffect(() => {
    const el = ref.current;
    if (!el || at < 0) return;
    quiet.current = true;
    el.scrollTo({ top: at * ITEM });
    const t = window.setTimeout(() => (quiet.current = false), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, at < 0]);
  const settle = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el || quiet.current) return;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM)));
      if (items[i] && items[i].key !== value) onPick(items[i]);
    }, 260);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <div className={cx("vw", at >= 0 && "is-on")}>
      <p className="vw__title">{icon} {title}</p>
      {items.length ? (
        <div className="vw__frame">
          <div className="vw__band" aria-hidden="true" />
          <div ref={ref} className="vw__list" role="listbox" aria-label={title} onScroll={settle} onPointerDown={() => (quiet.current = false)}>
            {items.map((o) => (
              <button key={o.key} type="button" role="option" aria-selected={o.key === value} className={cx("vw__item", o.key === value && "is-on")} onClick={() => { quiet.current = false; ref.current?.scrollTo({ top: items.indexOf(o) * ITEM, behavior: "smooth" }); }}>
                <strong>{o.label}</strong>
                <small>{o.stars === 3 ? "Très fluide" : o.stars === 2 ? "Bien" : "Rigolo"}</small>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="note vw__empty">{empty}</p>
      )}
    </div>
  );
}

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

  const all = list ?? [];
  const online = all.filter((o) => /Avec Internet/.test(o.tag));
  const offline = all.filter((o) => !/Avec Internet/.test(o.tag));
  const current = all.find((o) => o.key === sel);
  const listen = (o: VoiceOption | undefined, p = pitch, f = fun) => tryVoice({ engine: o?.v.engine ?? "auto", native: o?.v.native ?? -1, phone: o?.v.phone ?? "", pitch: p, fun: f }, WHO[who].sample);
  const pick = (o: VoiceOption) => {
    setSel(o.key);
    setSaved(false);
    listen(o);
  };
  const keep = () => {
    if (current) setVoiceOf(mode, { ...current.v, pitch, fun });
    else setVoiceOf(mode, { pitch, fun });
    setSaved(true);
    tryVoice({ engine: current?.v.engine ?? "auto", native: current?.v.native ?? -1, phone: current?.v.phone ?? "", pitch, fun }, "Super ! Je garde cette voix !");
  };

  return (
    <div className={cx("vp", compact && "vp--compact")}>
      <section className="vbox">
        <p className="vp__step"><b>1</b> Pour qui ?</p>
        <div className="vp__who" role="radiogroup" aria-label="Personnage">
          {WHO.map((p, i) => (
            <button key={p.name} type="button" role="radio" aria-checked={who === i} className={cx("vp__face", who === i && "is-on")} onClick={() => setWho(i)}>
              {p.face(m)}
              <span>{p.name.replace(/^(Le |L')/, "")}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="vbox">
        <p className="vp__step"><b>2</b> Fais rouler une molette : tu entends la voix</p>
        {list === null ? <p className="note">Je cherche les voix du téléphone…</p> : null}
        <div className="vw__pair">
          <Wheel items={offline} value={sel} onPick={pick} title="Sans connexion" icon={<LuWifiOff aria-hidden="true" />} empty="Aucune voix sans connexion ici." />
          <Wheel items={online} value={sel} onPick={pick} title="Avec connexion" icon={<LuWifi aria-hidden="true" />} empty="Aucune voix avec connexion sur ce téléphone." />
        </div>
        <p className="note">Les voix « sans connexion » marchent toujours, même sans Internet.</p>
      </section>

      <section className="vbox">
        <p className="vp__step"><b>3</b> Réglages de la voix</p>
        <p className="mm__label">Aigu ou grave</p>
        <div className="vp__pitch">
          <span aria-hidden="true">Aigu</span>
          <input type="range" min={0.6} max={1.6} step={0.05} value={2.2 - pitch} aria-label="Aigu ou grave"
            onChange={(e: { target: { value: string } }) => { setPitch(2.2 - Number(e.target.value)); setSaved(false); }}
            onPointerUp={() => listen(current, pitch)} onKeyUp={() => listen(current, pitch)} />
          <span aria-hidden="true">Grave</span>
        </div>
        <p className="mm__label">Vitesse</p>
        <div className="chips">
          {SPEEDS.map((s, i) => (
            <button key={s.label} type="button" className={cx("chip", m.s.speed === i && "chip--on")} aria-pressed={m.s.speed === i} onClick={() => { update({ speed: i }); sample(); }}>{s.label}</button>
          ))}
        </div>
        <details className="vp__more">
          <summary>Une voix rigolote ?</summary>
          <div className="vp__fun" role="radiogroup" aria-label="Voix rigolote">
            {FUNS.map((f) => (
              <button key={f.id || "n"} type="button" role="radio" aria-checked={fun === f.id} className={cx("vp__funbtn", fun === f.id && "is-on")} onClick={() => { setFun(f.id); setSaved(false); listen(current, pitch, f.id); }}>
                {f.label}
              </button>
            ))}
          </div>
        </details>
      </section>

      <button type="button" className="btn btn--gold btn--big btn--glow vp__keep" onClick={keep}>
        {saved ? <><LuCheck aria-hidden="true" /> Voix gardée !</> : `Valider la voix de ${WHO[who].name.replace(/^(Le |L')/, "")}`}
      </button>
    </div>
  );
}
