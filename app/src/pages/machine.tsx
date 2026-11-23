import { createPortal } from "react-dom";
// La machine à secrets, façon machine du casino : on glisse sa carte dans la fente, on tire le levier,
// les rouleaux tournent, BOUM, une enveloppe tombe dans le bac ; on casse le cachet et on lit l'histoire.
import { useEffect, useMemo, useRef, useState } from "react";
import { LuArrowLeft, LuArrowRight, LuVolume2 } from "react-icons/lu";
import { cheminOf, type CardRef } from "../cards";
import { type Album } from "../data";
import { vibrate } from "../fx";
import { say } from "../mascot/state";
import { CARTES_SPECIALES, SECRETS, marquerMachine, useMission } from "../mission";
import { reglages } from "../reglages-jeu";
import { burstOut, click, crinkle, fanfare, riser, snap, tear, thump, tick } from "../sound";
import { gagnerEtoiles, useStore } from "../store";
import { PageTitle } from "../ui/bits";
import { Carte } from "../ui/cards";
import { cx, youtubeSearch } from "../util";
import { usePools } from "./packs";

const HOLD_MS = 380;
const SLOP = 12;
const CELL = 44; // hauteur d'un symbole sur un rouleau
const LINE_Y = 216; // la ligne gagnante
const PIVOT_Y = 285; // le levier tourne autour de ce point
const KNOB_UP = 128;
const KNOB_DOWN = 352;

type Phase = "choix" | "dedans" | "tourne" | "sortie" | "lu";
type Item = { id: string; nom: string; card?: CardRef; special?: { nom: string; sous: string } };
type Drag = { x: number; y: number; ox: number; oy: number; w: number };
type Story = { titre: string; texte: string };

// ------------------------------------------------------------------ les dessins

const INK = "#1b2233";
const GD = "#a8761c";
const G = "#f6c453";
const G2 = "#ffe9a8";

function pent(cx: number, cy: number, r: number, rot: number) {
  return Array.from({ length: 5 }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / 5;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}
function SymBall({ x, y, r = 19 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#f8f9fc" stroke={INK} strokeWidth={r * 0.08} />
      <polygon points={pent(x, y, r * 0.33, -Math.PI / 2)} fill={INK} />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        return (
          <g key={i}>
            <line x1={x + r * 0.31 * Math.cos(a)} y1={y + r * 0.31 * Math.sin(a)} x2={x + r * 0.67 * Math.cos(a)} y2={y + r * 0.67 * Math.sin(a)} stroke={INK} strokeWidth={r * 0.07} />
            <polygon points={pent(x + r * 0.82 * Math.cos(a), y + r * 0.82 * Math.sin(a), r * 0.16, a + Math.PI)} fill={INK} />
          </g>
        );
      })}
    </g>
  );
}
function SymCup({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y + 2}) scale(1.25)`}>
      <path d="M-14,-16 H14 V-6 Q14,8 0,10 Q-14,8 -14,-6Z" fill={G} stroke={GD} strokeWidth="2" />
      <path d="M-14,-12 Q-24,-12 -22,-2 Q-20,4 -12,4 M14,-12 Q24,-12 22,-2 Q20,4 12,4" fill="none" stroke={GD} strokeWidth="3" />
      <rect x="-3" y="10" width="6" height="7" fill={GD} />
      <rect x="-10" y="16" width="20" height="5" rx="2" fill={G} stroke={GD} />
    </g>
  );
}
function starPts(x: number, y: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}
function SymStar({ x, y }: { x: number; y: number }) {
  return <polygon points={starPts(x, y, 20)} fill={G} stroke={GD} strokeWidth="1.5" />;
}
function SymLock({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y + 3}) scale(1.15)`}>
      <path d="M-9,-4 V-11 Q-9,-20 0,-20 Q9,-20 9,-11 V-4" fill="none" stroke="#c9d4ea" strokeWidth="4" />
      <rect x="-13" y="-5" width="26" height="20" rx="4" fill={G} stroke={GD} strokeWidth="2" />
      <circle cx="0" cy="4" r="3" fill={INK} />
    </g>
  );
}
const SYMS = [SymBall, SymCup, SymStar, SymLock];

