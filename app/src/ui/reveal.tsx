import { useEffect, useRef, useState } from "react";
import { Piece } from "./Piece";
import { createPortal } from "react-dom";
import { LuFastForward, LuGift, LuX } from "react-icons/lu";
import { CARDS_PER_CHEMIN, CHEMINS, RARITY, cheminOf, isBig, type Pulled } from "../cards";
import { RARITY_COLORS, burst, rain, reducedMotion, sparkle, vibrate } from "../fx";
import { go } from "../router";
import { onCard, setBusy } from "../mascot/state";
import { coins, crowd, fanfare, flip, tear, thump, tick, whoosh } from "../sound";
import { type PackKind, type PackResult, getState, useStore } from "../store";
import { cx, fmt } from "../util";
import { Carte, cardRoute, useOverlay } from "./cards";
import { PathBar, RewardIcon, rewardText } from "./chemin";
import { PackArt } from "./pack";

export type Opening = {
  id: number;
  kind: PackKind;
  title: string;
  /** In the order they come out: the best card last. */
  pulled: Pulled[];
  result: PackResult;
  /** Path index when the pack was opened: it gives the wrapper its colours. */
  chemin: number;
};

type Phase = "pack" | "open" | "cards" | "recap";
/** Direction of the finger: r = vers la droite, l = vers la gauche, u = vers le haut, d = vers le bas. */
type Dir = "r" | "l" | "u" | "d";

function glowOf(p: Pulled): string {
  if (p.shiny) return "#ff7ae0";
  return RARITY[p.card.rarity].rank >= 1 ? RARITY[p.card.rarity].color : "#dfe7ff";
}

/** « Spéciale » : tout ce qui est au-dessus d'une carte de base (rare, éclat, légende, moment) ou brillante. Le dos ne dit que ça. */
function special(p: Pulled): boolean {
  return p.shiny || RARITY[p.card.rarity].rank >= 1;
}

/** Ce qu'on découvre au retournement : rare, ultra rare (éclat, légende, moment) ou ultra spéciale (brillante). */
function tierOf(p: Pulled): "base" | "rare" | "ultra" | "brillante" {
  if (p.shiny) return "brillante";
  const rank = RARITY[p.card.rarity].rank;
  return rank >= 2 ? "ultra" : rank >= 1 ? "rare" : "base";
}

/** Moins d'effets quand la tablette rame (classe posée par l'arbitre de fluidité) ou quand le téléphone demande moins d'animations. */
function light(): boolean {
  return reducedMotion() || document.documentElement.classList.contains("fluide-leger");
}

/** La vibration du paquet reste même en mode allégé : c'est un signal, pas une animation. */
function buzz(pattern: number | number[]) {
  try {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* pas de vibreur */
  }
}

/** Force de la vibration quand une carte arrive en haut du tas, selon le nombre de cartes avant la prochaine spéciale. */
const NEAR = [260, 150, 80, 40, 20];

function dirOf(dx: number, dy: number): Dir {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "r" : "l";
  return dy < 0 ? "u" : "d";
}

