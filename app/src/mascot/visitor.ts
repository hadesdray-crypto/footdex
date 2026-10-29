// Visitors: the Doctor and the Square Referee. They walk in from the side of the screen, do their job, and leave.
// Same jointed body as the Jongleur (hips, knees, feet, shoulders, elbows), moved every frame: walking, kneeling,
// whistling, showing a card, shrugging, dragging a sack. Each one has his own small speech bubble.
import { visitorSpeak } from "./state";
import { figSvg, type Look } from "./look";
import { sideHeadSvg } from "./runner";

/** The referees: they come one at a time, each with his own face. */
export const REFEREES: { name: string; look: Look }[] = [
  { name: "L'Arbitre carré", look: { body: 4, skin: 0, hair: 5, hairColor: 0, outfit: 9, acc: ["whistle", "refcards"] } },
  { name: "L'Arbitre moustachu", look: { body: 3, skin: 1, hair: 3, hairColor: 4, outfit: 9, acc: ["whistle", "refcards", "stache"] } },
  { name: "L'Arbitre à lunettes", look: { body: 2, skin: 2, hair: 2, hairColor: 0, outfit: 9, acc: ["whistle", "refcards", "glasses"] } },
  { name: "L'Arbitre rousse", look: { body: 0, skin: 0, hair: 4, hairColor: 5, outfit: 9, acc: ["whistle", "refcards"] } },
  { name: "L'Arbitre barbu", look: { body: 5, skin: 4, hair: 0, hairColor: 0, outfit: 9, acc: ["whistle", "refcards", "beard"] } },
];

const FIG_W = 66;
const FIG_H = 86;
const HIP = { x: 50, y: 90 };
const THIGH = 17;
const SHIN = 17;
const SHOULDER = { x: 50, y: 62 };

const scaleAt = (y: number) => Math.max(0.78, Math.min(1.2, 0.76 + 0.46 * (y / window.innerHeight)));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));

export type Pose = { lean: number; bob: number; hA: number; kA: number; fA: number; hB: number; kB: number; fB: number; sA: number; eA: number; sB: number; eB: number; rot: number; lift: number };
export const STAND: Pose = { lean: 0, bob: 0, hA: -3, kA: 4, fA: 0, hB: 3, kB: 4, fB: 0, sA: 6, eA: -12, sB: -6, eB: -12, rot: 0, lift: 0 };
export function mix(a: Pose, b: Pose, t: number): Pose {
  const o = { ...a };
  for (const k of Object.keys(a) as (keyof Pose)[]) o[k] = lerp(a[k], b[k], t);
  return o;
}
function gait(p: number, run: number, limp = false): Pose {
  const amp = lerp(22, 38, run);
  const leg = (ph: number, stiff: boolean) => {
    const hip = -amp * Math.sin(ph) * (stiff ? 0.5 : 1);
    const swing = Math.max(0, Math.cos(ph));
    const knee = stiff ? 3 : lerp(10, 22, run) * Math.max(0, -Math.cos(ph)) * 0.6 + lerp(45, 100, run) * swing * swing + 4;
    return [hip, knee, -10 * swing];
  };
  const [hA, kA, fA] = leg(p, false);
  const [hB, kB, fB] = leg(p + Math.PI, limp);
  const arm = lerp(24, 50, run);
  return {
    lean: lerp(3, 12, run) + (limp ? 6 * Math.max(0, Math.sin(p)) : 0),
    bob: -lerp(1.2, 4.5, run) * Math.abs(Math.cos(p)) + (limp ? 3 * Math.max(0, -Math.sin(p)) : 0),
    hA, kA, fA, hB, kB, fB,
    sA: arm * Math.sin(p), eA: -lerp(20, 85, run),
    sB: -arm * Math.sin(p), eB: -lerp(20, 85, run),
    rot: 0,
    lift: 0,
  };
}

// ------------------------------------------------------------------ how they look (seen from the side, facing right)

export type Kind = "medecin" | "arbitre";
type Style = { skin: string; shirt: string; s2: string; legs: string; shorts: string; sock: string; sock2: string; shoe: string; torso: string; head: string; handA?: string; voice: number };

