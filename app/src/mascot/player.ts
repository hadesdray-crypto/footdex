// The footballer and HIS ball: one being, two bodies, drawn and moved together every frame.
// - The ground is the line under his feet. The ball lives on that ground: it rolls, flies and bounces on it.
// - His legs have hips, knees and feet: running, dribbling, juggling, shooting and trapping are joint angles,
//   computed each frame, not stickers. When the ball goes up while juggling, it is because his foot hit it.
// - The ball stays at his feet. Anybody can take it from him (drag it, throw it): he runs to get it back.
// Only the Jongleur plays with a ball. The other characters never use this module.
import { BODIES, OUTFITS, SKINS, type Look } from "./look";
import { sideHeadSvg } from "./runner";
import { ballKick, ballBounce, ballTrap } from "../sound";

// ------------------------------------------------------------------ world
const G = 1700; // gravity for the ball, px/s²
const BALL_R = 10; // ball radius at scale 1 (a football is about knee high)
const FIG_W = 66;
const FIG_H = 86;
const U = FIG_H / 132; // svg units → px

type Ball = { x: number; y: number; z: number; vx: number; vy: number; vz: number; rot: number; held: boolean };
type Act =
  | { k: "idle" }
  | { k: "run"; to: () => { x: number; y: number }; dribble: () => boolean; speed: number; stop: number; done: (ok: boolean) => void; until: number }
  | { k: "kick"; t: number; dir: number; power: number; hit: boolean; done: () => void }
  | { k: "juggle"; left: number; t: number; age: number; leg: 0 | 1; swinging: boolean; done: () => void }
  | { k: "tired"; t: number; until: number; done: () => void }
  | { k: "push"; t: number; until: number; done: () => void }
  | { k: "cheer"; t: number; until: number; done: () => void };

type Pl = {
  look: Look;
  x: number; // feet, screen px
  y: number; // ground line, screen px
  dir: 1 | -1;
  vx: number;
  vy: number;
  phase: number;
  act: Act;
  el: HTMLElement | null;
  parts: Record<string, SVGGElement>;
  onTap: () => void;
  onMove: (x: number, y: number) => void;
};

let ball: Ball | null = null;
let ballEl: HTMLElement | null = null;
let spinEl: HTMLElement | null = null;
let pl: Pl | null = null;
let raf = 0;
let last = 0;
let park: { x: number; y: number } | null = null; // where the ball waits when he is in his corner
let onStolen: (() => void) | null = null;

const scaleAt = (y: number) => Math.max(0.78, Math.min(1.2, 0.76 + 0.46 * (y / window.innerHeight)));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
const top = () => 140;
const bottom = () => window.innerHeight - 80;

// ------------------------------------------------------------------ the ball (always exists for the Jongleur)
const BALL_SVG =
  '<svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="47" fill="#fff" stroke="#10131c" stroke-width="5"/><path d="M50 31 l17 12 -6.5 20 h-21 l-6.5 -20Z" fill="#10131c"/><path d="M50 31 V5 M67 43 L91 35 M60.5 63 L76 86 M39.5 63 L24 86 M33 43 L9 35" stroke="#10131c" stroke-width="5"/><circle cx="36" cy="30" r="12" fill="#fff" opacity=".35"/></svg>';

export function ensureBall(x: number, y: number) {
  if (ballEl || typeof document === "undefined") return;
  ballEl = document.createElement("div");
  ballEl.className = "fball";
  ballEl.setAttribute("role", "button");
  ballEl.setAttribute("aria-label", "Le ballon du jongleur : tu peux le lui prendre et le lancer");
  spinEl = document.createElement("div");
  spinEl.className = "fball__spin";
  spinEl.innerHTML = BALL_SVG;
  const shadow = document.createElement("div");
  shadow.className = "fball__shadow";
  ballEl.appendChild(shadow);
  ballEl.appendChild(spinEl);
  document.body.appendChild(ballEl);
  ball = { x, y, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, held: false };
  park = { x, y };
  grabbable(ballEl);
  wake();
}

export function removeBall() {
  ballEl?.remove();
  ballEl = null;
  spinEl = null;
  ball = null;
  park = null;
}