/** Un rouleau : une bande de symboles vue par une fenêtre. `at` = le symbole sur la ligne. */
function Reel({ i, at, spinning }: { i: number; at: number; spinning: boolean }) {
  const x = 62 + i * 82;
  const cx = x + 37;
  const cells = spinning ? Array.from({ length: 12 }, (_, k) => k % 4) : [at + 3, at, at + 1].map((n) => n % 4);
  return (
    <g>
      <clipPath id={`rouleau-${i}`}>
        <rect x={x} y={160} width={74} height={112} rx={8} />
      </clipPath>
      <rect x={x} y={160} width={74} height={112} rx={8} fill="#fdfaf0" />
      <g clipPath={`url(#rouleau-${i})`}>
        {spinning ? (
          <g className="mx-strip" style={{ animationDuration: `${0.2 + i * 0.03}s` }}>
            {cells.map((n, k) => {
              const S = SYMS[n];
              return (
                <g key={k} opacity="0.75">
                  <S x={cx} y={LINE_Y - CELL + k * CELL - 4 * CELL} />
                </g>
              );
            })}
          </g>
        ) : (
          <g className="mx-stop">
            {cells.map((n, k) => {
              const S = SYMS[n];
              return (
                <g key={k} opacity={k === 1 ? 1 : 0.35}>
                  <S x={cx} y={LINE_Y + (k - 1) * CELL * 1.27} />
                </g>
              );
            })}
          </g>
        )}
      </g>
      <rect x={x} y={160} width={74} height={112} rx={8} fill="url(#mx-vitre)" />
    </g>
  );
}

function Bulbs({ pts, phase }: { pts: [number, number][]; phase: Phase }) {
  return (
    <g className={cx("mx-bulbs", (phase === "tourne" || phase === "sortie") && "mx-bulbs--chase", phase === "dedans" && "mx-bulbs--wait")}>
      {pts.map(([x, y], k) => (
        <g key={k} className={k % 2 ? "mx-bulb mx-bulb--b" : "mx-bulb"}>
          <circle cx={x} cy={y} r="11" fill="url(#mx-halo)" className="mx-bulb__glow" />
          <circle cx={x} cy={y} r="5" className="mx-bulb__dot" />
        </g>
      ))}
    </g>
  );
}

function line(x1: number, y1: number, x2: number, y2: number, n: number): [number, number][] {
  return Array.from({ length: n }, (_, i) => [x1 + ((x2 - x1) * i) / (n - 1), y1 + ((y2 - y1) * i) / (n - 1)] as [number, number]);
}
const BULBS = [...line(62, 118, 98, 62, 4), ...line(118, 48, 242, 48, 5), ...line(262, 62, 298, 118, 4)];

function Envelope({ open }: { open?: boolean }) {
  return (
    <g className={cx("mx-env", open && "is-open")}>
      <rect x="-40" y="-26" width="80" height="52" rx="5" fill="url(#mx-or)" stroke={GD} strokeWidth="2" />
      <path d="M-40,-26 L0,4 L40,-26" fill="none" stroke={GD} strokeWidth="2.5" />
      <circle cx="0" cy="4" r="11" fill="#c0262f" stroke="#7a1018" strokeWidth="2" />
      <polygon points={starPts(0, 4, 6)} fill="#ffd0d0" />
    </g>
  );
}

// ------------------------------------------------------------------ la page

