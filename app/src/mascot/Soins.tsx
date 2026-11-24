// Le mini-jeu « Le soigner complètement » : on arrache les pansements d'un coup de doigt (il n'aime pas ça),
// on casse les plâtres en tapant dessus (il a peur), et à la fin il est tout content, comme neuf.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuX } from "react-icons/lu";
import { burst, vibrate } from "../fx";
import { burstOut, fanfare, ripFinish, snap, thud } from "../sound";
import { cx } from "../util";
import { Fig } from "./Fig";
import { PERSOS, pick } from "./lines";
import { say, useMascot, wornLook } from "./state";
import { heal, onWounds, wounds, type Wounds } from "./wounds";

type Piece =
  | { id: string; kind: "pansement"; x: number; y: number; rot: number }
  | { id: string; kind: "platre"; part: "legA" | "legB" | "arm"; x: number; y: number; w: number; h: number };

const AIE = ["Aïe ! Doucement !", "Ouille, ça tire !", "Aaaah ! Ça pique !", "Ouïe ouïe ouïe !", "Hé ! Pas si fort !"];
const PEUR = ["Attention, j'ai peur !", "Doucement, s'il te plaît !", "Oh là là, tu es sûr ?", "Je ferme les yeux…"];
const OUF = ["Ouf ! Ma jambe est libre !", "Ça fait du bien !", "Je peux bouger !"];
const CONTENT = ["Je suis tout neuf ! Merci, docteur !", "Plus un seul bobo ! On va jouer au foot ?", "Merci ! Je me sens super bien !"];
const COUPS = 3; // coups pour casser un plâtre

// Où sont posés les pansements et les plâtres sur le personnage (en % de la case du dessin).
const SPOTS = [
  { x: 42, y: 13, rot: -20 },
  { x: 58, y: 30, rot: 15 },
  { x: 34, y: 38, rot: 35 },
  { x: 70, y: 44, rot: -30 },
  { x: 47, y: 52, rot: 8 },
  { x: 55, y: 64, rot: -12 },
];

function pieces(w: Wounds): Piece[] {
  const out: Piece[] = [];
  const nb = w.b + (w.nose ? 1 : 0);
  for (let i = 0; i < Math.min(nb, SPOTS.length); i++) out.push({ id: `p${i}`, kind: "pansement", ...SPOTS[i] });
  if (w.legB) out.push({ id: "legB", kind: "platre", part: "legB", x: 43, y: 83, w: 11, h: 14 });
  if (w.legA) out.push({ id: "legA", kind: "platre", part: "legA", x: 57, y: 83, w: 11, h: 14 });
  if (w.arm) out.push({ id: "arm", kind: "platre", part: "arm", x: 27, y: 65, w: 10, h: 15 });
  return out;
}