/** He is in his corner: the ball rests at his feet (it follows him when you move him). */
export function parkBall(x: number, y: number) {
  park = { x, y };
  if (ball && !pl && !ball.held && Math.hypot(ball.vx, ball.vy, ball.vz) < 1) {
    ball.x = x;
    ball.y = y;
    ball.z = 0;
    drawBall();
  }
}

/** Called when somebody takes the ball while he is in his corner: he comes out to get it back. */
export function whenStolen(fn: (() => void) | null) {
  onStolen = fn;
}

function drawBall() {
  if (!ball || !ballEl || !spinEl) return;
  const s = scaleAt(ball.y);
  const r = BALL_R * s;
  ballEl.style.transform = `translate(${ball.x - r}px,${ball.y - ball.z - 2 * r}px)`;
  ballEl.style.width = ballEl.style.height = `${2 * r}px`;
  // in front of him when it is at his feet or in the air in front of him (he plays it with his near foot)
  const close = pl && Math.abs(ball.x - pl.x) < 60 * s && Math.abs(ball.y - pl.y) < 30 * s;
  // resting at his feet in his corner: above his button (z 55), so a finger can take it
  ballEl.style.zIndex = pl ? String(15 + Math.round((close ? Math.max(ball.y, pl.y) : ball.y) / 40) + (close ? 1 : 0)) : "56";
  ballEl.style.setProperty("--sh", `${ball.z}px`);
  ballEl.style.setProperty("--shs", String(Math.max(0.35, 1 - ball.z / 160)));
  spinEl.style.transform = `rotate(${ball.rot}deg)`;
}

function stepBall(dt: number) {
  if (!ball || ball.held) return;
  const b = ball;
  // in the air
  if (b.z > 0 || b.vz > 0) {
    b.vz -= G * dt;
    b.z += b.vz * dt;
    b.vx *= Math.exp(-0.15 * dt);
    b.vy *= Math.exp(-0.15 * dt);
    if (b.z <= 0) {
      b.z = 0;
      if (b.vz < -110) {
        ballBounce(Math.min(1, -b.vz / 700));
        b.vz = -b.vz * 0.56;
        b.vx *= 0.86;
        b.vy *= 0.86;
      } else b.vz = 0;
    }
  } else {
    // rolling on the grass
    const f = Math.exp(-1.25 * dt);
    b.vx *= f;
    b.vy *= f;
    if (Math.hypot(b.vx, b.vy) < 4) {
      b.vx = 0;
      b.vy = 0;
    }
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  const r = BALL_R * scaleAt(b.y);
  if (b.x < r) {
    b.x = r;
    b.vx = Math.abs(b.vx) * 0.6;
    ballBounce(0.3);
  } else if (b.x > window.innerWidth - r) {
    b.x = window.innerWidth - r;
    b.vx = -Math.abs(b.vx) * 0.6;
    ballBounce(0.3);
  }
  if (b.y < top()) {
    b.y = top();
    b.vy = Math.abs(b.vy) * 0.5;
  } else if (b.y > bottom()) {
    b.y = bottom();
    b.vy = -Math.abs(b.vy) * 0.5;
  }
  b.rot += ((b.vx * dt) / r) * 57.3;
}

function grabbable(el: HTMLElement) {
  let samples: { t: number; x: number; y: number }[] = [];
  let ground = 0;
  el.addEventListener("pointerdown", (e) => {
    if (!ball) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* fine without */
    }
    ball.held = true;
    ball.vx = ball.vy = ball.vz = 0;
    ground = pl ? pl.y : ball.y;
    samples = [{ t: performance.now(), x: e.clientX, y: e.clientY }];
    el.classList.add("is-held");
    wake();
  });
  el.addEventListener("pointermove", (e) => {
    if (!ball || !ball.held) return;
    const r = BALL_R * scaleAt(ground);
    const fy = e.clientY + r;
    ball.x = clamp(e.clientX, r, window.innerWidth - r);
    // above the ground line: the ball is in the air above it; below: it is moved along the ground
    if (fy < ground) {
      ball.y = ground;
      ball.z = ground - fy;
    } else {
      ground = clamp(fy, top(), bottom());
      ball.y = ground;
      ball.z = 0;
    }
    const now = performance.now();
    samples.push({ t: now, x: e.clientX, y: e.clientY });
    samples = samples.filter((p) => now - p.t < 120);
    drawBall();
  });
  const release = () => {
    if (!ball || !ball.held) return;
    ball.held = false;
    el.classList.remove("is-held");
    const a = samples[0];
    const b = samples[samples.length - 1];
    const now = performance.now();
    if (a && b && now - b.t < 90 && b.t > a.t) {
      const span = (b.t - a.t) / 1000;
      ball.vx = clamp((b.x - a.x) / span, -2200, 2200);
      const up = -(b.y - a.y) / span;
      ball.vz = ball.z > 0 ? clamp(up, -1600, 1800) : Math.max(0, up * 0.3);
      ball.vy = ball.z > 0 ? 0 : clamp((b.y - a.y) / span, -900, 900);
    } else if (ball.z > 0) ball.vz = 0;
    else {
      // a tap on the ball resting on the ground: it pops up a little
      ball.vz = 420;
      ball.vx = (Math.random() - 0.5) * 120;
    }
    // never higher than the top of the screen
    const maxUp = Math.sqrt(2 * G * Math.max(40, ball.y - ball.z - 90));
    ball.vz = Math.min(ball.vz, maxUp);
    if (ball.vz > 0 || Math.abs(ball.vx) > 200) ballKick(0.4);
    wake();
    if (!pl) onStolen?.();
  };
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
}