const DOC_HEAD = `<g class="hd">
  <circle cx="52" cy="34" r="24.5" fill="#a8734f"/>
  <path d="M28 36 Q26 10 52 9 Q74 10 76 26 Q64 18 52 20 Q42 22 40 36 Q38 46 32 50 Q26 44 28 36Z" fill="#cfd4dc"/>
  <rect x="32" y="4" width="40" height="11" rx="5" fill="#f4f7fc" stroke="#c9d4ea"/><rect x="50" y="5.5" width="4" height="8" fill="#e0284f"/><rect x="48" y="7.5" width="8" height="4" fill="#e0284f"/>
  <ellipse cx="46" cy="38" rx="4" ry="6" fill="#a8734f" stroke="#00000030"/>
  <circle cx="63" cy="34" r="9" fill="#fff" stroke="#10131c" stroke-width="2.4"/><circle cx="65" cy="35" r="2.6" fill="#10131c"/><path d="M54 32 L44 30" stroke="#10131c" stroke-width="2"/>
  <ellipse cx="77" cy="40" rx="4.4" ry="3.6" fill="#a8734f" stroke="#00000030"/>
  <path d="M46 46 Q52 64 68 62 Q76 56 74 46 Q66 54 52 52Z" fill="#cfd4dc"/>
  <path d="M64 51 Q70 55 74 50" stroke="#5a2019" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>`;
const REF_HEAD = `<g class="hd">
  <rect x="28" y="10" width="48" height="50" rx="9" fill="#f0cfae"/>
  <rect x="28" y="7" width="48" height="11" rx="4" fill="#17120d"/>
  <rect x="42" y="30" width="7" height="11" rx="3" fill="#f0cfae" stroke="#00000030"/>
  <rect x="61" y="29" width="9" height="7" rx="2" fill="#fff"/><circle cx="67" cy="32.5" r="2.2" fill="#10131c"/>
  <path d="M58 25 L73 23" stroke="#17120d" stroke-width="4" stroke-linecap="round"/>
  <path d="M64 50 H75" stroke="#6e2f27" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M40 44 Q44 60 60 60 L76 58 V50 Q70 56 58 54 Q46 52 40 44Z" fill="#17120d" opacity=".55"/></g>`;

const STYLES: Record<Kind, Style> = {
  medecin: {
    skin: "#a8734f", shirt: "#f4f7fc", s2: "#c9d4ea", legs: "#2f5bff", shorts: "#2f5bff", sock: "#2f5bff", sock2: "#2f5bff", shoe: "#f4efe6",
    torso: `<path d="M38 56 H62 Q66 56 66 62 L68 104 H32 L34 62 Q34 56 38 56Z" fill="#f4f7fc" stroke="#c9d4ea"/><path d="M50 58 V102" stroke="#c9d4ea" stroke-width="1.5"/><path d="M56 60 Q50 74 56 80 Q62 82 62 76" stroke="#10131c" stroke-width="2" fill="none"/><circle cx="62" cy="76" r="3" fill="#8f9bb6"/>`,
    head: DOC_HEAD,
    handA: `<g transform="translate(0 16)"><rect x="-10" y="0" width="20" height="15" rx="3" fill="#e0284f"/><rect x="-2" y="2.5" width="4" height="10" fill="#fff"/><rect x="-5" y="5.5" width="10" height="4" fill="#fff"/><path d="M-5 0 Q0 -6 5 0" stroke="#7a0a1f" stroke-width="2" fill="none"/></g>`,
    voice: 0.92,
  },
  arbitre: {
    skin: "#f0cfae", shirt: "#222831", s2: "#f6c453", legs: "#f0cfae", shorts: "#10131c", sock: "#10131c", sock2: "#f6c453", shoe: "#10131c",
    torso: `<rect x="33" y="55" width="34" height="38" rx="5" fill="#222831"/><rect x="33" y="55" width="34" height="6" fill="#f6c453"/><rect x="36" y="66" width="10" height="7" rx="1.5" fill="#f6c453"/><path d="M58 60 L62 74" stroke="#10131c" stroke-width="1.4"/><circle cx="62" cy="76" r="3" fill="#c9d4ea"/>`,
    head: REF_HEAD,
    voice: 0.78,
  },
};

