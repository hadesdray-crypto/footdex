// The Footballinis on screen: the card, the figurine on its turning pedestal, and the treasure chest that opens.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Piece } from "../ui/Piece";
import { LuGift } from "react-icons/lu";
import { cx } from "../util";
import { FBX, RARITY, fbx, fbxSvg } from "./art";
import { chestStars, openChest, useCollec, type Loot } from "./store";
import { spendStars, useStore } from "../store";
import { Chest } from "../pages/coffre";
import { Fig } from "../mascot/Fig";
import { Viewer3D, has3d } from "./Viewer3D";
import { Standee, type Edition } from "./Standee";
import { getMascot, say, update } from "../mascot/state";
import { PERSOS } from "../mascot/lines";
import { playFx } from "../mascot/bruits";
import { click, coins as coinSound, fanfare, flip, tear, thump } from "../sound";

// The drawings made with the image AI go in public/fbx/<id>.png (card) and public/fbx/rot/<id>-0..7.png (the 8 views
// of the turning figurine). While a file is missing, the vector drawing is used instead (cascade: nothing ever breaks).
const absent = new Set<string>();
const Art = ({ id, size }: { id: string; size: number }) => {
  const html = useMemo(() => fbxSvg(id, size), [id, size]);
  const [, bump] = useState(0);
  const src = `fbx/${id}.png`;
  if (!absent.has(src))
    return (
      <span className="fbart">
        <img src={src} width={size} height={size} alt="" draggable={false} style={{ objectFit: "contain" }} onError={() => { absent.add(src); bump((n) => n + 1); }} />
      </span>
    );
  return <span className="fbart" dangerouslySetInnerHTML={{ __html: html }} />;
};

const VUES = 8;
/** The 8 views of a figurine, blended into a smooth turn: it turns by itself, and a finger can turn it by hand. */
function Turntable({ id, size, onMissing }: { id: string; size: number; onMissing: () => void }) {
  const [angle, setAngle] = useState(0);
  const drag = useRef<{ x: number; a: number } | null>(null);
  const idle = useRef(0);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      if (!drag.current && t - idle.current > 1200) setAngle((a) => (a + dt * 0.55 * VUES / 4) % VUES);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  const i = Math.floor(angle) % VUES;
  const j = (i + 1) % VUES;
  const t = angle - Math.floor(angle);
  const img = (k: number, o: number) => (
    <img key={k} src={`fbx/rot/${id}-${k}.png`} width={size} height={size} alt="" draggable={false} onError={k === 0 ? onMissing : undefined} style={{ position: "absolute", inset: 0, objectFit: "contain", opacity: o }} />
  );
  return (
    <span
      className="fig3__tt"
      role="img"
      aria-label="Figurine : fais-la tourner avec le doigt"
      style={{ width: size, height: size, touchAction: "pan-y" }}
      onPointerDown={(e: { clientX: number; pointerId: number; currentTarget: HTMLElement }) => { drag.current = { x: e.clientX, a: angle }; e.currentTarget.setPointerCapture?.(e.pointerId); }}
      onPointerMove={(e: { clientX: number }) => { if (drag.current) setAngle((((drag.current.a - (e.clientX - drag.current.x) / (size / VUES * 1.2)) % VUES) + VUES) % VUES); }}
      onPointerUp={() => { drag.current = null; idle.current = performance.now(); }}
      onPointerCancel={() => { drag.current = null; idle.current = performance.now(); }}
    >
      {img(i, 1 - t)}
      {t > 0.001 ? img(j, t) : null}
    </span>
  );
}

const Bar = ({ label, icon, v, hide }: { label: string; icon: string; v: number; hide: boolean }) => (
  <span className="fbc__stat" aria-label={`${label} : ${hide ? "inconnu" : `${v} sur 10`}`}>
    <i aria-hidden="true">{icon}</i>
    <b>{hide ? "???" : <span className="fbc__bar"><span style={{ width: `${v * 10}%` }} /></span>}</b>
  </span>
);