// ------------------------------------------------------------------ the footballer, joint by joint
// Units are those of the 100×132 drawing: hip at (50, 90), thigh 17, shin 17, foot on the ground at y 129.
const HIP = { x: 50, y: 90 };
const THIGH = 17;
const SHIN = 17;
const SHOULDER = { x: 50, y: 62 };

function buildSvg(look: Look): string {
  const sk = SKINS[look.skin];
  const o = OUTFITS[look.outfit];
  const td = 10 + ((14 + (BODIES[look.body].sw - 84) * 0.17) - 14) * 0.5;
  const leg = (id: string, far: boolean) => `<g id="${id}H" class="${far ? "far" : ""}" transform="translate(${HIP.x} ${HIP.y})">
      <rect x="-6" y="-2" width="12" height="${THIGH + 3}" rx="5" fill="${sk}"/>
      <rect x="-7" y="-4" width="14" height="10" rx="5" fill="${o.shorts}" stroke="#00000025" stroke-width="1"/>
      <g id="${id}K" transform="translate(0 ${THIGH})">
        <rect x="-5.6" y="-1" width="11.2" height="${SHIN + 1}" rx="4.5" fill="${o.sock}"/>
        <rect x="-5.8" y="3" width="11.6" height="3.6" fill="${o.sock2}"/>
        <g id="${id}F" transform="translate(0 ${SHIN})"><path d="M-6 -3 H6 Q15 -3 16 2.6 Q16 6 12 6 H-5 Q-8 6 -8 2Z" fill="#10131c"/><path d="M-7 5.4 H15" stroke="#fff" stroke-opacity=".45" stroke-width="1.4"/></g>
      </g></g>`;
  const arm = (id: string, far: boolean) => `<g id="${id}S" class="${far ? "far" : ""}" transform="translate(${SHOULDER.x} ${SHOULDER.y})">
      <rect x="-4" y="0" width="8" height="14" rx="4" fill="${sk}"/>
      <rect x="-6.5" y="-5" width="13" height="12" rx="6" fill="${o.shirt}"/><rect x="-6.5" y="4" width="13" height="3" fill="${o.s2}"/>
      <g id="${id}E" transform="translate(0 13)"><rect x="-3.6" y="-1" width="7.2" height="13" rx="3.6" fill="${sk}"/><circle cx="0" cy="13" r="4.6" fill="${sk}"/></g></g>`;
  const torso = `<rect x="${50 - td}" y="56" width="${2 * td}" height="37" rx="11" fill="${o.shirt}"/>
    <rect x="${50 - td}" y="86" width="${2 * td}" height="6" fill="#00000024"/>
    ${o.num ? `<text x="${50 - td + 6}" y="80" font-family="Impact,sans-serif" font-size="12" fill="${o.s2}" opacity=".9">${o.num}</text>` : ""}
    ${look.acc.includes("armband") ? "" : ""}`;
  return `<svg viewBox="0 0 100 132" aria-hidden="true" overflow="visible">
    ${leg("lB", true)}${arm("aB", true)}
    <g id="up">${torso}<g id="hd">${sideHeadSvg(look)}</g></g>
    ${leg("lA", false)}${arm("aA", false)}
  </svg>`;
}