/** La fenêtre du mini-jeu. */
export function Soins({ onClose }: { onClose: () => void }) {
  const m = useMascot();
  const perso = PERSOS[m.s.perso];
  const [list, setList] = useState<Piece[]>(() => pieces(wounds()));
  const [gone, setGone] = useState<Record<string, "arrache" | "casse">>({});
  const [coups, setCoups] = useState<Record<string, number>>({});
  const [peel, setPeel] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [humeur, setHumeur] = useState<"" | "aie" | "peur" | "content">("");
  const [fini, setFini] = useState(false);
  const zone = useRef<HTMLDivElement | null>(null);
  const humeurTimer = useRef(0);
  const finTimer = useRef(0);
  const finDrag = useRef<(() => void) | null>(null);
  const goneRef = useRef<Record<string, "arrache" | "casse">>({});
  const coupsRef = useRef<Record<string, number>>({});
  const listRef = useRef(list);
  listRef.current = list;

  // si une blessure arrive pendant le jeu, elle rejoint la liste (les morceaux déjà retirés restent retirés)
  useEffect(
    () =>
      onWounds(() => {
        if (fini) return;
        setList((l: Piece[]) => {
          const ids = new Set(l.map((p) => p.id));
          const neufs = pieces(wounds()).filter((p) => !ids.has(p.id) && !goneRef.current[p.id]);
          return neufs.length ? [...l, ...neufs] : l;
        });
      }),
    [fini],
  );
  useEffect(() => {
    const echap = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", echap);
    (document.querySelector(".soins__bar .btn") as HTMLElement | null)?.focus();
    return () => {
      window.removeEventListener("keydown", echap);
      window.clearTimeout(humeurTimer.current);
      window.clearTimeout(finTimer.current);
      finDrag.current?.();
    };
  }, []);

  const restants = list.filter((p) => !gone[p.id]).length;
  const total = list.length;

  // au clavier : Entrée ou Espace arrache le pansement d'un coup
  function arracherClavier(e: KeyboardEvent, p: Piece) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (goneRef.current[p.id]) return;
    ripFinish();
    mood("aie", 1100);
    say(pick(AIE));
    retire(p.id, "arrache");
  }

  function mood(h: "aie" | "peur", ms = 900) {
    setHumeur(h);
    window.clearTimeout(humeurTimer.current);
    humeurTimer.current = window.setTimeout(() => setHumeur(""), ms);
  }

  function retire(id: string, comment: "arrache" | "casse") {
    if (goneRef.current[id]) return;
    const next = { ...goneRef.current, [id]: comment };
    goneRef.current = next;
    setGone(next);
    if (listRef.current.every((p) => next[p.id])) {
      finTimer.current = window.setTimeout(() => {
        window.clearTimeout(humeurTimer.current);
        heal();
        setFini(true);
        setHumeur("content");
        fanfare("legende");
        vibrate([30, 40, 30, 40, 120]);
        const r = zone.current?.getBoundingClientRect();
        if (r) burst(r.left + r.width / 2, r.top + r.height / 3, ["#f6c453", "#34d399", "#60a5fa", "#f472b6"], 120);
        say(pick(CONTENT));
      }, 650);
    }
  }

  // Pansement : on l'attrape et on tire d'un coup.
  function tirer(e: PointerEvent, p: Piece) {
    if (goneRef.current[p.id]) return;
    const el = e.currentTarget as HTMLElement;
    const sx = e.clientX;
    const sy = e.clientY;
    const pid = e.pointerId;
    try {
      el.setPointerCapture(pid);
    } catch {
      /* rien */
    }
    let fait = false;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pid || fait) return;
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      setPeel({ id: p.id, dx, dy });
      if (Math.hypot(dx, dy) > 70) {
        fait = true;
        ripFinish();
        vibrate(35);
        mood("aie", 1100);
        say(pick(AIE));
        setPeel(null);
        retire(p.id, "arrache");
        end();
      }
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      if (!fait) setPeel(null); // pas assez tiré : il se recolle
      end();
    };
    function end() {
      finDrag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    }
    finDrag.current = end;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  // Plâtre : on tape dessus jusqu'à ce qu'il casse.
  function taper(p: Piece) {
    if (goneRef.current[p.id]) return;
    const n = (coupsRef.current[p.id] ?? 0) + 1;
    coupsRef.current = { ...coupsRef.current, [p.id]: n };
    setCoups(coupsRef.current);
    if (n < COUPS) {
      thud();
      vibrate(25);
      mood("peur", 1200);
      if (n === 1) say(pick(PEUR));
    } else {
      snap();
      burstOut();
      vibrate([20, 30, 60]);
      say(pick(OUF));
      retire(p.id, "casse");
    }
  }

  const mouth = humeur === "aie" || humeur === "peur" ? "open" : humeur === "content" || fini ? "grin" : "smile";
  const look = m.s.look && wornLook();

  return createPortal(
    <div className="soins" role="dialog" aria-modal="true" aria-label={`Soigner ${perso.name}`}>
      <div className="soins__bar">
        <button type="button" className="btn btn--soft" onClick={onClose}><LuX aria-hidden="true" /> Fermer</button>
        <strong>{fini ? `${perso.name} est tout neuf !` : `Soigne ${perso.name}`}</strong>
        <span className="soins__compte">{fini ? "" : `${total - restants} / ${total}`}</span>
      </div>
      <p className="soins__aide">
        {fini
          ? "Plus aucun pansement, plus aucun plâtre. Il est tout content !"
          : "Attrape un pansement et tire d'un coup. Tape 3 fois sur un plâtre pour le casser."}
      </p>
      <div className={cx("soins__perso", humeur && `is-${humeur}`, fini && "is-fini")} ref={zone}>
        <Fig look={look} size={300} mouth={mouth} cheer={fini} hurt={humeur === "aie" ? 1 : 0} mode={perso.mode} />
        {list.map((p) =>
          p.kind === "pansement" ? (
            <span
              key={p.id}
              className={cx("pansement", gone[p.id] && "is-parti")}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: `translate(-50%, -50%) rotate(${p.rot}deg) ${peel?.id === p.id ? `translate(${peel.dx * 0.35}px, ${peel.dy * 0.35}px) rotateX(${Math.min(60, Math.hypot(peel.dx, peel.dy))}deg)` : ""}`,
              }}
              onPointerDown={(e: PointerEvent) => tirer(e, p)}
              onKeyDown={(e: KeyboardEvent) => arracherClavier(e, p)}
              tabIndex={gone[p.id] ? -1 : 0}
              role="button"
              aria-label="Pansement : tire dessus pour l'arracher"
            >
              <i />
            </span>
          ) : (
            <button
              key={p.id}
              type="button"
              className={cx("platre", `platre--${p.part}`, gone[p.id] && "is-casse")}
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%` }}
              onClick={() => taper(p)}
              aria-label="Plâtre : tape dessus pour le casser"
            >
              {(coups[p.id] ?? 0) >= 1 ? <span className="platre__fente platre__fente--1" /> : null}
              {(coups[p.id] ?? 0) >= 2 ? <span className="platre__fente platre__fente--2" /> : null}
              {gone[p.id] ? (
                <>
                  <span className="platre__morceau platre__morceau--a" />
                  <span className="platre__morceau platre__morceau--b" />
                  <span className="platre__morceau platre__morceau--c" />
                </>
              ) : null}
            </button>
          ),
        )}
      </div>
      {fini ? <button type="button" className="btn btn--gold btn--big soins__ok" onClick={onClose}>Super !</button> : null}
    </div>,
    document.body,
  );
}

/** Est-ce qu'il a quelque chose à soigner ? */
export function aSoigner(w: Wounds = wounds()): boolean {
  return w.b > 0 || !!w.nose || w.legA || w.legB || w.arm;
}

let ouvrir: (() => void) | null = null;
/** Lance le mini-jeu (depuis le menu du personnage). */
export function ouvrirSoins() {
  ouvrir?.();
}
/** À poser une fois dans l'appli. */
export function SoinsHote() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    ouvrir = () => setOn(true);
    return () => {
      ouvrir = null;
    };
  }, []);
  return on ? <Soins onClose={() => setOn(false)} /> : null;
}