/** One Footballini card. `owned` false: a dark silhouette with a question mark. */
export function FbxCard({ id, count = 1, owned = true, big = false, onClick }: { id: string; count?: number; owned?: boolean; big?: boolean; onClick?: () => void }) {
  const f = fbx(id);
  const r = RARITY[f.rar];
  const vide = f.rar === 4;
  const hide = vide || !owned;
  return (
    <button type="button" className={cx("fbc", `fbc--r${f.rar}`, !owned && "fbc--locked", vide && owned && "fbc--vide", big && "fbc--big")} style={{ "--rc": r.color, "--rg": r.glow } as Record<string, string>} onClick={onClick} aria-label={owned ? (vide ? "Une carte… vide ?" : f.name) : `Carte n° ${f.n} pas encore trouvée`}>
      <span className="fbc__top">
        <span>n° {vide ? "??" : f.n}</span>
        <span className="fbc__stars">{vide ? "?" : "★".repeat(r.stars)}</span>
      </span>
      <span className="fbc__art">{owned ? <Art id={id} size={big ? 220 : 120} /> : <span className="fbc__sil"><Art id={id} size={big ? 220 : 120} /><b>?</b></span>}</span>
      <span className="fbc__name">{owned && !vide ? f.name : "???"}</span>
      <span className="fbc__rar">{owned && !vide ? r.name : "???"}</span>
      {big ? (
        <>
          <span className="fbc__stats">
            <Bar label="Vitesse" icon="⚡" v={f.vit} hide={hide} />
            <Bar label="Tir" icon="🎯" v={f.tir} hide={hide} />
            <Bar label="Rigolade" icon="😂" v={f.rig} hide={hide} />
          </span>
          <span className="fbc__power">{hide ? "???" : f.power}</span>
          <span className="fbc__cry">{hide ? "« … »" : `« ${f.cry} »`}</span>
        </>
      ) : null}
      {count > 1 ? <span className="fbc__dup">×{count}</span> : null}
      {f.rar >= 2 && owned && !vide ? <span className="fbc__holo" aria-hidden="true" /> : null}
    </button>
  );
}

/** A figurine: the Footballini cut out on thick clear plastic, standing on its pedestal. Cascade: real 3D model → plastic figurine → 8 views → the drawing. */
export function Figurine({ id, count = 1, owned = true, size = 150, edition = "s", free = false, clip = false, onClip, roundKey, tag = true, spin = true }: { id: string; count?: number; owned?: boolean; size?: number; edition?: Edition; free?: boolean; clip?: boolean; onClip?: () => void; roundKey?: string | number; tag?: boolean; spin?: boolean }) {
  const f = fbx(id);
  const r = RARITY[f.rar];
  const [mode, setMode] = useState<"ask" | "gl" | "sd" | "tt" | "art">("ask");
  useEffect(() => {
    let live = true;
    void has3d(id).then((ok) => live && setMode(ok ? "gl" : "sd"));
    return () => { live = false; };
  }, [id]);
  return (
    <div className={cx("fig3", !owned && "fig3--locked", f.rar === 4 && "fig3--vide")} style={{ "--rc": r.color, width: `${size}px` } as Record<string, string>}>
      <div className="fig3__stage">
        {mode === "gl" ? (
          <Viewer3D id={id} size={size * 0.9} onMissing={() => setMode("sd")} />
        ) : mode === "ask" ? (
          <span style={{ display: "block", width: size, height: size }} />
        ) : mode === "sd" ? (
          <Standee id={id} edition={edition} size={size} free={free} clip={clip} onClip={onClip} roundKey={roundKey} spin={spin} locked={!owned} color={r.color} onMissing={() => setMode("tt")} />
        ) : mode === "tt" ? (
          <Turntable id={id} size={size * 0.9} onMissing={() => setMode("art")} />
        ) : (
          <div className="fig3__spin">
            <Art id={id} size={size * 0.86} />
          </div>
        )}
        {mode === "sd" ? (tag ? <span className="sd__tag">{owned ? (f.rar === 4 ? "???" : f.name) : "?"}</span> : null) : <div className="fig3__base" aria-hidden="true"><span>{owned ? (f.rar === 4 ? "???" : f.name) : "?"}</span></div>}
      </div>
      {count > 1 ? <span className="fbc__dup">×{count}</span> : null}
    </div>
  );
}

const EDITION = { s: "Édition Studio", c: "Édition Classique" } as const;
export const editionName = (v: Edition) => EDITION[v];