type Pose = { lean: number; bob: number; hA: number; kA: number; fA: number; hB: number; kB: number; fB: number; sA: number; eA: number; sB: number; eB: number; rot: number; lift: number };
const STAND: Pose = { lean: 0, bob: 0, hA: -3, kA: 4, fA: 0, hB: 3, kB: 4, fB: 0, sA: 6, eA: -12, sB: -6, eB: -12, rot: 0, lift: 0 };

/** Running / walking: legs and arms swing in opposition, knees fold during the swing, the body bounces. */
function gait(p: number, run: number): Pose {
  // run: 0 = walk, 1 = full sprint
  const amp = lerp(24, 40, run);
  const leg = (ph: number) => {
    const hip = -amp * Math.sin(ph); // negative = forward
    const swing = Math.max(0, Math.cos(ph)); // moving forward
    const knee = lerp(10, 22, run) * Math.max(0, -Math.cos(ph)) * 0.6 + lerp(45, 100, run) * swing * swing + 4;
    const foot = -12 * swing + 6 * Math.max(0, Math.sin(ph));
    return [hip, knee, foot];
  };
  const [hA, kA, fA] = leg(p);
  const [hB, kB, fB] = leg(p + Math.PI);
  const arm = lerp(26, 52, run);
  return {
    lean: lerp(3, 12, run),
    bob: -lerp(1.2, 4.5, run) * Math.abs(Math.cos(p)),
    hA, kA, fA, hB, kB, fB,
    sA: arm * Math.sin(p), eA: -lerp(20, 85, run),
    sB: -arm * Math.sin(p), eB: -lerp(20, 85, run),
    rot: 0,
    lift: run > 0.5 ? lerp(0, 3, run) * Math.max(0, Math.cos(2 * p)) : 0,
  };
}

function mix(a: Pose, b: Pose, t: number): Pose {
  const o = { ...a };
  for (const k of Object.keys(a) as (keyof Pose)[]) o[k] = lerp(a[k], b[k], t);
  return o;
}

/** Where the tip of the near foot is, in screen px, for a pose (to meet the ball exactly). */
function footTip(p: Pose, leg: "A" | "B"): { dx: number; dz: number } {
  const h = ((leg === "A" ? p.hA : p.hB) * Math.PI) / 180;
  const k = ((leg === "A" ? p.kA : p.kB) * Math.PI) / 180;
  const kx = -THIGH * Math.sin(h);
  const ky = THIGH * Math.cos(h);
  const ax = kx - SHIN * Math.sin(h + k);
  const ay = ky + SHIN * Math.cos(h + k);
  // the instep, a little in front of the ankle
  return { dx: (ax + 7) * U, dz: (129 - (HIP.y + p.bob + ay + 3)) * U };
}

