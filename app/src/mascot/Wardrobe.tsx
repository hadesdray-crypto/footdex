import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuCheck, LuX } from "react-icons/lu";
import { burst } from "../fx";
import { cx } from "../util";
import { useOverlay } from "../ui/cards";
import { Fig } from "./Fig";
import { PERSOS } from "./lines";
import { CaracList } from "./Carac";
import { CARAC } from "./caractere";
import { ACCESSORIES, BODIES, HAIRS, HAIR_COLORS, OUTFITS, PRESETS, SKINS, type Look } from "./look";
import { onWardrobe, update, useMascot } from "./state";

export type Tab = "perso" | "visage" | "tenue" | "acc" | "carac";
const TABS: { id: Tab; label: string }[] = [
  { id: "perso", label: "Personnage" },
  { id: "visage", label: "Visage" },
  { id: "tenue", label: "Tenue" },
  { id: "acc", label: "Accessoires" },
  { id: "carac", label: "Caractère" },
];

/** The changing room: he walks into the booth, the curtain closes, you choose, the curtain opens on the surprise. */
export function Wardrobe({ onClose, start = "tenue" }: { onClose: () => void; start?: Tab }) {
  const m = useMascot();
  const [draft, setDraft] = useState<Look>(m.s.look);
  const [perso, setPerso] = useState(m.s.perso);
  const [phase, setPhase] = useState<"enter" | "closed" | "swap" | "open">("enter");
  const [inside, setInside] = useState(false);
  const [tab, setTab] = useState<Tab>(start);
  const room = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);
  useOverlay(onClose);
  const later = (ms: number, fn: () => void) => void timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => {
    later(250, () => setInside(true));
    later(1500, () => setPhase("closed"));
    return () => timers.current.forEach((t) => clearTimeout(t));
  }, []);

  const change = (patch: Partial<Look>) => setDraft((d: Look) => ({ ...d, ...patch }));
  function validate() {
    if (phase !== "closed") return;
    setPhase("swap");
    update({ look: draft, perso });
    later(1100, () => {
      setPhase("open");
      const r = room.current?.getBoundingClientRect();
      if (r) burst(r.left + r.width / 2, r.top + r.height / 2, ["#f6c453", "#34d399", "#7aa2ff", "#ff7ae0", "#ffffff"], 150, 1.1);
      onWardrobe();
    });
  }
  function again() {
    setPhase("closed");
  }
  const mouth = PERSOS[perso].mouth;
  const toggleAcc = (id: string) => change({ acc: draft.acc.includes(id) ? draft.acc.filter((a: string) => a !== id) : [...draft.acc, id] });

  return createPortal(
    <div className="wd" data-phase={phase} role="dialog" aria-modal="true" aria-label="Vestiaire">
      <div className="wd__top">
        <h2 className="wd__title">Vestiaire</h2>
        <button type="button" className="iconbtn" onClick={onClose} aria-label="Fermer le vestiaire">
          <LuX aria-hidden="true" />
        </button>
      </div>
      <div className="wd__scene">
        <div className="booth" ref={room}>
          <div className="booth__sign">CABINE</div>
          <div className="booth__room">
            <div className={cx("booth__fig", inside && "is-in")}>
              <Fig look={phase === "open" || phase === "swap" ? m.s.look : draft} size={150} mouth={mouth} talk={phase === "open" && m.talking} cheer={phase === "open"} />
            </div>
            <div className={cx("booth__curtain booth__curtain--l", phase === "swap" && "is-shake")} />
            <div className={cx("booth__curtain booth__curtain--r", phase === "swap" && "is-shake")} />
          </div>
          <div className="booth__bench" />
        </div>
        {phase === "closed" ? (
          <div className="wd__mirror" aria-hidden="true">
            <span className="wd__mirrorlabel">Miroir</span>
            <Fig look={draft} size={56} crop="bust" mouth={mouth} />
          </div>
        ) : null}
      </div>
      <div className="wd__panel">
        {phase === "enter" ? <p className="wd__say">Il entre dans la cabine…</p> : null}
        {phase === "swap" ? <p className="wd__say">Il se change…</p> : null}
        {phase === "open" ? (
          <>
            <p className="wd__say">Surprise ! Qu'est-ce que tu en penses ?</p>
            <div className="wd__actions">
              <button type="button" className="btn btn--soft" onClick={again}>Changer encore</button>
              <button type="button" className="btn btn--gold" onClick={onClose}>
                <LuCheck aria-hidden="true" /> Terminé
              </button>
            </div>
          </>
        ) : null}
        {phase === "closed" ? (
          <>
            <div className="chips chips--scroll" role="tablist" aria-label="Catégories">
              {TABS.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={cx("chip", tab === t.id && "chip--on")} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="wd__choices">
              {tab === "perso" ? (
                <>
                  <p className="wd__hint">Un personnage tout prêt :</p>
                  <div className="wd__grid">
                    {PRESETS.map((p) => (
                      <button key={p.name} type="button" className="wd__pick" onClick={() => { setDraft(p.look); setPerso(p.perso); }}>
                        <Fig look={p.look} size={64} crop="bust" />
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="wd__hint">Ou choisis sa carrure :</p>
                  <div className="chips">
                    {BODIES.map((b, i) => (
                      <button key={b.name} type="button" className={cx("chip", draft.body === i && "chip--on")} aria-pressed={draft.body === i} onClick={() => change({ body: i })}>{b.name}</button>
                    ))}
                  </div>
                </>
              ) : null}
              {tab === "visage" ? (
                <>
                  <p className="wd__hint">Peau</p>
                  <div className="wd__swatches">
                    {SKINS.map((c, i) => (
                      <button key={c} type="button" className={cx("wd__sw", draft.skin === i && "is-on")} style={{ background: c }} aria-label={`Peau ${i + 1}`} aria-pressed={draft.skin === i} onClick={() => change({ skin: i })} />
                    ))}
                  </div>
                  <p className="wd__hint">Cheveux</p>
                  <div className="chips">
                    {HAIRS.map((h, i) => (
                      <button key={h.id} type="button" className={cx("chip", draft.hair === i && "chip--on")} aria-pressed={draft.hair === i} onClick={() => change({ hair: i })}>{h.name}</button>
                    ))}
                  </div>
                  <p className="wd__hint">Couleur des cheveux</p>
                  <div className="wd__swatches">
                    {HAIR_COLORS.map((c, i) => (
                      <button key={c} type="button" className={cx("wd__sw", draft.hairColor === i && "is-on")} style={{ background: c }} aria-label={`Couleur ${i + 1}`} aria-pressed={draft.hairColor === i} onClick={() => change({ hairColor: i })} />
                    ))}
                  </div>
                </>
              ) : null}
              {tab === "tenue" ? (
                <div className="wd__grid">
                  {OUTFITS.map((o, i) => (
                    <button key={o.name} type="button" className={cx("wd__pick", draft.outfit === i && "is-on")} aria-pressed={draft.outfit === i} onClick={() => change({ outfit: i })}>
                      <Fig look={{ ...draft, outfit: i }} size={64} crop="bust" />
                      <span>{o.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {tab === "acc" ? (
                <div className="chips">
                  {ACCESSORIES.map((a) => (
                    <button key={a.id} type="button" className={cx("chip", draft.acc.includes(a.id) && "chip--on")} aria-pressed={draft.acc.includes(a.id)} onClick={() => toggleAcc(a.id)}>{a.name}</button>
                  ))}
                </div>
              ) : null}
              {tab === "carac" ? (
                <CaracList current={perso} onPick={(i) => { setPerso(i); setDraft(m.s.looks[PERSOS[i].mode] ?? CARAC[PERSOS[i].mode].tenue); }} />
              ) : null}
            </div>
            <div className="wd__actions">
              <button type="button" className="btn btn--ghost" onClick={onClose}>Annuler</button>
              <button type="button" className="btn btn--gold btn--glow" onClick={validate}>
                <LuCheck aria-hidden="true" /> Valider
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