/** A figurine comes out of a pack in two parts, the figure and the pedestal: push the figure down into the pedestal to clip it. */
export function FigReveal({ id, v, fresh, onDone, title }: { id: string; v: Edition; fresh: boolean; onDone: () => void; title?: string }) {
  const f = fbx(id);
  const r = RARITY[f.rar];
  const [step, setStep] = useState<"pack" | "clip" | "done">("pack");
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (step === "clip") say("Voilà la figurine, et son socle ! Pousse la figurine vers le bas pour la clipser dessus.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  if (step === "pack")
    return (
      <div className="chm__item">
        <button type="button" className="fbpack fbpack--1" onClick={() => { tear(); setStep("clip"); }} aria-label="Ouvrir le paquet">
          <b>1</b>
          <span>FIGURINE</span>
          <em>{v === "c" ? "CLASSIQUE" : "STUDIO"}</em>
        </button>
        <p>Touche le paquet pour le déchirer !</p>
      </div>
    );
  return (
    <div className="chm__item sdbox" style={{ "--rc": r.color } as Record<string, string>}>
      {step === "done" ? <h3>{title ?? (fresh ? "Nouvelle figurine !" : "Figurine en double")}</h3> : <h3>Clipse la figurine !</h3>}
      <Figurine id={id} edition={v} size={Math.max(150, Math.min(230, Math.round(window.innerHeight * 0.26)))} free clip roundKey={key} tag={false} onClip={() => { click("button"); thump(); fanfare(f.rar >= 2 ? "eclat" : "base"); setStep("done"); say(f.rar === 4 ? "Un socle… vide ? C'est Ultime Vide." : `Clic ! Tu as découvert ${f.name} !`); }} />
      <span className="sdbox__ed">{EDITION[v]}</span>
      {step === "done" ? (
        <>
          <p>{f.rar === 4 ? "Un socle… vide ? C'est Ultime Vide. Personne ne l'a jamais vu." : `${f.name} — tourne-la avec ton doigt, dans tous les sens !`}</p>
          <div className="chips">
            <button type="button" className="btn btn--soft" onClick={() => { setKey((n) => n + 1); setStep("clip"); }}>Déclipser</button>
            <button type="button" className="btn btn--gold btn--big" onClick={onDone}>Super !</button>
          </div>
        </>
      ) : (
        <>
          <p>Glisse la figurine vers le bas, ou touche le bouton.</p>
          <button type="button" className="btn btn--gold btn--big" onClick={() => window.dispatchEvent(new Event("footdex:clip"))}>Clipser</button>
        </>
      )}
    </div>
  );
}

/** The figurine in big, to turn in every direction. */
export function FigZoom({ id, v, count, onClose }: { id: string; v: Edition; count: number; onClose: () => void }) {
  const f = fbx(id);
  const r = RARITY[f.rar];
  return (
    <div className="colx__zoomfig" role="dialog" aria-modal="true" aria-label={f.name}>
      <div className="box" style={{ "--rc": r.color } as Record<string, string>}>
        <h3>{f.rar === 4 ? "???" : f.name}</h3>
        <Figurine id={id} edition={v} size={300} free tag={false} />
        <span className="sdbox__ed">{EDITION[v]} · {r.name}{count > 1 ? ` · ×${count}` : ""}</span>
        <p className="note">Tourne-la avec ton doigt : autour, par-dessus, par-dessous.</p>
        <button type="button" className="btn btn--gold btn--big" onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
}

/** For the developer menu: try the clip scene with any figurine. */
export function ClipTest({ onClose }: { onClose: () => void }) {
  const [id, setId] = useState("mouton");
  const [v, setV] = useState<Edition>("s");
  const [run, setRun] = useState(0);
  return createPortal(
    <div className="chm" role="dialog" aria-modal="true" aria-label="Test de la figurine à clipser">
      <div className="chm__box">
        <div className="chips">
          <select aria-label="Personnage" value={id} onChange={(e: { target: { value: string } }) => { setId(e.target.value); setRun((n) => n + 1); }}>
            {FBX.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <select aria-label="Édition" value={v} onChange={(e: { target: { value: string } }) => { setV(e.target.value as Edition); setRun((n) => n + 1); }}>
            <option value="s">Studio</option>
            <option value="c">Classique</option>
          </select>
        </div>
        <FigReveal key={`${id}${v}${run}`} id={id} v={v} fresh onDone={() => setRun((n) => n + 1)} title="Test terminé" />
        <button type="button" className="btn btn--ghost" onClick={onClose}>Fermer le test</button>
      </div>
    </div>,
    document.body,
  );
}

// ------------------------------------------------------------------ the treasure chest

type Step = { loot: Loot; shown: number };

/** The chest opens: a shake, a burst of light, then what is inside, one thing after the other. */
export function ChestModal({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const [phase, setPhase] = useState<"choose" | "shake" | "open" | "loot">("choose");
  const [loot, setLoot] = useState<Loot[]>([]);
  const [i, setI] = useState(0);
  const [cardI, setCardI] = useState(0);

  function start(pay: "paid") {
    if (pay === "paid" && !spendStars(chestStars())) return say(`Il te faut ${chestStars()} pièces pour ouvrir un coffre.`);
    const got = openChest(pay);
    if (!got) return;
    click("button");
    setLoot(got);
    setPhase("shake");
    playFx(PERSOS[getMascot().s.perso].mode, "coffre");
    thump();
    window.setTimeout(() => {
      setPhase("open");
      fanfare("eclat");
    }, 1300);
    window.setTimeout(() => setPhase("loot"), 2300);
  }

  const cur: Step | null = phase === "loot" && loot[i] ? { loot: loot[i], shown: cardI } : null;
  useEffect(() => {
    if (!cur) return;
    const l = cur.loot;
    if (l.k === "coins") {
      coinSound(5);
      say(`${l.n} pièces d'or ! Elles servent à ouvrir d'autres coffres.`);
    } else if (l.k === "fig") say(l.fresh ? `Une nouvelle figurine : ${fbx(l.id).name} !` : `Encore ${fbx(l.id).name} ! Un doublon, tu peux l'échanger contre des pièces.`);
    else if (l.k === "style") say(`Un nouveau personnage stylé : ${l.name} ! Tu peux habiller ton personnage comme lui.`);
    else if (l.k === "gift") say("Un paquet cadeau de cartes Footdex ! Il t'attend dans l'onglet Paquets.");
    else if (l.k === "pack") say("Une carte Footballini, ça n'arrive pas souvent ! Touche-la pour la découvrir.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, phase]);

  const next = () => {
    if (i + 1 < loot.length) {
      setI(i + 1);
      setCardI(0);
    } else onClose();
  };

  return (
    <div className="chm" role="dialog" aria-modal="true" aria-label="Le coffre des Footballinis">
      <div className="chm__box">
        {phase === "choose" ? (
          <>
            <h2 className="chm__title">Le coffre des Footballinis</h2>
            <div className="chm__chest"><Chest open={false} /></div>
            <p className="chm__hint">Dedans : des pièces, des paquets cadeaux, des Footballinis, des figurines, des personnages stylés… Tu ne les trouves nulle part ailleurs. On ne sait jamais !</p>
            <div className="chm__pay">
              <button type="button" className="btn btn--gold btn--big btn--glow" disabled={s.stars < chestStars()} onClick={() => start("paid")}><Piece /> Ouvrir pour {chestStars()} pièces</button>
              <p className="chm__have">Tu as {s.stars} pièces.</p>
            </div>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Fermer</button>
          </>
        ) : phase !== "loot" ? (
          <div className={cx("chm__chest chm__chest--big", phase === "shake" && "is-shake", phase === "open" && "is-open")}>
            <span className="chm__rays" aria-hidden="true" />
            <Chest open={phase === "open"} />
          </div>
        ) : cur ? (
          <div className="chm__loot" key={i}>
            {loot.length > 1 ? <p className="chm__count">Surprise {i + 1} sur {loot.length}</p> : null}
            {cur.loot.k === "coins" ? (
              <div className="chm__item">
                <div className="chm__coins">{Array.from({ length: 7 }, (_, k) => <span key={k} style={{ animationDelay: `${k * 90}ms`, left: `${10 + k * 12}%` }}><Piece /></span>)}</div>
                <h3>+{cur.loot.n} pièces d'or</h3>
                <button type="button" className="btn btn--gold btn--big" onClick={next}>Super !</button>
              </div>
            ) : cur.loot.k === "gift" ? (
              <div className="chm__item">
                <div className="fbpack fbpack--5" aria-hidden="true"><b><LuGift aria-hidden="true" /></b><span>PAQUET</span><em>CADEAU</em></div>
                <h3>Un paquet cadeau Footdex !</h3>
                <p>Des joueurs, des légendes, des moments de match. Ouvre-le dans l'onglet « Paquets ».</p>
                <button type="button" className="btn btn--gold btn--big" onClick={next}>Super !</button>
              </div>
            ) : cur.loot.k === "fig" ? (
              <div className="chm__item">
                <FigReveal id={cur.loot.id} v={cur.loot.v} fresh={cur.loot.fresh} onDone={next} />
              </div>
            ) : cur.loot.k === "style" ? (
              <div className="chm__item">
                <Fig look={cur.loot.look} size={130} mouth="grin" />
                <h3>{cur.loot.name}</h3>
                <p>Un personnage stylé rejoint ta collection.</p>
                <div className="chips">
                  <button type="button" className="btn btn--soft" onClick={() => { if (cur.loot.k === "style") { update({ look: cur.loot.look }); say("Wouah, j'ai une nouvelle tenue !"); } }}>L'habiller comme ça</button>
                  <button type="button" className="btn btn--gold" onClick={next}>Super !</button>
                </div>
              </div>
            ) : (
              <PackOpen cards={cur.loot.cards} shown={cardI} setShown={setCardI} onDone={next} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** A pack of Footballinis: tear it, then the cards come one by one (the 15-card pack: all of them at the end). */
function PackOpen({ cards, shown, setShown, onDone }: { cards: string[]; shown: number; setShown: (n: number) => void; onDone: () => void }) {
  const c = useCollec();
  const [torn, setTorn] = useState(false);
  const big = cards.length > 2;
  const best = Math.max(...cards.map((id) => fbx(id).rar));
  if (!torn)
    return (
      <div className="chm__item">
        <button type="button" className={cx("fbpack", `fbpack--${cards.length}`)} onClick={() => { tear(); setTorn(true); setShown(0); }} aria-label="Ouvrir le paquet">
          <b>{cards.length}</b>
          <span>CARTE{cards.length > 1 ? "S" : ""}</span>
          <em>FOOTBALLINIS</em>
        </button>
        <p>Touche le paquet pour le déchirer !</p>
      </div>
    );
  if (big && shown >= cards.length)
    return (
      <div className="chm__item">
        <h3>Ton méga paquet !</h3>
        <div className="chm__grid">{cards.map((id, k) => <FbxCard key={k} id={id} />)}</div>
        <button type="button" className="btn btn--gold btn--big" onClick={onDone}>Super !</button>
      </div>
    );
  const id = cards[Math.min(shown, cards.length - 1)];
  const f = fbx(id);
  const isNew = (c.cards[id] ?? 0) <= cards.slice(0, shown + 1).filter((x) => x === id).length;
  return (
    <div className="chm__item">
      <p className="chm__count">Carte {Math.min(shown + 1, cards.length)} sur {cards.length}{best >= 3 && shown === 0 ? " · ça brille…" : ""}</p>
      <div className="chm__flip" key={shown} onAnimationStart={() => flip(["base", "rare", "eclat", "legende", "legende"][f.rar])}>
        <FbxCard id={id} big />
      </div>
      <p className="chm__new">{f.rar === 4 ? "Une carte… complètement vide ?!" : isNew ? "Nouvelle carte !" : "Doublon"}</p>
      <div className="chips">
        {big ? <button type="button" className="btn btn--soft" onClick={() => setShown(cards.length)}>Tout voir</button> : null}
        <button type="button" className="btn btn--gold btn--big" onClick={() => (shown + 1 < cards.length ? setShown(shown + 1) : big ? setShown(cards.length) : onDone())}>{shown + 1 < cards.length ? "Carte suivante" : "Super !"}</button>
      </div>
    </div>
  );
}

/** A Footballini (Brain Rot) card that fell out of a normal pack, once the pack is open. Rare, so it gets its own moment. */
export function BrainRotDrop({ id, onClose }: { id: string; onClose: () => void }) {
  const c = useCollec();
  const f = fbx(id);
  const fresh = (c.cards[id] ?? 0) <= 1;
  useEffect(() => {
    flip(["base", "rare", "eclat", "legende", "legende"][f.rar]);
    say(fresh ? `Une carte Footballini est tombée du paquet : ${f.name} !` : `Encore ${f.name} ! Un doublon, tu peux l'échanger contre des pièces.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="chm" role="dialog" aria-modal="true" aria-label="Une carte Footballini est tombée">
      <div className="chm__box">
        <div className="chm__item">
          <h2 className="chm__title">Carte surprise !</h2>
          <div className="chm__flip">
            <FbxCard id={id} big />
          </div>
          <p className="chm__new">{fresh ? "Nouvelle carte Footballini !" : "Doublon"}</p>
          <p>Elle est rangée dans ta collection, rubrique Footballinis.</p>
          <button type="button" className="btn btn--gold btn--big" onClick={onClose}>Super !</button>
        </div>
      </div>
    </div>
  );
}

export { FBX };
