// « Mes bruitages » : choose a character, then for each moment: touch the red button, make the noise,
// touch it again to stop (8 seconds at most). ▶️ to listen, 🗑️ to erase.
import { useEffect, useState } from "react";
import { cx } from "../util";
import { WHO } from "./VoicePicker";
import { MAX_SECONDS, SLOTS, canRecord, clearFx, hasFx, playFx, startRecording, stopRecording, useBruits, type Slot } from "./bruits";
import { useMascot } from "./state";

export function Bruitages() {
  const m = useMascot();
  useBruits();
  const [who, setWho] = useState(m.s.perso);
  const [rec, setRec] = useState<Slot | null>(null);
  const [secs, setSecs] = useState(0);
  const [msg, setMsg] = useState("");
  const key = WHO[who].key;
  useEffect(() => {
    if (!rec) return;
    setSecs(0);
    const t = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [rec]);
  useEffect(() => () => stopRecording(), []);
  const toggle = (slot: Slot) => {
    if (rec === slot) return stopRecording();
    if (rec) stopRecording();
    setMsg("");
    setRec(slot);
    void startRecording(key, slot, (ok, why) => {
      setRec(null);
      setMsg(ok ? "✅ Enregistré ! Touche ▶️ pour l'écouter." : why ?? "");
    });
  };
  const count = SLOTS.filter((s) => hasFx(key, s.id)).length;
  const groups = [...new Set(SLOTS.map((s) => s.group))];
  return (
    <div className="bruit">
      {!canRecord() ? <p className="note">Ici, le micro n'est pas disponible. Dans l'appli du téléphone, ça marche !</p> : null}
      <p className="vp__step"><b>1</b> Choisis le personnage</p>
      <div className="vp__who" role="radiogroup" aria-label="Personnage">
        {WHO.map((p, i) => (
          <button key={p.name} type="button" role="radio" aria-checked={who === i} className={cx("vp__face", who === i && "is-on")} onClick={() => { stopRecording(); setWho(i); }}>
            {p.face(m)}
            <span>{p.name.replace(/^(Le |L')/, "")}</span>
          </button>
        ))}
      </div>
      <p className="vp__step"><b>2</b> Touche 🎙️, fais le bruit, puis touche ⏹️ pour arrêter</p>
      <p className="note">{count} bruit{count > 1 ? "s" : ""} enregistré{count > 1 ? "s" : ""} sur {SLOTS.length} pour {WHO[who].name}. Chaque bruit est joué exactement au bon moment.</p>
      {rec ? <p className="bruit__live" role="status">🔴 J'enregistre… {secs} s (touche ⏹️ pour arrêter, {MAX_SECONDS} s au plus)</p> : null}
      {msg ? <p className="note" role="status">{msg}</p> : null}
      {groups.map((g) => (
        <div key={g}>
          <p className="mm__label">{g}</p>
          <div className="bruit__list">
            {SLOTS.filter((s) => s.group === g).map((s) => {
              const has = hasFx(key, s.id);
              return (
                <div key={s.id} className={cx("bruit__row", has && "has", rec === s.id && "is-rec")}>
                  <span className="bruit__icon" aria-hidden="true">{s.icon}</span>
                  <span className="bruit__txt">
                    <strong>{s.label}</strong>
                    <em>{s.hint}</em>
                  </span>
                  <button type="button" className={cx("bruit__rec", rec === s.id && "is-on")} aria-label={rec === s.id ? "Arrêter l'enregistrement" : `Enregistrer : ${s.label}`} onClick={() => toggle(s.id)}>
                    {rec === s.id ? "⏹️" : "🎙️"}
                  </button>
                  <button type="button" className="bruit__btn" disabled={!has} onClick={() => playFx(key, s.id)} aria-label="Écouter">▶️</button>
                  <button type="button" className="bruit__btn" disabled={!has} onClick={() => clearFx(key, s.id)} aria-label="Effacer">🗑️</button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="note">Sans enregistrement, le personnage parle avec sa voix. Le zombie, lui, grogne déjà tout seul !</p>
    </div>
  );
}