/** The whole opening: the pack torn along its top, the cards bursting out into a neat pile, turned one by one, then the summary. */
export function Reveal({ opening, onClose, onGift }: { opening: Opening; onClose: () => void; onGift?: () => void }) {
  const { pulled, result, kind } = opening;
  const shop = kind === "boutique";
  const [phase, setPhase] = useState<Phase>(shop ? "cards" : "pack");
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [glory, setGlory] = useState(false);
  const [dir, setDir] = useState<Dir>("r");
  const [entering, setEntering] = useState<"boom" | "deal" | null>(shop ? "deal" : null);
  const [leaving, setLeaving] = useState<{ p: Pulled; dir: Dir; key: number } | null>(null);
  const [flash, setFlash] = useState<{ tier: string; key: number } | null>(null);
  const timers = useRef<number[]>([]);
  const lock = useRef(0);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const cardBox = useRef<HTMLDivElement | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const best = pulled[pulled.length - 1];
  const current = pulled[Math.min(index, pulled.length - 1)];
  const dos = getState().back;
  useOverlay(onClose);

  const clear = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => {
    root.current?.focus();
    setBusy(true);
    if (shop) {
      lock.current = Date.now() + 450;
      later(light() ? 0 : 520, () => {
        setEntering(null);
        announce(0);
      });
    }
    return () => {
      clear();
      setBusy(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function center(): [number, number] {
    const r = cardBox.current?.getBoundingClientRect();
    return r ? [r.left + r.width / 2, r.top + r.height / 2] : [window.innerWidth / 2, window.innerHeight / 2];
  }

  /** Une carte arrive en haut du tas : plus la prochaine spéciale est proche, plus le téléphone vibre fort. */
  function announce(i: number) {
    for (let j = i; j < pulled.length; j++) {
      if (special(pulled[j])) {
        buzz(NEAR[Math.min(j - i, NEAR.length - 1)]);
        return;
      }
    }
  }

  function celebrate(p: Pulled) {
    const [x, y] = center();
    const colors = RARITY_COLORS[p.shiny ? "shiny" : p.card.rarity];
    burst(x, y, colors, 170, 1.15);
    later(260, () => burst(x, y - 40, colors, 90, 0.8));
    fanfare(p.shiny ? "shiny" : p.card.rarity);
    crowd(p.shiny ? 1.5 : 1);
    vibrate([25, 50, 90]);
  }

  function turn() {
    const big = isBig(current);
    clear();
    setShown(true);
    flip(current.card.rarity);
    onCard({ name: current.card.name, rarity: current.card.rarity, shiny: current.shiny });
    const tier = tierOf(current);
    if (tier !== "base") setFlash({ tier, key: index });
    if (big) {
      setGlory(true);
      later(light() ? 0 : 320, () => celebrate(current));
    } else if (RARITY[current.card.rarity].rank >= 1) {
      later(300, () => cardBox.current && sparkle(cardBox.current, RARITY[current.card.rarity].color, 30));
    }
  }

  /** Retourner la carte du dessus, dans le sens du geste. */
  function reveal(d: Dir) {
    lock.current = Date.now() + (light() ? 200 : 650);
    setDir(d);
    // the direction is set first (no transition), then the card turns at the next frame
    requestAnimationFrame(() => requestAnimationFrame(() => turn()));
  }

  function advance(d: Dir = "r") {
    setGlory(false);
    setFlash(null);
    if (index + 1 >= pulled.length) {
      lock.current = Date.now() + 1000;
      // a moment later, so the end of the gesture does not land on a card of the summary
      later(60, () => setPhase("recap"));
      return;
    }
    lock.current = Date.now() + (light() ? 150 : 380);
    if (!light()) {
      setLeaving({ p: current, dir: d === "l" ? "l" : d === "u" ? "u" : "r", key: index });
      later(560, () => setLeaving(null));
      whoosh();
    }
    setShown(false);
    setDir("r");
    setIndex(index + 1);
    announce(index + 1);
  }

  function act(d: Dir) {
    if (phase !== "cards" || entering || Date.now() < lock.current) return;
    if (!shown) reveal(d);
    else advance(d);
  }

  /** Le paquet est déchiré : une vibration par carte spéciale cachée dedans. */
  function torn() {
    if (phase !== "pack") return;
    setPhase("open");
    const n = pulled.filter(special).length;
    if (n > 0) {
      const pattern: number[] = [];
      for (let i = 0; i < n; i++) pattern.push(110, 170);
      pattern.pop();
      later(250, () => buzz(pattern));
    }
  }

  /** BOUM : les cartes jaillissent du paquet et retombent en tas. */
  function pull() {
    if (phase !== "open") return;
    setPhase("cards");
    const soft = light();
    setEntering(soft ? null : "boom");
    lock.current = Date.now() + (soft ? 150 : 1150);
    thump();
    if (!soft) {
      requestAnimationFrame(() => {
        const [x, y] = center();
        burst(x, y + 40, ["#ffffff", "#ffe49a", glowOf(best) === "#dfe7ff" ? "#9fb4ff" : "#ffe49a"], 70, 0.9);
      });
      later(1150, () => {
        setEntering(null);
        announce(0);
      });
    } else announce(0);
  }

  function showAll() {
    const rest = pulled.slice(shown ? index + 1 : index);
    clear();
    setGlory(false);
    setFlash(null);
    setPhase("recap");
    const big = rest.filter(isBig).pop();
    if (big) {
      fanfare(big.shiny ? "shiny" : big.card.rarity);
      crowd(big.shiny ? 1.5 : 1);
      requestAnimationFrame(() => burst(window.innerWidth / 2, window.innerHeight * 0.35, RARITY_COLORS[big.shiny ? "shiny" : big.card.rarity], 150, 1));
    }
  }

  const r = RARITY[current.card.rarity];
  const fresh = result.fresh.has(current.card.id);
  const spe = special(current);
  const under = Math.min(3, pulled.length - index - 1);
  const tier = tierOf(current);

  return createPortal(
    <div
      ref={root}
      tabIndex={-1}
      className={cx("reveal", `reveal--${phase}`, glory && "reveal--glory", glory && current.shiny && "reveal--shiny")}
      role="dialog"
      aria-modal="true"
      aria-label={`Ouverture : ${opening.title}`}
      style={{ "--rc": current.shiny ? "#ff7ae0" : r.color, "--best": glowOf(best) }}
    >
      <div className="reveal__sky" aria-hidden="true">
        <span className="reveal__beam reveal__beam--l" />
        <span className="reveal__beam reveal__beam--r" />
        <span className="reveal__burst" />
      </div>
      {flash ? <span key={flash.key} className={cx("rv-flash", `rv-flash--${flash.tier}`)} aria-hidden="true" /> : null}

      <header className="reveal__bar">
        <p className="reveal__title">{opening.title}</p>
        <div className="reveal__tools">
          {phase === "cards" && pulled.length > 1 ? (
            <button type="button" className="btn btn--glass btn--small" onClick={showAll}>
              <LuFastForward aria-hidden="true" /> Tout montrer
            </button>
          ) : null}
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Fermer">
            <LuX aria-hidden="true" />
          </button>
        </div>
      </header>

      {phase === "pack" || phase === "open" ? (
        <div className="reveal__stage reveal__stage--pack">
          <TearPack
            size={kind === "jour" ? pulled.length : undefined}
            kind={kind}
            chemin={opening.chemin}
            glow={glowOf(best)}
            hot={isBig(best)}
            open={phase === "open"}
            backs={Math.min(3, pulled.length)}
            dos={dos}
            onTorn={torn}
            onPull={pull}
          />
        </div>
      ) : null}

      {phase === "cards" ? (
        <div className="reveal__stage rv-stage" onClick={(e: MouseEvent) => !(e.target as HTMLElement).closest("button") && act("r")}>
          <div
            className={cx("reveal__deck rv-deck", entering && `rv-deck--${entering}`)}
            onPointerDown={(e: PointerEvent) => {
              gesture.current = { x: e.clientX, y: e.clientY };
              swiped.current = false;
              try {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              } catch {
                /* not supported */
              }
            }}
            onPointerUp={(e: PointerEvent) => {
              const g = gesture.current;
              gesture.current = null;
              if (!g) return;
              const dx = e.clientX - g.x;
              const dy = e.clientY - g.y;
              // a simple touch is handled by the click that follows (so it cannot land on what appears next)
              if (Math.hypot(dx, dy) < 14) return;
              swiped.current = true;
              act(dirOf(dx, dy));
            }}
            onPointerCancel={() => {
              gesture.current = null;
            }}
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              if (swiped.current) {
                swiped.current = false;
                return;
              }
              act("r");
            }}
          >
            {entering === "boom" ? (
              <div className="rv-ghost" aria-hidden="true">
                <PackArt size={kind === "jour" ? pulled.length : undefined} kind={kind} chemin={opening.chemin} />
              </div>
            ) : null}
            {Array.from({ length: under }, (_, k) => under - k).map((k) => (
              <Dos key={index + k} dos={dos} className="rv-under" style={{ "--k": k }} />
            ))}
            <div
              ref={cardBox}
              key={index}
              className={cx("rv-top", `rv-top--${dir}`, shown && "is-shown", !shown && spe && "rv-top--special", shown && `rv-top--${tier}`)}
              style={{ "--k": 0 }}
            >
              <span className="rv-top__aura" aria-hidden="true" />
              <Carte card={current.card} shiny={current.shiny} flipped={shown} fresh={shown && fresh} size="xl" tilt={shown} play={shown} />
            </div>
            {leaving ? (
              <div key={`l${leaving.key}`} className={cx("rv-leave", `rv-leave--${leaving.dir}`)} aria-hidden="true">
                <Carte card={leaving.p.card} shiny={leaving.p.shiny} size="xl" tilt={false} />
              </div>
            ) : null}
          </div>

          <div className="reveal__caption" aria-live="polite">
            {shown ? (
              <>
                <p className="reveal__rarity">
                  {current.shiny ? "Brillante · " : ""}
                  {r.label}
                </p>
                <h2 className="reveal__name">{current.card.name}</h2>
                <p className="reveal__sub">{current.card.sub}</p>
                <p className={cx("reveal__flag", fresh ? "reveal__flag--new" : "reveal__flag--dup")}>
                  {fresh ? "Nouvelle carte dans ton classeur" : `Doublon : +${result.starsByCard[current.card.id] ?? 0} pièces`}
                </p>
              </>
            ) : (
              <p className={cx("reveal__hint", spe && "rv-hint--special")}>
                {spe ? "Une carte spéciale t'attend ! Touche-la ou glisse ton doigt dessus pour la retourner." : "Touche la carte ou glisse ton doigt dessus pour la retourner."}
              </p>
            )}
            <button type="button" className={cx("btn", shown ? "btn--gold" : "btn--glass", "rv-btn")} onClick={() => act("r")}>
              {!shown ? "Retourner la carte" : index + 1 >= pulled.length ? "Voir le résumé" : "Carte suivante"}
            </button>
          </div>

          <ol className="reveal__pips" aria-hidden="true">
            {pulled.map((p, i) => (
              <li
                key={p.card.id}
                className={cx("pip", (i < index || (i === index && shown)) && "pip--done", i === index && "pip--now")}
                style={{ "--pip": i < index || (i === index && shown) ? glowOf(p) : undefined }}
              />
            ))}
          </ol>
        </div>
      ) : null}

      {phase === "recap" ? <Recap opening={opening} onClose={onClose} onGift={onGift} /> : null}
    </div>,
    document.body,
  );
}

/** The back of a card, alone (cards still in the pack, the rest of the pile). */
function Dos({ dos, className, style }: { dos: string; className?: string; style?: Record<string, string | number> }) {
  return (
    <div className={cx("rv-dos", className)} style={style} aria-hidden="true">
      <div className={cx("back", `back--${dos}`)}>
        <span className="carte__monogram">F</span>
        <span className="carte__backword">FOOTDEX</span>
      </div>
    </div>
  );
}

/** Where the foil is cut: a little below the crimped strip, in % of the pack height. */
const CUT = 10;
const TOOTH = 4;
const JAG = 1.1;

function jagged(from: number, to: number): string[] {
  // the teeth sit on a fixed grid, so the pack and the torn strip always match
  const half = TOOTH / 2;
  const yg = (g: number) => CUT + (Math.abs(g) % 2 === 1 ? JAG : -JAG);
  const y = (x: number) => {
    const g = Math.floor(x / half);
    const k = x / half - g;
    return yg(g) * (1 - k) + yg(g + 1) * k;
  };
  const pt = (x: number) => `${x.toFixed(2)}% ${y(x).toFixed(2)}%`;
  const pts = [pt(from)];
  if (from < to) for (let g = Math.floor(from / half) + 1; g * half < to; g++) pts.push(pt(g * half));
  else for (let g = Math.ceil(from / half) - 1; g * half > to; g--) pts.push(pt(g * half));
  pts.push(pt(to));
  return pts;
}

function TearPack({
  kind,
  chemin,
  glow,
  hot,
  open,
  size,
  backs,
  dos,
  onTorn,
  onPull,
}: {
  size?: number;
  kind: PackKind;
  chemin: number;
  glow: string;
  hot: boolean;
  open: boolean;
  backs: number;
  dos: string;
  onTorn: () => void;
  onPull: () => void;
}) {
  const lean = useRef<HTMLDivElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const flapEl = useRef<HTMLDivElement | null>(null);
  const cards = useRef<HTMLDivElement | null>(null);
  const g = useRef<{ x: number; y: number; dir: number; moved: number; open: boolean; up: number } | null>(null);
  const t = useRef(0);
  const side = useRef(1);
  const done = useRef(false);
  const pulled = useRef(false);
  const sounded = useRef(false);
  const tapped = useRef(false);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function paint(k: number, dir: number) {
    const b = body.current;
    const f = flapEl.current;
    if (!b || !f) return;
    // the clip goes well past the edges, so the shadow and the glow of the pack stay whole
    if (k <= 0) {
      b.style.clipPath = "";
      f.style.visibility = "hidden";
      return;
    }
    const w = k * 100;
    if (dir > 0) {
      b.style.clipPath = `polygon(${w.toFixed(2)}% -30%, 130% -30%, 130% 140%, -30% 140%, -30% -30%, 0% -30%, ${jagged(0, w).join(", ")})`;
      f.style.clipPath = `polygon(0% 0%, ${w.toFixed(2)}% 0%, ${jagged(w, 0).join(", ")})`;
      f.style.transformOrigin = `${w.toFixed(2)}% ${CUT}%`;
      f.style.transform = `rotate(${(4 + 14 * k).toFixed(2)}deg) translateY(-${(2 * k).toFixed(2)}%)`;
    } else {
      const x0 = 100 - w;
      b.style.clipPath = `polygon(-30% -30%, ${x0.toFixed(2)}% -30%, ${jagged(x0, 100).join(", ")}, 100% -30%, 130% -30%, 130% 140%, -30% 140%)`;
      f.style.clipPath = `polygon(${x0.toFixed(2)}% 0%, 100% 0%, ${jagged(100, x0).join(", ")})`;
      f.style.transformOrigin = `${x0.toFixed(2)}% ${CUT}%`;
      f.style.transform = `rotate(-${(4 + 14 * k).toFixed(2)}deg) translateY(-${(2 * k).toFixed(2)}%)`;
    }
    f.style.visibility = "visible";
  }

  function setLean(e: PointerEvent | null) {
    const el = lean.current;
    if (!el) return;
    if (!e || light()) {
      el.style.transform = "";
      return;
    }
    const r = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.transform = `perspective(900px) rotateX(${((0.5 - py) * 12).toFixed(2)}deg) rotateY(${((px - 0.5) * 14).toFixed(2)}deg) scale(0.985)`;
  }

  /** Finir la déchirure (après le doigt, ou toute seule après un simple toucher), puis la bande tombe. */
  function finish(dir = side.current) {
    if (done.current) return;
    done.current = true;
    side.current = dir;
    if (!sounded.current) {
      sounded.current = true;
      tear();
    }
    const end = () => {
      paint(1, dir);
      flapEl.current?.classList.add("is-fallen");
      setLean(null);
      onTorn();
    };
    if (light()) return end();
    const from = t.current;
    const t0 = performance.now();
    const ms = 160 + (1 - from) * 340;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      t.current = from + (1 - from) * (1 - Math.pow(1 - k, 2));
      paint(t.current, dir);
      if (k < 1) frame.current = requestAnimationFrame(step);
      else end();
    };
    frame.current = requestAnimationFrame(step);
  }

  function lift(dy: number) {
    const c = cards.current;
    if (c) c.style.transform = dy ? `translateY(${dy.toFixed(1)}px)` : "";
  }

  function shiver() {
    const c = cards.current;
    if (!c || light()) return;
    c.classList.remove("is-shiver");
    void c.offsetWidth;
    c.classList.add("is-shiver");
    tick();
  }

  function doPull() {
    if (pulled.current) return;
    pulled.current = true;
    onPull();
  }

  return (
    <>
      <div
        className={cx("reveal__pack", "tp", hot && "reveal__pack--hot", open && "tp--open")}
        style={{ "--n": backs }}
        onPointerDown={(e: PointerEvent) => {
          g.current = { x: e.clientX, y: e.clientY, dir: 0, moved: 0, open, up: 0 };
          tapped.current = false;
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            /* not supported */
          }
          setLean(e);
          if (open) shiver();
        }}
        onPointerMove={(e: PointerEvent) => {
          const s = g.current;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          s.moved = Math.max(s.moved, Math.hypot(dx, dy));
          setLean(e);
          if (s.open) {
            if (pulled.current) return;
            const up = Math.max(-70, Math.min(0, dy));
            s.up = Math.min(s.up, dy);
            lift(up * 0.6);
            if (dy < -55) doPull();
            return;
          }
          if (done.current) return;
          if (!s.dir && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 0.6) s.dir = dx > 0 ? 1 : -1;
          if (!s.dir) return;
          side.current = s.dir;
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const raw = s.dir > 0 ? (e.clientX - r.left) / r.width : (r.right - e.clientX) / r.width;
          t.current = Math.max(t.current, Math.min(1, Math.max(0, raw)));
          if (!sounded.current && t.current > 0.08) {
            sounded.current = true;
            tear();
          }
          paint(t.current, s.dir);
          if (t.current >= 0.9) finish(s.dir);
        }}
        onPointerUp={() => {
          const s = g.current;
          g.current = null;
          setLean(null);
          if (!s) return;
          // a gesture that started on the closed pack does not take the cards out
          if (s.moved < 14) {
            // a simple touch: handled by the click that follows
            tapped.current = true;
            lift(0);
            return;
          }
          if (s.open) {
            lift(0);
            if (s.up < -30) doPull();
            return;
          }
          if (done.current) return;
          if (t.current > 0.3) finish(s.dir || 1);
          else {
            t.current = 0;
            paint(0, 1);
          }
        }}
        onClick={() => {
          if (!tapped.current) return;
          tapped.current = false;
          if (open) doPull();
          else finish(1);
        }}
        onPointerCancel={() => {
          g.current = null;
          setLean(null);
          lift(0);
          if (!done.current) {
            t.current = 0;
            paint(0, 1);
          }
        }}
        aria-hidden="true"
      >
        <div className="tp__lean" ref={lean}>
          <div className="tp__breath">
            <div className="tp__cards" ref={cards}>
              {Array.from({ length: backs }, (_, k) => (
                <Dos key={k} dos={dos} className="tp__card" style={{ "--k": k }} />
              ))}
            </div>
            <div className="tp__body" ref={body}>
              <PackArt size={size} kind={kind} chemin={chemin} glow={glow} />
            </div>
            <div className="tp__flap" ref={flapEl}>
              <PackArt size={size} kind={kind} chemin={chemin} glow={glow} />
            </div>
          </div>
        </div>
        {!open ? <span className="reveal__swipe" aria-hidden="true" /> : null}
      </div>
      <p className="reveal__hint" aria-live="polite">
        {open ? "Tire les cartes vers le haut, ou touche-les." : "Glisse ton doigt le long du haut du paquet pour le déchirer, ou touche-le."}
      </p>
      <button type="button" className="btn btn--gold rv-btn" onClick={() => (open ? doPull() : finish(1))}>
        {open ? "Sortir les cartes" : "Ouvrir le paquet"}
      </button>
    </>
  );
}