function applyPose(p: Pose) {
  if (!pl?.el) return;
  const P = pl.parts;
  const set = (id: string, tr: string) => P[id]?.setAttribute("transform", tr);
  set("lAH", `translate(${HIP.x} ${HIP.y + p.bob}) rotate(${p.hA})`);
  set("lAK", `translate(0 ${THIGH}) rotate(${p.kA})`);
  set("lAF", `translate(0 ${SHIN}) rotate(${p.fA})`);
  set("lBH", `translate(${HIP.x} ${HIP.y + p.bob}) rotate(${p.hB})`);
  set("lBK", `translate(0 ${THIGH}) rotate(${p.kB})`);
  set("lBF", `translate(0 ${SHIN}) rotate(${p.fB})`);
  const up = `rotate(${p.lean} ${HIP.x} ${HIP.y + p.bob}) translate(0 ${p.bob})`;
  set("up", up);
  set("aAS", `${up} translate(${SHOULDER.x} ${SHOULDER.y}) rotate(${p.sA})`);
  set("aAE", `translate(0 13) rotate(${p.eA})`);
  set("aBS", `${up} translate(${SHOULDER.x} ${SHOULDER.y}) rotate(${p.sB})`);
  set("aBE", `translate(0 13) rotate(${p.eB})`);
}

function place(p: Pose) {
  if (!pl?.el) return;
  const s = scaleAt(pl.y);
  const rot = p.rot ? ` rotate(${p.rot * pl.dir}deg)` : "";
  pl.el.style.transform = `translate(${pl.x - FIG_W / 2}px,${pl.y - FIG_H - p.lift}px) scale(${s})${rot}`;
  pl.el.style.zIndex = String(15 + Math.round(pl.y / 40));
  pl.el.firstElementChild?.setAttribute("style", `transform:scaleX(${pl.dir})`);
}

// ------------------------------------------------------------------ the loop

function wake() {
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}

function frame(now: number) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (pl) stepPlayer(dt);
  stepBall(dt);
  drawBall();
  const moving = ball && (ball.held || ball.z > 0 || Math.hypot(ball.vx, ball.vy) > 0);
  if (pl || moving) raf = requestAnimationFrame(frame);
  else {
    raf = 0;
    // back in his corner and the ball stopped somewhere else: it rolls back to his feet by itself
    if (ball && park && Math.hypot(ball.x - park.x, ball.y - park.y) > 2) {
      ball.x = park.x;
      ball.y = park.y;
      drawBall();
    }
  }
}

