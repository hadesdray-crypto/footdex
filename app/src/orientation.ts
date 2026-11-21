// Portrait or landscape: the app knows how the screen is held (phone or tablet) and the pages change their layout (CSS).
// When the screen turns, a ball flies in, grows, hits the glass (boum, small shake) and hides the screen while the
// layout changes behind it, then flies off: the new layout appears. Nothing is reloaded, nothing is closed.
// Now and then (once every 5 to 10 turns) the glass « cracks » for the joke, and the Doctor comes to repair it.
// Light: transform and opacity only, about one second. Simple fade under html.fluide-leger or « reduce motion ».
import { useSyncExternalStore } from "react";
import { chocEcran } from "./sound";
import { storageGet, storageSet } from "./util";
import { EVT_ECRAN, type Recal } from "./mascot/recaler";
import { BALL_SVG } from "./mascot/player";
import { enter, visitorsOnScreen } from "./mascot/visitor";

export type Sens = "portrait" | "paysage";
export type Format = "telephone" | "tablette" | "grand";

const CLE = "footdex.ballon-ecran";
const html = () => document.documentElement;
const wait = (ms: number) => new Promise<void>((ok) => window.setTimeout(ok, ms));

// ------------------------------------------------------------------ the parents' setting (« Pour les grands »)
let ballonOn = storageGet(CLE) !== "off";
const ecoute = new Set<() => void>();
export const ballonEcranOn = () => ballonOn;
export function setBallonEcran(on: boolean) {
  ballonOn = on;
  storageSet(CLE, on ? "on" : "off");
  ecoute.forEach((f) => f());
}
export function useBallonEcran(): boolean {
  return useSyncExternalStore((f) => { ecoute.add(f); return () => ecoute.delete(f); }, ballonEcranOn);
}

// ------------------------------------------------------------------ how the screen is held
export function sensEcran(): Sens {
  try {
    return window.matchMedia("(orientation: portrait)").matches ? "portrait" : "paysage";
  } catch {
    return window.innerHeight >= window.innerWidth ? "portrait" : "paysage";
  }
}
export function formatEcran(): Format {
  const petit = Math.min(window.innerWidth, window.innerHeight);
  return petit < 600 ? "telephone" : petit < 1100 ? "tablette" : "grand";
}
function marquer() {
  const s = sensEcran();
  const f = formatEcran();
  const c = html().classList;
  c.toggle("ecran-portrait", s === "portrait");
  c.toggle("ecran-paysage", s === "paysage");
  for (const x of ["telephone", "tablette", "grand"] as Format[]) c.toggle(`ecran-${x}`, x === f);
}

// ------------------------------------------------------------------ keeping the place in the page
// While scrolling, we note the block at the top of the screen; after the turn, the page goes back to that block.
let ancre: { el: Element; top: number } | null = null;
let ancreRaf = 0;
function noterAncre() {
  ancreRaf = 0;
  if (enCours) return;
  if (window.scrollY < 30) { ancre = null; return; }
  // a small block (a title, a line, a card), not the whole page: try a few points near the top of the screen
  const W = window.innerWidth;
  const H = window.innerHeight;
  let el: Element | null = null;
  for (const y of [0.3, 0.4, 0.5, 0.2].map((k) => Math.min(H * k, 260 + k * 100))) {
    for (const x of [0.5, 0.3, 0.7, 0.12].map((k) => W * k)) {
      const sous = document.elementFromPoint(x, y);
      if (sous && sous.closest("#contenu") && sous.getBoundingClientRect().height < H * 0.5) { el = sous; break; }
    }
    if (el) break;
  }
  ancre = el ? { el, top: el.getBoundingClientRect().top } : null;
}
function remettreAncre() {
  if (!ancre || !ancre.el.isConnected) return;
  const dy = ancre.el.getBoundingClientRect().top - ancre.top;
  if (Math.abs(dy) > 2) window.scrollBy(0, dy);
}

// ------------------------------------------------------------------ the show
let enCours = false;
let couvert = false; // the screen is hidden (by the ball, or by the simple fade)
let encore = false; // the screen turned again during the show: one more hidden moment, no second ball
let taille = { w: 0, h: 0 };
let avantFissure = 5 + Math.floor(Math.random() * 6); // once every 5 to 10 turns
let docteur = false;
let fissures: HTMLElement | null = null;

const essai = () => (typeof location !== "undefined" ? (location.search.match(/essai-ballon(?:=([a-z]+))?/) ?? null) : null);
const leger = () => html().classList.contains("fluide-leger") || matchMedia("(prefers-reduced-motion: reduce)").matches || !ballonOn;
const occupe = () => !!document.querySelector(".reveal, .majfull, .mm, .wd, .subst, .chm");