function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(reducedMotion() ? to : 0);
  useEffect(() => {
    if (reducedMotion()) return;
    let frame = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to]);
  return <>{fmt(n)}</>;
}

function Recap({ opening, onClose, onGift }: { opening: Opening; onClose: () => void; onGift?: () => void }) {
  const state = useStore();
  const { pulled, result, kind } = opening;
  const isPack = kind !== "boutique";
  const newChemin = result.cheminAfter > result.cheminBefore;
  const before = cheminOf(result.before);
  const after = cheminOf(result.after);
  const rewards = result.granted.flatMap((g) => g.rewards.map((r) => ({ r, at: g.at - g.chemin * CARDS_PER_CHEMIN, chemin: g.chemin })));
  const nextAt = Math.ceil((after.step + 1) / 20) * 20;

  useEffect(() => {
    const timers: number[] = [];
    if (result.stars > 0) timers.push(window.setTimeout(() => coins(Math.min(6, Math.ceil(result.stars / 5))), 500));
    if (rewards.length > 0) timers.push(window.setTimeout(() => fanfare("eclat"), 1100));
    if (newChemin) {
      const tone = CHEMINS[after.index].tone;
      timers.push(
        window.setTimeout(() => {
          fanfare("legende");
          crowd(1.3);
          rain([tone[0], "#ffd76a", "#ffffff", tone[0]], 180);
          vibrate([30, 60, 30, 60, 120]);
        }, 1500),
      );
    }
    return () => timers.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const freshCount = pulled.filter((p) => result.fresh.has(p.card.id)).length;
  return (
    <div className="recap">
      <p className="eyebrow">{opening.title}</p>
      <h2 className="recap__title">
        {pulled.length === 1 ? (freshCount ? "Nouvelle carte !" : "Un doublon") : freshCount === 0 ? "Que des doublons" : freshCount === 1 ? "1 nouvelle carte" : `${freshCount} nouvelles cartes`}
      </h2>
      <div className={cx("recap__cards", pulled.length === 1 && "recap__cards--one")}>
        {pulled.map((p, i) => (
          <div key={p.card.id} className="recap__slot" style={{ "--i": i }}>
            <Carte
              card={p.card}
              shiny={p.shiny}
              fresh={result.fresh.has(p.card.id)}
              stars={result.starsByCard[p.card.id]}
              size={pulled.length === 1 ? "md" : "sm"}
              tilt={false}
              onClick={() => {
                onClose();
                go(cardRoute(p.card));
              }}
              label={`${p.card.name}, ouvrir la fiche`}
            />
          </div>
        ))}
      </div>

      {result.stars > 0 ? (
        <p className="recap__stars">
          <Piece />  +<CountUp to={result.stars} /> pièces avec les doublons
        </p>
      ) : null}
      {kind === "boutique" ? <p className="recap__note">Il te reste {fmt(state.stars)} pièces.</p> : null}

      {isPack ? (
        <section className="recap__path" aria-label="Ton chemin">
          <p className="recap__chemin">
            Chemin {after.index + 1} · {CHEMINS[after.index].name}
            {after.index === CHEMINS.length - 1 ? ` · niveau ${after.level}` : ""}
          </p>
          <PathBar from={newChemin ? 0 : before.step} to={after.step} chemin={after.index} />
          <p className="recap__steps">
            {fmt(after.step)} / {CARDS_PER_CHEMIN} cartes sur ce chemin · prochaine récompense dans {nextAt - after.step} carte{nextAt - after.step > 1 ? "s" : ""}
          </p>
        </section>
      ) : null}

      {rewards.length > 0 ? (
        <ul className="recap__rewards" aria-label="Récompenses gagnées">
          {rewards.map(({ r, at, chemin }, i) => (
            <li key={i} style={{ "--i": i }}>
              <RewardIcon reward={r} />
              <span>
                <strong>{rewardText(r)}</strong>
                <small>
                  {at} cartes sur le chemin {chemin + 1}
                </small>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {newChemin ? (
        <div className="recap__newpath" style={{ "--p1": CHEMINS[after.index].tone[0], "--p2": CHEMINS[after.index].tone[1] }}>
          <p className="eyebrow">Nouveau chemin débloqué</p>
          <h3>
            Chemin {after.index + 1} : {CHEMINS[after.index].name}
          </h3>
          <p>{CHEMINS[after.index].text}</p>
        </div>
      ) : null}

      <div className="recap__actions">
        {state.gifts.length > 0 && onGift ? (
          <button type="button" className="btn btn--gold btn--big" onClick={onGift}>
            <LuGift aria-hidden="true" /> Ouvrir mon cadeau{state.gifts.length > 1 ? ` (${state.gifts.length})` : ""}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn--soft"
          onClick={() => {
            onClose();
            go({ page: "classeur" });
          }}
        >
          Voir mon classeur
        </button>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}
