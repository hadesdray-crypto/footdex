// The character walking about the screen on his own: runs, walks, gets tired, does push-ups, kicks the ball, kneels before a button.
import type { Look } from "./look";
import { runnerSvg, type View } from "./runner";
import { getMascot } from "./state";
import { ballPos, kickBall, placeBall, setBallFloor } from "./ball";

export type Pose = "idle" | "run" | "walk" | "tired" | "push" | "kick" | "cheer" | "bow" | "kneel" | "juggle";
export type Pt = { x: number; y: number };

export type Actor = {
  x: number;
  y: number;
  dead: boolean;
  pose: (p: Pose) => void;
  face: (dx: number, dy: number) => void;
  walkTo: (to: Pt | (() => Pt), gait?: "run" | "walk", stop?: number, timeout?: number) => Promise<boolean>;
  wait: (ms: number) => Promise<void>;
  flick: (cls: string) => void;
  destroy: () => void;
};

const SIDE_ONLY: Pose[] = ["push", "kick", "bow"];

export function createActor(look: Look, x: number, y: number, hooks: { onTap: () => void; onMove: (x: number, y: number) => void }): Actor {
  const el = document.createElement("div");
  el.className = "act";
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", "Ton personnage : touche-le pour ouvrir son menu");
  document.body.appendChild(el);
  let view: View = "front";
  let drawn: View | "" = "";
  let fl = false;
  let pose: Pose = "idle";
  let goal: { to: Pt | (() => Pt); speed: number; stop: number; end: (ok: boolean) => void; until: number } | null = null;
  let last = performance.now();
  let lastMove = 0;
  let raf = 0;

  const me: Actor = {
    x,
    y,
    dead: false,
    pose: (p) => {
      pose = p;
      if (SIDE_ONLY.includes(p)) view = "side";
      if (p === "kneel" || p === "cheer" || p === "juggle") view = "front";
      paint();
    },
    face: (dx, dy) => {
      if (SIDE_ONLY.includes(pose)) {
        if (dx) fl = dx < 0;
        return;
      }
      if (Math.abs(dx) >= Math.abs(dy) * 0.7) {
        view = "side";
        fl = dx < 0;
      } else view = dy < 0 ? "back" : "front";
      paint();
    },
    walkTo: (to, gait = "run", stop = 6, timeout = 9000) =>
      new Promise<boolean>((resolve) => {
        if (me.dead) return resolve(false);
        goal?.end(false);
        me.pose(gait);
        goal = { to, speed: gait === "run" ? 330 : 105, stop, end: resolve, until: performance.now() + timeout };
      }),
    wait: (ms) => new Promise<void>((resolve) => window.setTimeout(resolve, ms)),
    flick: (cls) => {
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
    },
    destroy: () => {
      me.dead = true;
      goal?.end(false);
      goal = null;
      cancelAnimationFrame(raf);
      el.remove();
    },
  };

  function paint() {
    if (drawn !== view) {
      el.innerHTML = `<div class="rn"><div class="fx">${runnerSvg(look, view)}</div></div>`;
      drawn = view;
    }
    el.className = `act p-${pose} v-${view}${fl ? " fl" : ""}${getMascot().talking ? " tk" : ""}`;
  }

  function place() {
    const s = Math.max(0.78, Math.min(1.2, 0.76 + 0.46 * (me.y / window.innerHeight)));
    el.style.transform = `translate(${me.x - 33}px,${me.y - 86}px) scale(${s})`;
    el.style.zIndex = String(15 + Math.round(me.y / 40));
    return s;
  }

  function tick(now: number) {
    if (me.dead) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const tk = getMascot().talking;
    if (el.classList.contains("tk") !== tk) el.classList.toggle("tk", tk);
    if (goal) {
      const t = typeof goal.to === "function" ? goal.to() : goal.to;
      const dx = t.x - me.x;
      const dy = t.y - me.y;
      const d = Math.hypot(dx, dy);
      if (d <= goal.stop || now > goal.until) {
        const g = goal;
        goal = null;
        g.end(d <= g.stop);
      } else {
        const s = place();
        const step = Math.min(d, goal.speed * s * dt);
        me.x += (dx / d) * step;
        me.y += (dy / d) * step;
        me.x = Math.max(24, Math.min(window.innerWidth - 24, me.x));
        me.y = Math.max(96, Math.min(window.innerHeight - 78, me.y));
        const before = view + fl;
        me.face(dx, dy);
        if (before !== view + fl) paint();
        if (now - lastMove > 90) {
          lastMove = now;
          hooks.onMove(me.x, me.y);
        }
      }
    }
    place();
    raf = requestAnimationFrame(tick);
  }

  el.addEventListener("click", (e) => {
    e.stopPropagation();
    hooks.onTap();
  });
  paint();
  place();
  raf = requestAnimationFrame(tick);
  return me;
}

/** Kicks the ball towards `dir` (1 right, -1 left): runs behind it, swings the leg, and the ball leaves at the right moment. */
export async function kickTowards(a: Actor, dir: number, power = 1) {
  const b = ballPos();
  if (!b || a.dead) return;
  const reach = await a.walkTo(() => {
    const p = ballPos() ?? b;
    return { x: p.x - dir * 38, y: p.y + 20 };
  }, "run", 7, 3800);
  if (!reach || a.dead) return;
  a.face(dir, 0);
  a.pose("kick");
  a.flick("kick-go");
  await a.wait(330);
  if (a.dead) return;
  const p = ballPos();
  if (p && Math.hypot(p.x - (a.x + dir * 30), p.y - a.y) < 110) {
    kickBall(dir * (650 + Math.random() * 450) * power, -(520 + Math.random() * 520) * power);
  }
  await a.wait(520);
}

/** Juggling in front of the camera: the ball goes up from the foot, falls, goes up again. */
export async function juggle(a: Actor, touches = 6) {
  if (a.dead) return;
  a.pose("juggle");
  setBallFloor(a.y - 4);
  for (let i = 0; i < touches && !a.dead; i += 1) {
    const side = i % 2 ? -1 : 1;
    placeBall(a.x + side * 9, a.y - 26, -side * 18, -640);
    a.flick(side > 0 ? "jg-a" : "jg-b");
    await a.wait(640);
  }
  setBallFloor(null);
}