function buildSvg(k: Kind, look?: Look): string {
  const st = look ? { ...STYLES[k], skin: ["#f0cfae", "#e5b98f", "#d9a67a", "#a8734f", "#7a4a30", "#5a3624", "#86a462"][look.skin] ?? STYLES[k].skin, head: sideHeadSvg(look), legs: ["#f0cfae", "#e5b98f", "#d9a67a", "#a8734f", "#7a4a30", "#5a3624", "#86a462"][look.skin] ?? STYLES[k].legs } : STYLES[k];
  const leg = (id: string, far: boolean) => `<g id="${id}H" class="${far ? "far" : ""}" transform="translate(${HIP.x} ${HIP.y})">
      <rect x="-6" y="-2" width="12" height="${THIGH + 3}" rx="5" fill="${st.legs}"/>
      <rect x="-7.5" y="-4" width="15" height="11" rx="5" fill="${st.shorts}" stroke="#00000025"/>
      <g id="${id}K" transform="translate(0 ${THIGH})">
        <rect x="-5.6" y="-1" width="11.2" height="${SHIN + 1}" rx="4.5" fill="${st.sock}"/>
        <rect x="-5.8" y="3" width="11.6" height="3.6" fill="${st.sock2}"/>
        <g id="${id}F" transform="translate(0 ${SHIN})"><path d="M-6 -3 H6 Q15 -3 16 2.6 Q16 6 12 6 H-5 Q-8 6 -8 2Z" fill="${st.shoe}" stroke="#00000040"/></g>
      </g></g>`;
  const arm = (id: string, far: boolean, hand = "") => `<g id="${id}S" class="${far ? "far" : ""}" transform="translate(${SHOULDER.x} ${SHOULDER.y})">
      <rect x="-4" y="0" width="8" height="14" rx="4" fill="${k === "medecin" ? st.shirt : st.skin}"/>
      <rect x="-6.5" y="-5" width="13" height="12" rx="6" fill="${st.shirt}" ${k === "medecin" ? 'stroke="#c9d4ea"' : ""}/>
      <g id="${id}E" transform="translate(0 13)"><rect x="-3.6" y="-1" width="7.2" height="13" rx="3.6" fill="${k === "medecin" ? st.shirt : st.skin}"/><circle cx="0" cy="13" r="4.6" fill="${st.skin}"/>
        <g id="${id}P">${hand}</g></g></g>`;
  return `<svg viewBox="0 0 100 132" aria-hidden="true" overflow="visible">
    ${leg("lB", true)}${arm("aB", true)}
    <g id="up">${st.torso}<g id="hd">${st.head}</g></g>
    ${leg("lA", false)}${arm("aA", false, st.handA ?? "")}
  </svg>`;
}

// ------------------------------------------------------------------ a visitor, and what he can do

type Act =
  | { k: "idle" }
  | { k: "walk"; to: { x: number; y: number }; speed: number; limp: boolean; done: () => void }
  | { k: "pose"; name: PoseName; t: number; until: number; done: () => void };
export type PoseName = "kneel" | "work" | "wave" | "whistle" | "card" | "shrug" | "drag" | "think" | "point" | "bitten" | "surprised" | "fiddle";

const CARD_SVG = (c: string) => `<rect x="-6" y="6" width="13" height="18" rx="2" fill="${c}" stroke="#00000055"/>`;

export class Visitor {
  kind: Kind;
  x: number;
  y: number;
  dir: 1 | -1 = 1;
  el: HTMLElement;
  bubble: HTMLElement;
  parts: Record<string, SVGGElement> = {};
  act: Act = { k: "idle" };
  phase = 0;
  age = 0;
  dead = false;
  extra: HTMLElement | null = null; // a sack dragged behind him, for example

  look: Look | null = null;
  isFront = false;