let breath = 0;
function stepPlayer(dt: number) {
  const p0 = pl;
  if (!p0) return;
  const a = p0.act;
  breath += dt;
  let pose: Pose = { ...STAND, bob: Math.sin(breath * 2.2) * 0.6, sA: 6 + Math.sin(breath * 2.2) * 2 };

  if (a.k === "run") {
    const t = a.to();
    const dx = t.x - p0.x;
    const dy = t.y - p0.y;
    const d = Math.hypot(dx, dy);
    const s = scaleAt(p0.y);
    if (d <= a.stop || performance.now() > a.until) {
      p0.act = { k: "idle" };
      a.done(d <= a.stop);
    } else {
      const sp = a.speed * s;
      const step = Math.min(d, sp * dt);
      p0.vx = (dx / d) * sp;
      p0.vy = (dy / d) * sp;
      p0.x = clamp(p0.x + (dx / d) * step, 20, window.innerWidth - 20);
      p0.y = clamp(p0.y + (dy / d) * step, top(), bottom());
      if (Math.abs(dx) > 4) p0.dir = dx > 0 ? 1 : -1;
      const run = clamp((a.speed - 90) / 230, 0, 1);
      p0.phase += (step / (lerp(11, 20, run) * s)) * Math.PI * 0.5;
      pose = gait(p0.phase, run);
      if (a.dribble() && ball && !ball.held) dribbleTouch(pose, sp, dx / d, dy / d);
      p0.onMove(p0.x, p0.y);
    }
  } else if (a.k === "kick") {
    a.t += dt;
    const t = a.t;
    // run-up stop, plant, wind up, strike, follow through
    const plant: Pose = { ...STAND, lean: 4, hB: -10, kB: 18, sA: -40, eA: -30, sB: 45, eB: -20 };
    const wind: Pose = { ...plant, hA: 38, kA: 95, fA: 20, lean: 6 };
    const strike: Pose = { ...plant, hA: -62, kA: 6, fA: -8, lean: -8, sA: 55, sB: -50 };
    const follow: Pose = { ...strike, hA: -78, kA: 18, lean: -10 };
    if (t < 0.18) pose = mix(STAND, plant, ease(t / 0.18));
    else if (t < 0.36) pose = mix(plant, wind, ease((t - 0.18) / 0.18));
    else if (t < 0.45) pose = mix(wind, strike, (t - 0.36) / 0.09);
    else if (t < 0.7) pose = mix(strike, follow, ease((t - 0.45) / 0.25));
    else pose = mix(follow, STAND, ease((t - 0.7) / 0.35));
    if (!a.hit && t >= 0.43) {
      a.hit = true;
      if (ball && !ball.held && Math.abs(ball.x - (p0.x + a.dir * 14 * scaleAt(p0.y))) < 26 && Math.abs(ball.y - p0.y) < 22 && ball.z < 14) {
        ball.vx = a.dir * (560 + 380 * a.power);
        ball.vy = (Math.random() - 0.5) * 140;
        ball.vz = 260 + 420 * a.power * Math.random();
        ballKick(0.6 + 0.4 * a.power);
      }
    }
    if (t >= 1.05) {
      p0.act = { k: "idle" };
      a.done();
    }
  } else if (a.k === "juggle") {
    pose = juggleStep(a, dt, pose);
  } else if (a.k === "tired") {
    a.t += dt;
    const br = Math.sin(a.t * 6) * 1.2;
    pose = { ...STAND, lean: 28, bob: 2 + br, hA: -14, kA: 26, hB: -4, kB: 22, sA: -30, eA: -10, sB: -34, eB: -6 };
    if (a.t > a.until) {
      p0.act = { k: "idle" };
      a.done();
    }
  } else if (a.k === "push") {
    a.t += dt;
    const c = (Math.sin(a.t * 4.2) + 1) / 2; // 0 down, 1 up
    pose = { ...STAND, lean: 0, hA: 0, kA: 0, hB: 0, kB: 0, fA: 60, fB: 60, sA: -90 + 10 * c, eA: -lerp(90, 5, c), sB: -90 + 10 * c, eB: -lerp(90, 5, c), rot: 82 - 12 * c, lift: lerp(2, 9, c) };
    if (a.t > a.until) {
      p0.act = { k: "idle" };
      a.done();
    }
  } else if (a.k === "cheer") {
    a.t += dt;
    const j = Math.abs(Math.sin(a.t * 7));
    pose = { ...STAND, lift: j * 9, sA: -165, eA: -10, sB: -160, eB: -10, hA: -8, kA: 20 * j, hB: 6, kB: 24 * j };
    if (a.t > a.until) {
      p0.act = { k: "idle" };
      a.done();
    }
  } else if (ball && !ball.held && ball.z === 0 && Math.hypot(ball.vx, ball.vy) < 5) {
    // idle with the ball: the sole rests on it from time to time
    const near = Math.abs(ball.x - (p0.x + p0.dir * 16 * scaleAt(p0.y))) < 10 && Math.abs(ball.y - p0.y) < 8;
    if (near) {
      const w = (Math.sin(breath * 1.3) + 1) / 2;
      pose = mix(pose, { ...pose, hA: -26, kA: 30, fA: -6 }, w * 0.8);
      ball.rot += Math.cos(breath * 1.3) * 0.6;
    }
  }
  applyPose(pose);
  place(pose);
}

/** While running with the ball: it stays glued to his feet, rolling a little ahead at each touch and coming back. */
let lastTouch = 0;
function dribbleTouch(pose: Pose, speed: number, ux: number, uy: number) {
  if (!ball || !pl || ball.held) return;
  const s = scaleAt(pl.y);
  const d = Math.hypot(ball.x - pl.x, ball.y - pl.y);
  if (d > 30 * s || ball.z > 6) return; // not at his feet: he has to get it first
  // the touch: once per stride, the front foot pushes the ball forward; then he catches up with it
  const stride = (Math.sin(pl.phase) + 1) / 2;
  const reach = (13 + 9 * stride) * s;
  const tx = pl.x + ux * reach;
  const ty = pl.y + uy * reach * 0.5;
  ball.vx = (tx - ball.x) * 14 + ux * speed * 0.2;
  ball.vy = (ty - ball.y) * 14 + uy * speed * 0.2;
  ball.z = 0;
  ball.vz = 0;
  const now = performance.now();
  if (stride > 0.97 && now - lastTouch > 260) {
    lastTouch = now;
    ballTrap(0.18);
  }
  void pose;
}

