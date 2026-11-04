// The "acrylic" figurine: the character cut out and printed on a thick piece of clear plastic, standing in a round
// translucent pedestal. Made only with CSS 3D and the pictures of public/fbx/fig, so it turns with a finger in every
// direction (around, above, below). Optional "clip" mode: the figure floats above its pedestal and is pushed in.
import { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "../util";

export type Edition = "s" | "c"; // s = Studio (the image-AI drawing), c = Classique (the game's own drawing)
export const editionFile = (id: string, v: Edition) => `fbx/fig/${id}${v === "c" ? "-c" : ""}.webp`;
const sliceFile = (id: string, v: Edition) => `fbx/fig/${id}${v === "c" ? "-c" : ""}-s.webp`;

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

type Props = {
  id: string;
  edition?: Edition;
  size?: number;
  /** drag in every direction (the big view); otherwise only around, and a vertical swipe still scrolls the page */
  free?: boolean;
  /** the figure waits above its pedestal until it is pushed down */
  clip?: boolean;
  onClip?: () => void;
  /** a dark silhouette: not found yet */
  locked?: boolean;
  /** slow turn when nobody touches it */
  spin?: boolean;
  color?: string;
  onMissing?: () => void;
  /** changes → the figure goes back above the pedestal (new clip round) */
  roundKey?: string | number;
};

export function Standee({ id, edition = "s", size = 190, free = false, clip = false, onClip, locked = false, spin = true, color = "#58a6ff", onMissing, roundKey }: Props) {
  const [ry, setRy] = useState(-28);
  const [rx, setRx] = useState(free ? -16 : -10);
  const [lift, setLift] = useState(clip ? 1 : 0); // 1 = floating high, 0 = clipped in
  const [clipped, setClipped] = useState(!clip);
  const [burst, setBurst] = useState(0);
  const [ready, setReady] = useState(false);
  const drag = useRef<{ x: number; y: number; ry: number; rx: number } | null>(null);
  const grab = useRef<{ y: number; lift: number } | null>(null);
  const idle = useRef(0);
  const clipFn = useRef(onClip);
  clipFn.current = onClip;

  const front = editionFile(id, edition);
  const slice = sliceFile(id, edition);

  // does the picture exist? (cascade: if not, the caller shows something else)
  useEffect(() => {
    let live = true;
    const im = new Image();
    im.onload = () => live && setReady(true);
    im.onerror = () => live && onMissing?.();
    im.src = front;
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front]);

  useEffect(() => {
    setClipped(!clip);
    setLift(clip ? 1 : 0);
  }, [clip, roundKey]);

  // slow turn + a small float of the figure while it waits
  useEffect(() => {
    if (!spin) return;
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      if (!drag.current && !grab.current && t - idle.current > 1400) setRy((a) => (a + dt * 26) % 360);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [spin]);

  const S = size;
  const tw = S * 0.64;
  const th = tw * 1.2;
  const half = S * 0.034;
  const baseY = S * 0.86; // the pedestal's top surface
  const bd = S * 0.7;
  const bt = S * 0.055; // pedestal thickness
  const sheen = `${((((ry % 360) + 360) % 360) / 360) * 300 - 60}% 0`;

  const down = (e: { clientX: number; clientY: number; pointerId: number; currentTarget: HTMLElement }) => {
    drag.current = { x: e.clientX, y: e.clientY, ry, rx };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e: { clientX: number; clientY: number }) => {
    const d = drag.current;
    if (!d) return;
    setRy(d.ry + (e.clientX - d.x) * 0.9);
    if (free) setRx(clamp(d.rx - (e.clientY - d.y) * 0.7, -88, 88));
  };
  const up = () => {
    drag.current = null;
    idle.current = performance.now();
  };

  // pushing the floating figure down into its pedestal
  const gDown = (e: { clientY: number; pointerId: number; currentTarget: HTMLElement; stopPropagation: () => void }) => {
    if (clipped) return;
    e.stopPropagation();
    grab.current = { y: e.clientY, lift };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const gMove = (e: { clientY: number }) => {
    const g = grab.current;
    if (!g) return;
    setLift(clamp(g.lift - (e.clientY - g.y) / (S * 0.3), 0, 1));
  };
  const gUp = () => {
    if (!grab.current) return;
    grab.current = null;
    if (lift < 0.55) doClip();
    else setLift(1);
  };
  function doClip() {
    setLift(0);
    window.setTimeout(() => {
      setClipped(true);
      setBurst((n) => n + 1);
      clipFn.current?.();
    }, 160);
  }
  // the button of the caller can also clip it
  useEffect(() => {
    const h = () => { if (!clipped) doClip(); };
    window.addEventListener("footdex:clip", h);
    return () => window.removeEventListener("footdex:clip", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipped]);

  const SLICES = size < 200 ? 4 : 7;
  const slices = useMemo(() => Array.from({ length: SLICES }, (_, k) => k), [SLICES]);
  const liftPx = lift * S * 0.3;

  return (
    <div
      className={cx("sd", free && "sd--free", locked && "sd--locked", !ready && "sd--wait")}
      style={{ width: S, height: S, marginTop: clip ? (clipped ? S * 0.06 : S * 0.26) : 0, transition: "margin-top .3s", "--rc": color, "--sh": sheen, touchAction: free ? "none" : "pan-y" } as Record<string, string | number>}
      role="img"
      aria-label={free ? "Figurine : fais-la tourner avec le doigt, dans tous les sens" : "Figurine : fais-la tourner avec le doigt"}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div className="sd__shadow" style={{ width: bd * 1.15, height: bd * 1.15, left: (S - bd * 1.15) / 2, top: baseY + bt - bd * 0.575 + 2 }} aria-hidden="true" />
      <div className="sd__rot" style={{ transform: `rotateX(${rx}deg) rotateY(${ry}deg)`, transformOrigin: `50% ${baseY - th * 0.45}px` }}>
        {/* the pedestal: stacked clear discs, a slot on the top */}
        {Array.from({ length: 6 }, (_, k) => (
          <span key={k} className={cx("sd__disc", k === 0 && "sd__disc--top", k === 5 && "sd__disc--bot")} style={{ width: bd, height: bd, left: (S - bd) / 2, top: baseY - bd / 2 + (k * bt) / 5, opacity: k === 0 || k === 5 ? 1 : 0.5 }} aria-hidden="true" />
        ))}
        <span className="sd__slot" style={{ width: tw * 0.8, height: half * 2.6, left: (S - tw * 0.8) / 2, top: baseY - half * 1.3 - 1 }} aria-hidden="true" />
        {/* the figure */}
        <div
          className="sd__fig"
          style={{ width: tw, height: th, left: (S - tw) / 2, top: baseY - th + S * 0.012, transform: `translateY(${-liftPx}px)`, transition: grab.current ? "none" : "transform .22s cubic-bezier(.3,1.6,.5,1)" }}
          onPointerDown={clip && !clipped ? gDown : undefined}
          onPointerMove={clip && !clipped ? gMove : undefined}
          onPointerUp={clip && !clipped ? gUp : undefined}
          onPointerCancel={clip && !clipped ? gUp : undefined}
        >
          {slices.map((k) => (
            <img key={k} className="sd__slice" src={slice} alt="" draggable={false} style={{ transform: `translateZ(${((k / (SLICES - 1)) * 2 - 1) * half}px)` }} />
          ))}
          <img className="sd__face" src={front} alt="" draggable={false} style={{ transform: `translateZ(${half + 0.6}px)` }} />
          <span className="sd__gloss" aria-hidden="true" style={{ WebkitMaskImage: `url(${front})`, maskImage: `url(${front})`, transform: `translateZ(${half + 1.2}px)` }} />
          <img className="sd__face sd__face--back" src={front} alt="" draggable={false} style={{ transform: `translateZ(${-half - 0.6}px) rotateY(180deg)` }} />
        </div>
      </div>
      {burst ? <span key={burst} className="sd__burst" aria-hidden="true" style={{ top: baseY - S * 0.05 }} /> : null}
    </div>
  );
}