  constructor(kind: Kind, x: number, y: number) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.el = document.createElement("div");
    this.el.className = `vis vis--${kind}`;
    this.el.setAttribute("aria-hidden", "true");
    // the referee: one of several, with a side view to walk and a front view to talk to you
    if (kind === "arbitre") this.look = REFEREES[Math.floor(Math.random() * REFEREES.length)].look;
    this.el.innerHTML = `<div class="vis__fx">${buildSvg(kind, this.look ?? undefined)}</div>${this.look ? `<div class="vis__front"><div class="mfw">${figSvg(this.look, { size: 74, mouth: "smile", label: "L'arbitre" })}</div></div>` : ""}`;
    this.bubble = document.createElement("div");
    this.bubble.className = "vis__bubble";
    document.body.appendChild(this.el);
    document.body.appendChild(this.bubble);
    this.el.querySelectorAll("g[id]").forEach((g) => (this.parts[g.id] = g as SVGGElement));
    all.add(this);
    wake();
  }

  /** Turns to face you (the referee), or back to his side view to walk. */
  front(on: boolean) {
    if (!this.look) return;
    this.isFront = on;
    this.el.classList.toggle("is-front", on);
    if (!on) delete this.el.dataset.pose;
  }
  walk(to: { x: number; y: number }, speed = 150, limp = false) {
    return new Promise<void>((done) => {
      if (this.dead) return done();
      this.end();
      this.front(false);
      this.act = { k: "walk", to, speed, limp, done };
    });
  }
  pose(name: PoseName, ms: number) {
    return new Promise<void>((done) => {
      if (this.dead) return done();
      this.end();
      if (this.isFront) this.el.dataset.pose = name;
      this.act = { k: "pose", name, t: 0, until: ms / 1000, done };
    });
  }
  face(dx: number) {
    if (dx) this.dir = dx > 0 ? 1 : -1;
  }
  hold(svg: string) {
    const h = this.parts.aAP;
    if (h) h.innerHTML = svg;
    if (!svg) delete this.el.dataset.card;
  }
  /** The Doctor's metal collar, against zombie bites. */
  collar() {
    const up = this.parts.up;
    if (up && !up.querySelector(".collar")) up.insertAdjacentHTML("beforeend", `<g class="collar"><rect x="39" y="50" width="24" height="8" rx="3" fill="#b8c2d0" stroke="#5a6475"/><circle cx="44" cy="54" r="1.4" fill="#5a6475"/><circle cx="51" cy="54" r="1.4" fill="#5a6475"/><circle cx="58" cy="54" r="1.4" fill="#5a6475"/></g>`);
  }
  card(color: "jaune" | "rouge") {
    this.hold(CARD_SVG(color === "jaune" ? "#f6c453" : "#e0284f"));
    this.el.dataset.card = color;
  }
  /** Says a line in his own bubble, with his own (lower or higher) voice. */
  say(text: string, ms = 2600) {
    this.bubble.textContent = text;
    this.bubble.classList.add("is-on");
    visitorSpeak(text, this.kind);
    window.clearTimeout(this.sayTimer);
    this.sayTimer = window.setTimeout(() => this.bubble.classList.remove("is-on"), Math.max(ms, 1200 + text.length * 55));
  }
  sayTimer = 0;
  wait(ms: number) {
    return new Promise<void>((r) => window.setTimeout(r, ms));
  }
  /** Walks out by the nearest side, then disappears. */
  async leave(limp = false) {
    const side = this.x < window.innerWidth / 2 ? -60 : window.innerWidth + 60;
    await this.walk({ x: side, y: this.y }, limp ? 70 : 160, limp);
    this.destroy();
  }
  private end() {
    const a = this.act;
    this.act = { k: "idle" };
    if (a.k !== "idle") a.done();
  }
  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.end();
    this.el.remove();
    this.bubble.remove();
    this.extra?.remove();
    all.delete(this);
  }

  step(dt: number) {
    this.age += dt;
    let p: Pose = { ...STAND, bob: Math.sin(this.age * 2.2) * 0.6 };
    const a = this.act;
    if (a.k === "walk") {
      const dx = a.to.x - this.x;
      const dy = a.to.y - this.y;
      const d = Math.hypot(dx, dy);
      const s = scaleAt(this.y);
      if (d < 3) {
        this.act = { k: "idle" };
        a.done();
      } else {
        const step = Math.min(d, a.speed * s * dt);
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
        if (Math.abs(dx) > 2) this.face(dx);
        const run = clamp((a.speed - 90) / 230, 0, 1);
        this.phase += (step / (lerp(11, 20, run) * s)) * Math.PI * 0.5;
        p = gait(this.phase, run, a.limp);
        if (this.extra) p = mix(p, { ...p, lean: -14, sA: 40, eA: -10, sB: 30, eB: -10 }, 0.85);
      }
    } else if (a.k === "pose") {
      a.t += dt;
      const t = a.t;
      const w = Math.sin(t * 9);
      const P: Record<PoseName, Pose> = {
        kneel: { ...STAND, lean: 18, bob: 16, hA: -70, kA: 100, hB: 30, kB: 110, fB: 40, sA: -50, eA: -40, sB: -30, eB: -30 },
        work: { ...STAND, lean: 22, bob: 16, hA: -70, kA: 100, hB: 30, kB: 110, fB: 40, sA: -60 + 18 * w, eA: -50 - 20 * w, sB: -45 - 15 * w, eB: -30 },
        wave: { ...STAND, sA: -160 + 22 * w, eA: -20, sB: 4 },
        whistle: { ...STAND, lean: -4, sA: -120, eA: -110, sB: 10, bob: Math.abs(w) * -1.5 },
        card: { ...STAND, lean: -6, sA: -172, eA: -4, sB: 14, hB: 8 },
        shrug: { ...STAND, lean: -2, sA: -64, eA: -70, sB: -64, eB: -70, hA: -26 + 4 * w, kA: 40, bob: -1 },
        drag: { ...STAND, lean: -16, sA: 40, eA: -10, sB: 30, eB: -10, hA: 10, kA: 10, hB: -14, kB: 18 },
        think: { ...STAND, sA: -110, eA: -120, sB: -20, eB: -60 },
        point: { ...STAND, sA: -90, eA: -2, sB: 6 },
        bitten: { ...STAND, lean: -10 + 4 * w, sA: -150, eA: -30, sB: -140, eB: -40 },
        fiddle: { ...STAND, sA: -50, eA: -80, sB: -40, eB: -80, lean: 4 },
        surprised: { ...STAND, lean: -12, sA: -150, eA: -125, sB: -150, eB: -125, bob: -4 * Math.abs(w), hA: -8, kA: 8 },
      };
      const target = P[a.name];
      p = t < 0.3 ? mix(p, target, ease(t / 0.3)) : target;
      if (t >= a.until) {
        this.act = { k: "idle" };
        a.done();
      }
    }
    this.apply(p);
  }

  apply(p: Pose) {
    const set = (id: string, tr: string) => this.parts[id]?.setAttribute("transform", tr);
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
    const s = scaleAt(this.y);
    this.el.style.transform = `translate(${this.x - FIG_W / 2}px,${this.y - FIG_H - p.lift}px) scale(${s})`;
    this.el.style.zIndex = String(57 + Math.round(this.y / 60));
    (this.el.firstElementChild as HTMLElement).style.transform = `scaleX(${this.dir})`;
    const bw = 200;
    this.bubble.style.transform = `translate(${clamp(this.x - bw / 2, 8, window.innerWidth - bw - 8)}px,${Math.max(60, this.y - FIG_H * s - 54)}px)`;
    if (this.extra) {
      // the sack follows behind him, on the ground
      const sx = this.x - this.dir * 46 * s;
      this.extra.style.transform = `translate(${sx - 30 * s}px,${this.y - 40 * s}px) scale(${s})`;
      this.extra.style.zIndex = this.el.style.zIndex;
    }
  }
}