/** Juggling: the ball only goes up when his foot meets it. The body stays where it is, the legs work. */
function juggleStep(a: Extract<Act, { k: "juggle" }>, dt: number, idle: Pose): Pose {
  const p0 = pl!;
  const s = scaleAt(p0.y);
  const ready: Pose = { ...STAND, lean: 6, hA: -6, kA: 14, hB: 4, kB: 12, sA: -28, eA: -40, sB: 30, eB: -40 };
  const up: Pose = { ...ready, hA: -58, kA: 82, fA: -14 };
  const upB: Pose = { ...ready, hB: -58, kB: 82, fB: -14 };
  const target = a.leg === 0 ? up : upB;
  let pose = mix(idle, ready, 0.9);
  a.age += dt;
  if (!ball || ball.held) {
    a.left = 0;
  } else {
    const contact = footTip(target, a.leg === 0 ? "A" : "B");
    const footX = p0.x + p0.dir * contact.dx * s;
    const contactZ = contact.dz * s + BALL_R * s * 0.6;
    if (!a.swinging && ball.vz < 0) {
      // time until the ball comes down to the foot
      const tFall = (ball.z - contactZ) / Math.max(1, -ball.vz);
      if (tFall < 0.16) {
        a.swinging = true;
        a.t = 0;
      }
    }
    if (a.swinging) {
      a.t += dt;
      const t = a.t;
      pose = t < 0.14 ? mix(ready, target, ease(t / 0.14)) : mix(target, ready, ease((t - 0.14) / 0.22));
      if (t >= 0.12 && t < 0.2 && ball.vz < 0 && ball.z <= contactZ + 8 && Math.abs(ball.x - footX) < 18 * s) {
        a.left -= 1;
        const h = a.left > 0 ? (26 + Math.random() * 22) * s : 12 * s;
        ball.z = contactZ;
        ball.vz = Math.sqrt(2 * G * h);
        ball.vx = (footX - ball.x) * 2 + (p0.x - footX) * 1.4 + (Math.random() - 0.5) * 22;
        ball.vy = (p0.y - ball.y) * 2;
        ballKick(0.32);
        a.leg = a.left % 3 === 0 ? a.leg : ((1 - a.leg) as 0 | 1);
      }
      if (t > 0.36) a.swinging = false;
    }
  }
  // the ball fell on the grass (a miss, or the last soft touch): juggling is over
  if (ball && ball.z === 0 && ball.vz === 0 && !a.swinging && a.age > 0.4) a.left = 0;
  if (a.left <= 0 && ball && ball.z === 0 && !a.swinging) {
    p0.act = { k: "idle" };
    a.done();
  }
  return pose;
}

// ------------------------------------------------------------------ what scripts can ask him

export type Footballer = {
  readonly x: number;
  readonly y: number;
  dead: boolean;
  run: (to: { x: number; y: number } | (() => { x: number; y: number }), opts?: { speed?: number; dribble?: boolean | (() => boolean); stop?: number; timeout?: number }) => Promise<boolean>;
  kick: (dir: 1 | -1, power?: number) => Promise<void>;
  juggle: (touches: number) => Promise<void>;
  tired: (ms: number) => Promise<void>;
  pushups: (ms: number) => Promise<void>;
  cheer: (ms: number) => Promise<void>;
  wait: (ms: number) => Promise<void>;
  destroy: () => void;
};

export function ballInfo() {
  return ball ? { x: ball.x, y: ball.y, z: ball.z, moving: ball.held || ball.z > 0 || Math.hypot(ball.vx, ball.vy) > 8, held: ball.held } : null;
}

