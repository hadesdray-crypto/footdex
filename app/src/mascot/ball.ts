// A real ball: gravity, bounces, rolling. You can tap it, grab it, throw it across the screen. The characters play with it too.
import { click } from "../sound";

type Sim = { el: HTMLElement; spin: HTMLElement; x: number; y: number; vx: number; vy: number; rot: number; held: boolean; floor: number | null; raf: number; last: number; r: number; lastBounce: number };

let S: Sim | null = null;
const G = 2300;
const R = 17;

const SVG =
  '<svg viewBox="0 0 100 100" width="34" height="34"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#10131c" stroke-width="4"/><path d="M50 30 l17 12 -6 20 h-22 l-6 -20Z" fill="#10131c"/><path d="M50 30 V6 M67 42 L90 34 M61 62 L76 84 M39 62 L24 84 M33 42 L10 34" stroke="#10131c" stroke-width="4"/></svg>';

const groundY = () => (S?.floor ?? window.innerHeight - 82) - R;

function draw() {
  if (!S) return;
  S.el.style.transform = `translate(${S.x - R}px,${S.y - R}px)`;
  S.spin.style.transform = `rotate(${S.rot}deg)`;
}

function frame(now: number) {
  const s = S;
  if (!s) return;
  const dt = Math.min(0.033, (now - s.last) / 1000);
  s.last = now;
  let asleep = false;
  if (!s.held) {
    s.vy += G * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    const W = window.innerWidth;
    if (s.x < R) {
      s.x = R;
      s.vx = Math.abs(s.vx) * 0.72;
    } else if (s.x > W - R) {
      s.x = W - R;
      s.vx = -Math.abs(s.vx) * 0.72;
    }
    if (s.y < R + 56) {
      s.y = R + 56;
      s.vy = Math.abs(s.vy) * 0.5;
    }
    const g = groundY();
    if (s.y >= g) {
      s.y = g;
      if (s.vy > 170) {
        if (now - s.lastBounce > 110) {
          s.lastBounce = now;
          click("soft");
        }
        s.vy = -s.vy * 0.66;
        s.vx *= 0.9;
      } else {
        s.vy = 0;
        s.vx *= Math.max(0, 1 - 2.6 * dt);
        if (Math.abs(s.vx) < 6) {
          s.vx = 0;
          asleep = true;
        }
      }
    }
    s.rot += ((s.vx * dt) / R) * 57.3;
  }
  draw();
  if (asleep && !s.held) {
    s.raf = 0;
    return;
  }
  s.raf = requestAnimationFrame(frame);
}

function wake() {
  if (S && !S.raf) {
    S.last = performance.now();
    S.raf = requestAnimationFrame(frame);
  }
}

export function mountBall(x: number, y: number) {
  if (S || typeof document === "undefined") return;
  const el = document.createElement("div");
  el.className = "rball";
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", "Ballon : touche-le, attrape-le, lance-le");
  const spin = document.createElement("div");
  spin.className = "rball__spin";
  spin.innerHTML = SVG;
  el.appendChild(spin);
  document.body.appendChild(el);
  S = { el, spin, x, y, vx: 0, vy: 0, rot: 0, held: false, floor: null, raf: 0, last: performance.now(), r: R, lastBounce: 0 };
  draw();
  wake();

  let samples: { t: number; x: number; y: number }[] = [];
  let startX = 0;
  let startY = 0;
  let t0 = 0;
  let dx = 0;
  let dy = 0;
  el.addEventListener("pointerdown", (e) => {
    if (!S) return;
    e.preventDefault();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* works without capture */
    }
    S.held = true;
    S.vx = 0;
    S.vy = 0;
    startX = e.clientX;
    startY = e.clientY;
    dx = e.clientX - S.x;
    dy = e.clientY - S.y;
    t0 = performance.now();
    samples = [{ t: t0, x: e.clientX, y: e.clientY }];
    el.classList.add("is-held");
    wake();
  });
  el.addEventListener("pointermove", (e) => {
    if (!S || !S.held) return;
    S.x = Math.min(window.innerWidth - R, Math.max(R, e.clientX - dx));
    S.y = Math.min(window.innerHeight - R - 70, Math.max(R + 56, e.clientY - dy));
    const now = performance.now();
    samples.push({ t: now, x: e.clientX, y: e.clientY });
    samples = samples.filter((p) => now - p.t < 120);
  });
  const release = (e: PointerEvent) => {
    if (!S || !S.held) return;
    S.held = false;
    el.classList.remove("is-held");
    const now = performance.now();
    const moved = Math.hypot(e.clientX - startX, e.clientY - startY);
    if (moved < 8 && now - t0 < 300) {
      // A tap: he pops up.
      S.vy = -1000;
      S.vx = (Math.random() - 0.5) * 380;
      click("soft");
    } else {
      const a = samples[0];
      const b = samples[samples.length - 1];
      const span = Math.max(16, (b?.t ?? now) - (a?.t ?? now));
      if (a && b && now - b.t < 90) {
        const cap = (v: number) => Math.max(-2800, Math.min(2800, v));
        S.vx = cap(((b.x - a.x) / span) * 1000);
        S.vy = cap(((b.y - a.y) / span) * 1000);
      }
      click("soft");
    }
    wake();
  };
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
  window.addEventListener("resize", wake);
}

export function unmountBall() {
  if (!S) return;
  cancelAnimationFrame(S.raf);
  S.el.remove();
  S = null;
}

export const hasBall = () => !!S;
export function ballPos() {
  return S ? { x: S.x, y: S.y, vx: S.vx, vy: S.vy, floor: groundY() } : null;
}
export function kickBall(vx: number, vy: number) {
  if (!S) return;
  S.held = false;
  S.vx = vx;
  S.vy = vy;
  click("soft");
  wake();
}
export function placeBall(x: number, y: number, vx: number, vy: number) {
  if (!S) return;
  S.x = x;
  S.y = y;
  S.vx = vx;
  S.vy = vy;
  wake();
}
export function setBallFloor(y: number | null) {
  if (!S) return;
  S.floor = y;
  wake();
}