const all = new Set<Visitor>();
let raf = 0;
let last = 0;
function wake() {
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  all.forEach((v) => v.step(dt));
  raf = all.size ? requestAnimationFrame(frame) : 0;
}

/** A visitor comes in from the side nearest to `x`. */
export function enter(kind: Kind, x: number, y: number): Visitor {
  const fromLeft = x < window.innerWidth / 2;
  const v = new Visitor(kind, fromLeft ? -50 : window.innerWidth + 50, y);
  v.dir = fromLeft ? 1 : -1;
  return v;
}
export const visitorsOnScreen = () => all.size;
export function sendAllAway() {
  all.forEach((v) => v.destroy());
}

/** The doctor's sack (for the zombie in pieces): it grumbles and wriggles. */
export function sackFor(v: Visitor) {
  const el = document.createElement("div");
  el.className = "vis__sack";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<svg viewBox="0 0 60 44" width="60" height="44"><path d="M4 42 Q0 18 22 10 Q40 4 54 18 Q62 30 56 42Z" fill="#6b5a3a" stroke="#3a2e1e" stroke-width="2"/><path d="M20 12 Q24 4 32 6" stroke="#3a2e1e" stroke-width="3" fill="none"/><path d="M60 26 L66 22" stroke="#3a2e1e" stroke-width="2"/><ellipse cx="30" cy="43" rx="22" ry="3" fill="#5fae1e" opacity=".7"/></svg>`;
  document.body.appendChild(el);
  v.extra = el;
  return el;
}

/** A small portrait of the Doctor or the Referee (for the voice picker). */
export function visitorFace(k: Kind): string {
  return buildSvg(k).replace('viewBox="0 0 100 132" aria-hidden="true" overflow="visible"', 'viewBox="18 2 72 72" aria-hidden="true" width="46" height="46"');
}