/** Everybody goes to the same place of the new screen, the page goes back to the same block. */
function recalerTout() {
  const w1 = window.innerWidth;
  const h1 = window.innerHeight;
  if (taille.w && (taille.w !== w1 || taille.h !== h1)) {
    const d: Recal = { w0: taille.w, h0: taille.h, w1, h1 };
    window.dispatchEvent(new CustomEvent(EVT_ECRAN, { detail: d }));
  }
  taille = { w: w1, h: h1 };
  remettreAncre();
}

function voile(): HTMLElement {
  const v = document.createElement("div");
  v.className = "tourne";
  v.setAttribute("aria-hidden", "true");
  v.innerHTML = `<div class="tourne__voile"></div><div class="tourne__onde"></div><div class="tourne__ballon"><div class="tourne__spin">${BALL_SVG}</div></div>`;
  document.body.appendChild(v);
  return v;
}

const anim = (el: Element | null, k: Keyframe[], o: KeyframeAnimationOptions) => (el ? el.animate(k, { fill: "forwards", ...o }).finished.catch(() => undefined) : Promise.resolve());

async function spectacle() {
  enCours = true;
  couvert = true;
  const v = voile();
  const simple = leger();
  const e = essai();
  try {
    if (simple) {
      v.classList.add("tourne--simple");
      recalerTout();
      await wait(140);
      while (encore) { encore = false; recalerTout(); await wait(140); }
      couvert = false;
      await anim(v.querySelector(".tourne__voile"), [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "ease-out" });
      return;
    }
    // will the glass crack this time?
    avantFissure -= 1;
    let fissure = (avantFissure <= 0 && !occupe() && !docteur && visitorsOnScreen() === 0) || (e?.[1] === "fissure" && !docteur);
    if (e?.[1] === "simple") fissure = false;
    if (avantFissure <= 0) avantFissure = 5 + Math.floor(Math.random() * 6);
    // 1. the ball comes from far away (from a corner of the pitch) and grows towards the glass
    const ballon = v.querySelector<HTMLElement>(".tourne__ballon");
    const spin = v.querySelector<HTMLElement>(".tourne__spin");
    const dx = (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random() * 15);
    const dy = 20 + Math.random() * 15;
    void anim(spin, [{ transform: "rotate(-320deg)" }, { transform: "rotate(0deg)" }], { duration: 400, easing: "cubic-bezier(.3,.6,.4,1)" });
    await anim(ballon, [
      { transform: `translate(-50%, -50%) translate(${dx}vw, ${dy}vh) scale(0.06)`, opacity: 0 },
      { opacity: 1, offset: 0.2 },
      { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
    ], { duration: 400, easing: "cubic-bezier(.55,0,.9,.6)" });
    // 2. BOUM: the ball squashes against the glass, the screen shakes, the layout is changed behind
    chocEcran(fissure);
    recalerTout();
    if (fissure) poserFissures();
    void anim(v.querySelector(".tourne__onde"), [{ transform: "translate(-50%, -50%) scale(0.5)", opacity: 0.9 }, { transform: "translate(-50%, -50%) scale(1.5)", opacity: 0 }], { duration: 380, easing: "ease-out" });
    void anim(v, [
      { transform: "translate(0, 0)" }, { transform: "translate(-9px, 5px)" }, { transform: "translate(8px, -6px)" },
      { transform: "translate(-5px, -3px)" }, { transform: "translate(3px, 3px)" }, { transform: "translate(0, 0)" },
    ], { duration: 260, easing: "linear" });
    await anim(ballon, [
      { transform: "translate(-50%, -50%) scale(1)" },
      { transform: "translate(-50%, -50%) scale(1.1, 0.88)", offset: 0.35 },
      { transform: "translate(-50%, -50%) scale(0.97, 1.03)", offset: 0.7 },
      { transform: "translate(-50%, -50%) scale(1)" },
    ], { duration: 180, easing: "ease-out" });
    while (encore) { encore = false; recalerTout(); await wait(120); }
    // 3. the ball bounces back and flies away: the new layout appears
    couvert = false;
    recalerTout();
    void anim(v.querySelector(".tourne__voile"), [{ opacity: 1 }, { opacity: 0 }], { duration: 330, delay: 60, easing: "ease-out" });
    await anim(ballon, [
      { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
      { opacity: 1, offset: 0.7 },
      { transform: `translate(-50%, -50%) translate(${-dx * 0.6}vw, -40vh) scale(0.05)`, opacity: 0 },
    ], { duration: 360, easing: "cubic-bezier(.2,.7,.4,1)" });
    if (fissure) void docteurRepare();
  } finally {
    v.remove();
    couvert = false;
    enCours = false;
    if (encore) { encore = false; recalerTout(); }
  }
}

// ------------------------------------------------------------------ the joke: the glass cracks, the Doctor repairs it
function lignesFissure(): string {
  // lines that start from the point of impact (the middle) and break into small branches
  const r = (a: number, b: number) => a + Math.random() * (b - a);
  let d = "";
  const n = 9 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i += 1) {
    let a = (i / n) * Math.PI * 2 + r(-0.25, 0.25);
    let x = 500 + Math.cos(a) * r(20, 45);
    let y = 500 + Math.sin(a) * r(20, 45);
    d += `M${x.toFixed(0)} ${y.toFixed(0)}`;
    const pas = 5 + Math.floor(Math.random() * 4);
    for (let k = 0; k < pas; k += 1) {
      a += r(-0.45, 0.45);
      const l = r(45, 95);
      x += Math.cos(a) * l;
      y += Math.sin(a) * l;
      d += ` L${x.toFixed(0)} ${y.toFixed(0)}`;
      if (Math.random() < 0.35) {
        const b = a + (Math.random() < 0.5 ? -1 : 1) * r(0.5, 1.1);
        d += ` M${x.toFixed(0)} ${y.toFixed(0)} l${(Math.cos(b) * r(30, 70)).toFixed(0)} ${(Math.sin(b) * r(30, 70)).toFixed(0)} M${x.toFixed(0)} ${y.toFixed(0)}`;
      }
    }
  }
  // the rings of the impact around the middle
  let anneaux = "";
  for (const rr of [36, 80]) {
    let p = "";
    for (let k = 0; k <= 10; k += 1) {
      const a = (k / 10) * Math.PI * 2;
      const q = rr * r(0.85, 1.15);
      p += `${k ? " L" : "M"}${(500 + Math.cos(a) * q).toFixed(0)} ${(500 + Math.sin(a) * q).toFixed(0)}`;
    }
    anneaux += p;
  }
  return `<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <path d="${d} ${anneaux}" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d} ${anneaux}" fill="none" stroke="#eef2fb" stroke-opacity=".9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="500" cy="500" r="22" fill="#eef2fb" fill-opacity=".18"/>
  </svg>`;
}
function poserFissures() {
  fissures?.remove();
  fissures = document.createElement("div");
  fissures.className = "fissures";
  fissures.setAttribute("aria-hidden", "true");
  fissures.innerHTML = lignesFissure();
  document.body.appendChild(fissures);
}
async function docteurRepare() {
  if (docteur || !fissures) return;
  docteur = true;
  const f = fissures;
  try {
    await wait(350);
    const y = Math.max(140, window.innerHeight - 120);
    const d = enter("medecin", Math.random() < 0.5 ? 0 : window.innerWidth, y);
    // he talks only when the one who is talking has finished (the queue of the voices does it)
    d.say("Ne bouge pas, je répare l'écran !", 2200);
    await d.walk({ x: window.innerWidth / 2 + (d.x < window.innerWidth / 2 ? -40 : 40), y: Math.max(140, window.innerHeight - 120) }, 320);
    await d.talked();
    // he repairs: the cracks fade away while he works
    f.classList.add("fissures--repare");
    await d.pose("fiddle", 1900);
    f.remove();
    if (fissures === f) fissures = null;
    d.say("Voilà, comme neuf !", 1600);
    await d.pose("wave", 900);
    await d.leave();
  } finally {
    f.remove();
    if (fissures === f) fissures = null;
    docteur = false;
  }
}

// ------------------------------------------------------------------ start
function quandCaTourne() {
  marquer();
  const w = window.innerWidth;
  // the keyboard that opens only changes the height: that is not the screen turning
  if (w === taille.w) return;
  if (enCours) {
    // one show at a time: the one already running covers this turn too
    if (couvert) encore = true;
    else recalerTout();
    return;
  }
  void spectacle();
}

export function demarrerOrientation() {
  if (typeof window === "undefined") return;
  marquer();
  taille = { w: window.innerWidth, h: window.innerHeight };
  try {
    window.matchMedia("(orientation: portrait)").addEventListener("change", quandCaTourne);
  } catch {
    /* very old browser: the layout still follows the screen (CSS) */
  }
  window.addEventListener("resize", () => {
    marquer();
    // same orientation, other width (a window that changes size): the characters stay inside, no show
    // (the keyboard that opens only changes the height: nobody moves)
    if (!enCours && window.innerWidth !== taille.w && sensEcran() === (taille.w > taille.h ? "paysage" : "portrait")) recalerTout();
  }, { passive: true });
  window.addEventListener("scroll", () => { if (!ancreRaf) ancreRaf = requestAnimationFrame(noterAncre); }, { passive: true });
  window.setInterval(() => { if (document.visibilityState === "visible" && !ancreRaf) ancreRaf = requestAnimationFrame(noterAncre); }, 1500);
  if (essai()) (window as unknown as { __ballonEcran?: unknown }).__ballonEcran = { lancer: () => void spectacle(), enCours: () => enCours, fissures: () => !!fissures, docteur: () => docteur };
}