export function Machine({ album }: { album: Album }) {
  const st = useStore();
  const m = useMission();
  const ch = cheminOf(st.opened);
  const { pools } = usePools(album, ch.index);
  const byId = useMemo(() => {
    const map = new Map<string, CardRef>();
    for (const list of Object.values(pools)) for (const c of list) map.set(c.id, c);
    return map;
  }, [pools]);

  // Les cartes à mettre dans la machine : les spéciales gagnées en mission, puis les joueurs, les plus récents d'abord.
  const items: Item[] = useMemo(() => {
    const specials: Item[] = m.gagnees.map((id) => ({ id: `s:${id}`, nom: CARTES_SPECIALES[id]?.nom ?? id, special: { nom: CARTES_SPECIALES[id]?.nom ?? id, sous: CARTES_SPECIALES[id]?.sous ?? "" } }));
    const players: Item[] = album.album
      .filter((p) => st.cards[`a:${p.id}`])
      .sort((a, b) => (st.cards[`a:${b.id}`]?.[2] ?? 0) - (st.cards[`a:${a.id}`]?.[2] ?? 0))
      .map((p) => ({ id: `a:${p.id}`, nom: p.display, card: byId.get(`a:${p.id}`) }));
    return [...specials, ...players];
  }, [m.gagnees, album, st.cards, byId]);

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("choix");
  const [inside, setInside] = useState<Item | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hot, setHot] = useState(false);
  const [swallow, setSwallow] = useState<{ x: number; y: number } | null>(null);
  const [stops, setStops] = useState<[number, number, number]>([0, 2, 1]);
  const [spin, setSpin] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [knob, setKnob] = useState(KNOB_UP);
  const [leverMoving, setLeverMoving] = useState(false);
  const [boum, setBoum] = useState(false);
  const [hint, setHint] = useState("");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const slotRef = useRef<SVGRectElement | null>(null);
  const timers = useRef<number[]>([]);
  const cur = items.length ? items[Math.min(idx, items.length - 1)] : null;

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  // on arrive directement devant la machine
  const sceneRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => sceneRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 250);
    return () => window.clearTimeout(t);
  }, []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  function overSlot(x: number, y: number): boolean {
    const r = slotRef.current?.getBoundingClientRect();
    if (!r) return false;
    const mx = r.width * 0.35;
    const my = r.height * 1.6;
    return x > r.left - mx && x < r.right + mx && y > r.top - my && y < r.bottom + my;
  }

  // --- 1 et 2 : rester appuyé sur la carte, la promener jusqu'à la fente
  function press(e: PointerEvent) {
    if (phase !== "choix" || !cur) return;
    if (e.button !== undefined && e.button > 0) return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const pid = e.pointerId;
    let lifted = false;
    let gone = false;
    let lx = sx;
    let ly = sy;
    const lift = () => {
      if (gone) return;
      lifted = true;
      try {
        el.setPointerCapture(pid);
      } catch {
        /* marche quand même */
      }
      vibrate(18);
      crinkle(0.3);
      setHint("");
      setDrag({ x: lx, y: ly, ox: sx - rect.left, oy: sy - rect.top, w: rect.width });
    };
    const holdTimer = window.setTimeout(lift, HOLD_MS);
    const block = (ev: TouchEvent) => {
      if (lifted && ev.cancelable) ev.preventDefault();
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      lx = ev.clientX;
      ly = ev.clientY;
      if (!lifted) {
        if (Math.hypot(lx - sx, ly - sy) > SLOP) cleanup();
        return;
      }
      setDrag((d: Drag | null) => (d ? { ...d, x: lx, y: ly } : d));
      setHot(overSlot(lx, ly));
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      const wasLifted = lifted;
      cleanup();
      if (!wasLifted) {
        setHint("Reste appuyé sur ta carte, puis glisse-la dans la fente.");
        return;
      }
      if (overSlot(ev.clientX, ev.clientY)) insert();
      else crinkle(0.2);
    };
    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId === pid) cleanup();
    };
    function cleanup() {
      gone = true;
      window.clearTimeout(holdTimer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("touchmove", block);
      setDrag(null);
      setHot(false);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("touchmove", block, { passive: false });
  }

  // --- 3 : la fente avale la carte, « clac »
  function insert() {
    if (!cur) return;
    const r = slotRef.current?.getBoundingClientRect();
    setSwallow(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 });
    setInside(cur);
    later(() => {
      snap();
      vibrate(25);
      setSwallow(null);
      setPhase("dedans");
      setHint("Tire le levier !");
    }, 420);
  }

  // --- 4 : le levier, qu'on descend avec le doigt (ou qu'on touche)
  function pressLever(e: PointerEvent) {
    if (phase !== "dedans" || leverMoving) return;
    const svg = svgRef.current;
    if (!svg) return;
    const scale = 560 / svg.getBoundingClientRect().height;
    const sy = e.clientY;
    const pid = e.pointerId;
    const el = e.currentTarget as Element;
    try {
      (el as HTMLElement).setPointerCapture?.(pid);
    } catch {
      /* rien */
    }
    let moved = false;
    let last = KNOB_UP;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      const dy = (ev.clientY - sy) * scale;
      if (Math.abs(dy) > 6) moved = true;
      last = Math.max(KNOB_UP, Math.min(KNOB_DOWN, KNOB_UP + dy));
      setKnob(last);
      if (last > KNOB_UP + (KNOB_DOWN - KNOB_UP) * 0.75) {
        done();
        pull(last);
      }
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      done();
      if (!moved || last > KNOB_UP + (KNOB_DOWN - KNOB_UP) * 0.4) pull(last);
      else setKnob(KNOB_UP); // pas assez tiré : il remonte
    };
    function done() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function pull(from: number) {
    if (leverMoving) return;
    setLeverMoving(true);
    setHint("");
    click("button");
    // il finit de descendre, puis remonte tout seul
    animateKnob(from, KNOB_DOWN, 140, () => {
      thump();
      animateKnob(KNOB_DOWN, KNOB_UP, 420, () => setLeverMoving(false));
      spinReels();
    });
  }

  function animateKnob(a: number, b: number, ms: number, end: () => void) {
    const t0 = performance.now();
    const stepFn = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = b > a ? k * k : 1 - (1 - k) * (1 - k) * (1 - k) + Math.sin(k * Math.PI) * 0.04;
      setKnob(a + (b - a) * Math.min(1.02, e));
      if (k < 1) requestAnimationFrame(stepFn);
      else {
        setKnob(b);
        end();
      }
    };
    requestAnimationFrame(stepFn);
  }

  // --- 4 et 5 : les rouleaux tournent puis s'arrêtent un par un sur trois ballons
  function spinReels() {
    setPhase("tourne");
    setSpin([true, true, true]);
    riser(2.2);
    vibrate([10, 60, 10, 60, 10]);
    const ticker = window.setInterval(() => tick(), 110);
    timers.current.push(ticker);
    [1500, 1950, 2400].forEach((ms, i) =>
      later(() => {
        setSpin((s: [boolean, boolean, boolean]) => {
          const n = [...s] as [boolean, boolean, boolean];
          n[i] = false;
          return n;
        });
        setStops((s: [number, number, number]) => {
          const n = [...s] as [number, number, number];
          n[i] = 0;
          return n;
        });
        thump();
        vibrate(20);
        if (i === 2) window.clearInterval(ticker);
      }, ms),
    );
    later(() => {
      setBoum(true);
      burstOut();
      fanfare("legende");
      vibrate([40, 40, 120]);
      setPhase("sortie");
      setHint("Touche l'enveloppe pour l'ouvrir !");
      if (inside && marquerMachine(inside.id)) {
        const g = reglages().gainMachine;
        if (g > 0) {
          gagnerEtoiles(g);
          say(`Première fois dans la machine : +${g} pièces !`);
        }
      }
      later(() => setBoum(false), 1100);
    }, 2650);
  }

  // --- 6 : on ouvre l'enveloppe
  const stories: Story[] = useMemo(() => {
    if (!inside) return [];
    if (inside.id.startsWith("s:")) return SECRETS[inside.id.slice(2)] ?? [];
    const p = album.byId.get(inside.id.slice(2));
    return (p?.anecdotes ?? []).map((a) => ({ titre: a.title, texte: a.text }));
  }, [inside, album]);
  const joueur = inside?.id.startsWith("a:") ? album.byId.get(inside.id.slice(2)) : undefined;

  function openEnvelope() {
    if (phase !== "sortie") return;
    tear();
    vibrate(15);
    setHint("");
    setPhase("lu");
    const first = stories[0];
    later(() => (first ? say(`${first.titre}. ${first.texte}`) : say("Cette carte n'a pas encore de secret. D'autres arrivent bientôt !")), 900);
  }

  function again() {
    click("back");
    setPhase("choix");
    setInside(null);
    setStops([0, 2, 1]);
    setHint("");
  }

  function browse(delta: number) {
    if (phase !== "choix" || !items.length) return;
    click("soft");
    setIdx((i: number) => (i + delta + items.length) % items.length);
  }

  const cardEl = (it: Item, size: "sm" | "md" = "sm") =>
    it.card ? (
      <Carte card={it.card} shiny={(st.cards[it.id]?.[3] ?? 0) > 0} size={size} tilt={false} label={it.nom} />
    ) : (
      <div className="mx-special">
        <b>Carte spéciale</b>
        <strong>{it.special?.nom ?? it.nom}</strong>
        <span>{it.special?.sous}</span>
      </div>
    );

  const armTop = Math.min(knob, PIVOT_Y);
  const armH = Math.abs(PIVOT_Y - knob);

  return (
    <div className={cx("mx", drag && "mx--drag")}>
      <PageTitle kicker="Découvre" title="La machine à secrets">
        Glisse une carte dans la fente, tire le levier, et attrape le secret qui tombe.
      </PageTitle>

      <div className="mx__scene" ref={sceneRef}>
        <div className="mx__machine">
          <svg ref={svgRef} viewBox="0 0 380 560" className={cx("mx-svg", boum && "mx-svg--boum", phase === "tourne" && "mx-svg--shake")} role="img" aria-label="La machine à secrets">
            <defs>
              <linearGradient id="mx-caisse" x1="0" x2="1"><stop offset="0" stopColor="#1d1247" /><stop offset=".5" stopColor="#3a2a86" /><stop offset="1" stopColor="#1d1247" /></linearGradient>
              <linearGradient id="mx-or" x1="0" x2="1"><stop offset="0" stopColor={GD} /><stop offset=".45" stopColor={G2} /><stop offset="1" stopColor={GD} /></linearGradient>
              <linearGradient id="mx-vitre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity=".4" /><stop offset=".28" stopColor="#000" stopOpacity="0" /><stop offset=".72" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".4" /></linearGradient>
              <radialGradient id="mx-halo"><stop offset="0" stopColor={G} stopOpacity=".9" /><stop offset="1" stopColor={G} stopOpacity="0" /></radialGradient>
              <radialGradient id="mx-rouge" cx=".35" cy=".35"><stop offset="0" stopColor="#ff8a8a" /><stop offset=".6" stopColor="#e2333f" /><stop offset="1" stopColor="#7a1018" /></radialGradient>
            </defs>
            <ellipse cx="180" cy="540" rx="150" ry="12" fill="#000" opacity=".5" />
            {/* la couronne et son enseigne */}
            <path d="M40,130 Q40,40 180,30 Q320,40 320,130Z" fill="url(#mx-caisse)" stroke="url(#mx-or)" strokeWidth="6" />
            <Bulbs pts={BULBS} phase={phase} />
            <rect x="78" y="78" width="204" height="40" rx="10" fill="#0b0720" stroke={G} strokeWidth="2" />
            <text x="180" y="105" textAnchor="middle" className="mx-sign">MACHINE À SECRETS</text>
            {/* la caisse */}
            <rect x="30" y="128" width="300" height="390" rx="22" fill="url(#mx-caisse)" stroke="url(#mx-or)" strokeWidth="6" />
            <rect x="52" y="150" width="256" height="132" rx="14" fill="#0b0720" stroke={G} strokeWidth="3" />
            {[0, 1, 2].map((i) => (
              <Reel key={i} i={i} at={stops[i]} spinning={spin[i]} />
            ))}
            <line x1="56" y1={LINE_Y} x2="304" y2={LINE_Y} stroke="#e2333f" strokeWidth="2" opacity=".7" />
            {/* la fente */}
            <g className={cx("mx-slot", hot && "is-hot", phase === "choix" && "is-ready")}>
              <ellipse cx="180" cy="321" rx="100" ry="34" fill="url(#mx-halo)" className="mx-slot__glow" />
              <rect x="96" y="304" width="168" height="34" rx="10" fill="#0b0720" stroke={G} strokeWidth="3" className="mx-slot__frame" />
              <rect ref={slotRef} x="116" y="316" width="128" height="10" rx="5" fill="#000" stroke={GD} strokeWidth="1.5" />
              {inside && phase !== "choix" ? <rect x="128" y="309" width="104" height="9" rx="2" fill="#1b2a5e" stroke={G} strokeWidth="1.5" className="mx-slot__card" /> : null}
              <text x="180" y="357" textAnchor="middle" className="mx-slot__label">{phase === "choix" ? "GLISSE TA CARTE ICI" : inside ? inside.nom.toUpperCase() : ""}</text>
            </g>
            {/* les boutons */}
            <rect x="60" y="370" width="240" height="52" rx="12" fill="#120a2e" stroke={GD} strokeWidth="2" />
            {(["#e2333f", "#2fd38a", "#2f6bff", G] as const).map((c, k) => (
              <g key={c} className={cx("mx-btn", phase === "tourne" && "is-on")} style={{ animationDelay: `${k * 0.12}s` }}>
                <circle cx={110 + k * 50} cy="396" r="13" fill={c} stroke="#0008" strokeWidth="3" />
                <circle cx={106 + k * 50} cy="391" r="4" fill="#fff" opacity=".5" />
              </g>
            ))}
            {/* le bac */}
            <rect x="70" y="436" width="220" height="62" rx="14" fill="#0b0720" stroke="url(#mx-or)" strokeWidth="5" />
            <rect x="82" y="446" width="196" height="40" rx="9" fill="#05030f" />
            {phase === "sortie" ? (
              <g className="mx-tray" onClick={openEnvelope} role="button" aria-label="Ouvrir l'enveloppe du secret">
                <ellipse cx="180" cy="466" rx="110" ry="40" fill="url(#mx-halo)" className="mx-tray__glow" />
                <g className="mx-drop">
                  <g transform="translate(180,462) scale(.85)">
                    <Envelope />
                  </g>
                </g>
              </g>
            ) : null}
            {/* le levier */}
            <rect x="326" y="250" width="18" height="70" rx="8" fill="url(#mx-or)" />
            <g className={cx("mx-lever", phase === "dedans" && !leverMoving && "is-ready")} onPointerDown={pressLever} role="button" aria-label="Tirer le levier">
              <rect x="320" y={Math.min(KNOB_UP, knob) - 30} width="40" height={KNOB_DOWN - KNOB_UP + 60} fill="transparent" />
              <rect x="330" y={armTop} width="10" height={Math.max(4, armH)} rx="5" fill="#c9d4ea" stroke="#7d8696" strokeWidth="2" />
              <circle cx="335" cy={knob} r="34" fill="url(#mx-halo)" className="mx-lever__glow" />
              <circle cx="335" cy={knob} r="19" fill="url(#mx-rouge)" stroke="#5a0c12" strokeWidth="2" />
              <circle cx="329" cy={knob - 6} r="5" fill="#fff" opacity=".55" />
            </g>
            {phase === "dedans" && !leverMoving ? (
              <g className="mx-pullhint" aria-hidden="true">
                <text x="356" y="40" textAnchor="end" className="mx-pull">TIRE !</text>
                <path d="M362,140 Q376,230 362,320" fill="none" stroke={G2} strokeWidth="3" strokeDasharray="6 6" />
                <path d="M362,330 l-8,-13 l15,1z" fill={G2} />
              </g>
            ) : null}
            {boum ? <text x="180" y="300" textAnchor="middle" className="mx-boum">BOUM !</text> : null}
          </svg>
        </div>

        <div className="mx__deck">
          <p className="mx__decktitle">Tes cartes</p>
          {cur ? (
            <div className="mx__pick">
              <button type="button" className="btn btn--soft mx__arrow" onClick={() => browse(-1)} disabled={phase !== "choix" || items.length < 2} aria-label="Carte précédente"><LuArrowLeft aria-hidden="true" /></button>
              <div className={cx("mx__card", (drag || inside) && "is-away")} onPointerDown={press} onContextMenu={(e: Event) => e.preventDefault()}>
                {cardEl(cur)}
              </div>
              <button type="button" className="btn btn--soft mx__arrow" onClick={() => browse(1)} disabled={phase !== "choix" || items.length < 2} aria-label="Carte suivante"><LuArrowRight aria-hidden="true" /></button>
            </div>
          ) : (
            <p className="note">Tu n'as pas encore de carte. Ouvre un paquet pour en gagner !</p>
          )}
          {cur ? <p className="mx__count">{Math.min(idx, items.length - 1) + 1} / {items.length} · {cur.nom}</p> : null}
          <p className={cx("mx__hint", hint && "is-on")} role="status">{hint || (phase === "choix" && cur ? "Reste appuyé sur ta carte et glisse-la dans la fente." : phase === "tourne" ? "Ça tourne…" : "")}</p>
          <p className="note">{m.machine.length} carte{m.machine.length > 1 ? "s" : ""} déjà passée{m.machine.length > 1 ? "s" : ""} dans la machine.</p>
        </div>
      </div>

      {drag && cur ? createPortal(
        <div className="mx-ghost" style={{ left: `${drag.x - drag.ox}px`, top: `${drag.y - drag.oy}px`, width: `${drag.w}px` }}>
          <div className="mx-ghost__in">{cardEl(cur)}</div>
        </div>,
        document.body,
      ) : null}
      {swallow && inside ? createPortal(
        <div className="mx-swallow" style={{ left: `${swallow.x}px`, top: `${swallow.y}px` }}>
          <div className="mx-swallow__in">{cardEl(inside)}</div>
        </div>,
        document.body,
      ) : null}

      {phase === "lu" && inside ? createPortal(
        <div className="mx-secret" role="dialog" aria-label={`Le secret de ${inside.nom}`}>
          <div className="mx-secret__env" aria-hidden="true">
            <span className="mx-secret__flap" />
            <span className="mx-secret__seal mx-secret__seal--l" />
            <span className="mx-secret__seal mx-secret__seal--r" />
          </div>
          <div className="mx-secret__paper">
            <p className="mx-secret__kicker">Le secret de</p>
            <h2 className="mx-secret__title">{inside.nom}</h2>
            {stories.length ? (
              stories.map((x) => (
                <article key={x.titre} className="mx-secret__story">
                  <h3>{x.titre}</h3>
                  <p>{x.texte}</p>
                  <button type="button" className="btn btn--soft mx-secret__listen" onClick={() => say(`${x.titre}. ${x.texte}`)}><LuVolume2 aria-hidden="true" /> Écouter</button>
                </article>
              ))
            ) : (
              <p>Cette carte n'a pas encore de secret. D'autres arrivent bientôt !</p>
            )}
            {joueur ? <a className="btn btn--pitch" href={youtubeSearch(joueur.videoQuery)} target="_blank" rel="noreferrer">Voir des vidéos (il faut Internet)</a> : null}
            <button type="button" className="btn btn--gold btn--big mx-secret__again" onClick={again}>Mettre une autre carte</button>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
