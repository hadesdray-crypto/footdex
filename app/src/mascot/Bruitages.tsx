// « Mes bruitages » : choose a character, then hold the red button and make the noise (3 seconds at most).
import { useState } from "react";
import { cx } from "../util";
import { WHO } from "./VoicePicker";
import { SLOTS, canRecord, clearFx, hasFx, playFx, startRecording, stopRecording, useBruits, type Slot } from "./bruits";
import { useMascot } from "./state";

export function Bruitages() {
  const m = useMascot();
  useBruits();
  const [who, setWho] = useState(m.s.perso);
  const [rec, setRec] = useState<Slot | null>(null);
  const [msg, setMsg] = useState("");
  const key = WHO[who].key;
  const begin = (slot: Slot) => {
    setMsg("");
    setRec(slot);
    void startRecording(key, slot, (ok, why) => {
      setRec(null);
      setMsg(ok ? "✅ Enregistré ! Touche ▶️ pour l'écouter." : why ?? "");
    });
  };
  const end = () => {
    if (rec) stopRecording();
  };
  return (
    <div className="bruit">
      {!canRecord() ? <p className="note">Ici, le micro n'est pas disponible. Dans l'appli du téléphone, ça marche !</p> : null}
      <p className="vp__step"><b>1</b> Choisis le personnage</p>
      <div className="vp__who" role="radiogroup" aria-label="Personnage">
        {WHO.map((p, i) => (
          <button key={p.name} type="button" role="radio" aria-checked={who === i} className={cx("vp__face", who === i && "is-on")} onClick={() => setWho(i)}>
            {p.face(m)}
            <span>{p.name.replace(/^(Le |L')/, "")}</span>
          </button>
        ))}
      </div>
      <p className="vp__step"><b>2</b> Garde le bouton rouge appuyé et fais le bruit !</p>
      <div className="bruit__list">
        {SLOTS.map((s) => {
          const has = hasFx(key, s.id);
          return (
            <div key={s.id} className={cx("bruit__row", has && "has")}>
              <span className="bruit__icon" aria-hidden="true">{s.icon}</span>
              <span className="bruit__txt">
                <strong>{s.label}</strong>
                <em>{s.hint}</em>
              </span>
              <button
                type="button"
                className={cx("bruit__rec", rec === s.id && "is-on")}
                aria-label={`Enregistrer : ${s.label}`}
                onPointerDown={(e: { preventDefault: () => void }) => { e.preventDefault(); begin(s.id); }}
                onPointerUp={end}
                onPointerLeave={end}
                onPointerCancel={end}
              >
                {rec === s.id ? "●" : "🎙️"}
              </button>
              <button type="button" className="bruit__btn" disabled={!has} onClick={() => playFx(key, s.id)} aria-label="Écouter">▶️</button>
              <button type="button" className="bruit__btn" disabled={!has} onClick={() => clearFx(key, s.id)} aria-label="Effacer">🗑️</button>
            </div>
          );
        })}
      </div>
      {rec ? <p className="bruit__live" role="status">🔴 J'enregistre… (3 secondes au plus)</p> : null}
      {msg ? <p className="note" role="status">{msg}</p> : null}
      <p className="note">Sans enregistrement, le personnage parle avec sa voix. Le zombie, lui, grogne déjà tout seul !</p>
    </div>
  );
}