export function spawnFootballer(look: Look, x: number, y: number, hooks: { onTap: () => void; onMove: (x: number, y: number) => void }): Footballer {
  pl?.el?.remove();
  const el = document.createElement("div");
  el.className = "fbp";
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", "Ton personnage : touche-le pour ouvrir son menu");
  el.innerHTML = `<div class="fbp__fx">${buildSvg(look)}</div>`;
  document.body.appendChild(el);
  const parts: Record<string, SVGGElement> = {};
  el.querySelectorAll("g[id]").forEach((g) => (parts[g.id] = g as SVGGElement));
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    hooks.onTap();
  });
  pl = { look, x, y, dir: 1, vx: 0, vy: 0, phase: 0, act: { k: "idle" }, el, parts, onTap: hooks.onTap, onMove: hooks.onMove };
  wake();

  const cancelAct = () => {
    const a = pl?.act;
    if (!a || a.k === "idle") return;
    if (pl) pl.act = { k: "idle" };
    if (a.k === "run") a.done(false);
    else a.done();
  };

  const me: Footballer = {
    get x() {
      return pl?.x ?? x;
    },
    get y() {
      return pl?.y ?? y;
    },
    dead: false,
    run: (to, o = {}) =>
      new Promise<boolean>((done) => {
        if (me.dead || !pl) return done(false);
        cancelAct();
        pl.act = { k: "run", to: typeof to === "function" ? to : () => to, dribble: typeof o.dribble === "function" ? o.dribble : () => !!o.dribble, speed: o.speed ?? 300, stop: o.stop ?? 6, done, until: performance.now() + (o.timeout ?? 9000) };
      }),
    kick: (dir, power = 1) =>
      new Promise<void>((done) => {
        if (me.dead || !pl) return done();
        cancelAct();
        pl.dir = dir;
        pl.act = { k: "kick", t: 0, dir, power, hit: false, done };
      }),
    juggle: (touches) =>
      new Promise<void>((done) => {
        if (me.dead || !pl || !ball) return done();
        cancelAct();
        // the first touch: he flicks the ball up from the ground with his toes
        ball.vz = Math.sqrt(2 * G * 34 * scaleAt(pl.y));
        ball.vx = (pl.x + pl.dir * 10 - ball.x) * 2;
        ballKick(0.3);
        pl.act = { k: "juggle", left: touches, t: 0, age: 0, leg: 0, swinging: false, done };
      }),
    tired: (ms) => new Promise<void>((done) => (pl ? (cancelAct(), (pl.act = { k: "tired", t: 0, until: ms / 1000, done })) : done())),
    pushups: (ms) =>
      new Promise<void>((done) => {
        if (!pl) return done();
        cancelAct();
        // he puts the ball down beside him, out of the way of his feet
        if (ball && !ball.held) {
          const s = scaleAt(pl.y);
          ball.x = clamp(pl.x - pl.dir * 22 * s, 20, window.innerWidth - 20);
          ball.y = pl.y + 6 * s;
          ball.vx = ball.vy = ball.vz = 0;
          ball.z = 0;
        }
        pl.act = { k: "push", t: 0, until: ms / 1000, done };
      }),
    cheer: (ms) => new Promise<void>((done) => (pl ? (cancelAct(), (pl.act = { k: "cheer", t: 0, until: ms / 1000, done })) : done())),
    wait: (ms) => new Promise<void>((r) => window.setTimeout(r, ms)),
    destroy: () => {
      me.dead = true;
      cancelAct();
      el.remove();
      if (pl?.el === el) pl = null;
    },
  };
  return me;
}

/** Where to stand to have the ball just in front of the foot, on its side `dir`. */
export function behindBall(dir: 1 | -1) {
  const s = ball ? scaleAt(ball.y) : 1;
  return ball ? { x: ball.x - dir * 15 * s, y: ball.y } : null;
}
/** Stops the ball under the sole (when he reaches it). */
export function trapBall() {
  if (!ball || !pl || ball.held) return false;
  if (Math.hypot(ball.x - pl.x, ball.y - pl.y) > 34 * scaleAt(pl.y) || ball.z > 16) return false;
  ball.vx = ball.vy = ball.vz = 0;
  ball.z = 0;
  ball.x = pl.x + pl.dir * 16 * scaleAt(pl.y);
  ball.y = pl.y;
  ballTrap(0.5);
  return true;
}
