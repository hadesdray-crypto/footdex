// « Le Chapardeur » : nobody knows where he comes from. A shadow spreads on the ground, a black hole opens,
// a long purple arm comes up out of it, grabs something (a friend, the ball, a coin, a card), and pulls it down
// into the hole. Then the hole closes, and a laugh is heard. His own design: a purple sleeve, a long thin hand.
import { speakAs } from "./state";
import { growl, thud } from "../sound";

export type Raid = {
  x: number; // where the hole opens (feet of the thing he takes)
  y: number;
  reach: number; // how high the hand goes (px): the middle of what he takes
  /** the hand closes on it */
  grab?: () => void;
  /** he lifts it a little (px above the ground) */
  lift?: (px: number) => void;
  /** it sinks into the hole: 0 (not yet) to 1 (gone) */
  sink?: (k: number) => void;
  /** the hole has closed: the thing is gone */
  gone?: () => void;
  /** caught: what he held falls back */
  release?: () => void;
  /** caught: he gives back what he took the time before */
  caught?: () => void;
};

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
async function tween(ms: number, f: (k: number) => void) {
  const t0 = performance.now();
  await new Promise<void>((done) => {
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      f(ease(k));
      if (k < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  });
}

const HAND_OPEN = `<svg viewBox="0 0 44 52" width="44" height="52" aria-hidden="true"><rect x="9" y="30" width="26" height="14" rx="4" fill="#f2f2f7" stroke="#8b8aa5" stroke-width="2"/><path d="M12 32 Q10 14 6 6 M19 30 Q19 10 18 0 M27 30 Q28 10 30 1 M34 32 Q37 16 41 8" stroke="#2a1a4d" stroke-width="6" stroke-linecap="round" fill="none"/><ellipse cx="22" cy="34" rx="14" ry="9" fill="#2a1a4d"/></svg>`;
const HAND_SHUT = `<svg viewBox="0 0 44 52" width="44" height="52" aria-hidden="true"><rect x="9" y="30" width="26" height="14" rx="4" fill="#f2f2f7" stroke="#8b8aa5" stroke-width="2"/><ellipse cx="22" cy="24" rx="15" ry="15" fill="#2a1a4d"/><path d="M12 20 Q22 14 32 20 M12 26 Q22 20 32 26" stroke="#4a3a7d" stroke-width="2" fill="none"/></svg>`;

// His own design: a hooded purple creature bent right over, horizontal, shuffling sideways above his hole; one long thin sleeve hangs down into it.
const THIEF = `<svg viewBox="0 0 150 100" width="150" height="100" aria-hidden="true"><path d="M26 86 l4 10 h8 l-2 -10Z M52 86 l4 10 h8 l-2 -10Z" fill="#1d0f3d"/><rect x="31" y="58" width="6" height="30" rx="3" fill="#1d0f3d"/><rect x="57" y="58" width="6" height="30" rx="3" fill="#1d0f3d"/><path d="M8 40 Q6 26 34 24 L112 24 Q128 26 128 44 L126 64 Q80 74 20 62 Q6 56 8 40Z" fill="#3b1d7a"/><path d="M20 34 Q60 30 108 32 M16 46 Q64 42 120 46 M18 56 Q64 56 118 58" stroke="#5b3aa8" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M8 52 l-8 8 l10 -2 l-2 10 l12 -8Z" fill="#3b1d7a"/><circle cx="124" cy="52" r="24" fill="#2a1a4d"/><ellipse cx="126" cy="58" rx="15" ry="13" fill="#0d0620"/><circle cx="121" cy="60" r="3.4" fill="#ffe58a"/><circle cx="132" cy="60" r="3.4" fill="#ffe58a"/><path d="M118 67 Q126 72 134 67" stroke="#ffe58a" stroke-width="2.2" fill="none" stroke-linecap="round"/><path class="thief__sleeve" d="M121 72 H131 V100 H121Z" fill="#9b84c9"/></svg>`;

/**
 * The whole raid. A black hole opens under what he takes: his long arm comes up, takes it, and pulls it down.
 * Then the hole stays open: DOUBLE TAP it and the arm shoots up again, to catch HIM. He shuffles from side to side above
 * his own hole and tries to dodge: the arm only catches him if it arrives right when he is above it.
 * Resolves true if he was caught, false if he got away.
 */
export async function thiefRaid(r: Raid): Promise<boolean> {
  const root = document.createElement("div");
  root.className = "thief";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `<i class="thief__shade"></i><i class="thief__shadow"></i><i class="thief__hole thief__hole--top"></i><b class="thief__boss">${THIEF}</b><i class="thief__hole"></i><b class="thief__arm"><span class="thief__hand">${HAND_OPEN}</span></b><u class="thief__hint">Touche 2 fois le trou noir : le bras monte. Attrape-le quand il passe au-dessus !</u>`;
  const q = (c: string) => root.querySelector<HTMLElement>(c)!;
  const shade = q(".thief__shade"), shadow = q(".thief__shadow"), hole = q(".thief__hole:not(.thief__hole--top)"), top = q(".thief__hole--top"), boss = q(".thief__boss"), arm = q(".thief__arm"), hand = q(".thief__hand"), hint = q(".thief__hint");
  const vh = window.innerHeight, vw = window.innerWidth;
  // his hole is well above what he takes (the arm has to reach it), never on top of the top bar
  const topY = Math.max(110, Math.min(vh * 0.4, r.y - 230, r.y - 110));
  const reachH = Math.max(80, r.y - topY + 24); // how high the arm goes to catch him
  const amp = Math.max(70, Math.min(vw * 0.32, 130));
  let phase = Math.random() * 6;
  let speed = 1;
  let react = 1;
  const bxOf = (ph: number) => Math.max(60, Math.min(vw - 60, r.x + (amp * (Math.sin(ph) + 0.25 * Math.sin(2.3 * ph + 1))) / 1.25));
  let bx = bxOf(phase);
  const place = () => { boss.style.left = `${bx}px`; top.style.left = `${bx}px`; };
  for (const el of [shadow, hole, arm]) { el.style.left = `${r.x}px`; el.style.top = `${r.y}px`; }
  for (const el of [top, boss]) el.style.top = `${topY}px`;
  place();
  document.body.appendChild(root);
  let caught = false;
  let wantReach = false;
  let ready = false;
  let patrol = true;
  let armH = 0;
  // double tap on the black hole = the arm shoots up
  let lastTap = 0;
  const tap = () => {
    const t = performance.now();
    if (ready && t - lastTap < 500) { wantReach = true; lastTap = 0; return; }
    lastTap = t;
  };
  hole.addEventListener("pointerdown", tap);
  // he shuffles from side to side, a little faster each time he is missed; faster still when the arm comes up
  let raf = 0;
  let last = performance.now();
  const loop = (t: number) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (patrol) { phase += dt * ((Math.PI * 2) / 2.7) * speed * react; bx = bxOf(phase); place(); }
    raf = requestAnimationFrame(loop);
  };
  try {
    growl(0.7);
    requestAnimationFrame(() => { shade.classList.add("is-on"); shadow.classList.add("is-on"); });
    await wait(1500);
    thud();
    hole.classList.add("is-on");
    top.classList.add("is-on");
    boss.classList.add("is-on"); // he shows up above, bent over his own hole…
    raf = requestAnimationFrame(loop);
    await wait(550);
    // …and the arm comes out of the second hole, takes what is there, and pulls it down
    const h = Math.max(50, r.reach);
    await tween(850, (k) => { armH = k * h; arm.style.height = `${armH}px`; });
    await wait(150);
    hand.innerHTML = HAND_SHUT;
    r.grab?.();
    await wait(1300);
    await tween(350, (k) => { armH = h + k * 14; arm.style.height = `${armH}px`; r.lift?.(k * 14); });
    await tween(1050, (k) => { armH = (h + 14) * (1 - k); arm.style.height = `${armH}px`; r.sink?.(k); });
    r.gone?.();
    // the hole stays open for a while: now it is the player's turn
    hand.innerHTML = HAND_OPEN;
    hint.classList.add("is-on");
    hole.style.pointerEvents = "auto";
    hole.classList.add("is-ready");
    ready = true;
    const until = performance.now() + 12000;
    let tries = 0;
    while (!caught && performance.now() < until && tries < 6) {
      await wait(40);
      if (!wantReach) continue;
      wantReach = false;
      tries += 1;
      hand.innerHTML = HAND_OPEN;
      react = 1.5; // he sees the arm coming and runs
      await tween(520, (k) => { armH = k * reachH; arm.style.height = `${armH}px`; });
      react = 1;
      if (Math.abs(bx - r.x) < 58) {
        caught = true;
        break;
      }
      // missed: the arm comes back down, he laughs and goes a little faster
      hand.innerHTML = HAND_SHUT;
      await tween(380, (k) => { armH = reachH * (1 - k); arm.style.height = `${armH}px`; });
      hand.innerHTML = HAND_OPEN;
      speed *= 1.1;
      laugh(r.x, r.y);
    }
    ready = false;
    hint.classList.remove("is-on");
    hole.style.pointerEvents = "none";
    hole.classList.remove("is-ready");
    if (!caught) {
      patrol = false;
      hole.classList.remove("is-on"); top.classList.remove("is-on"); boss.classList.remove("is-on");
      shadow.classList.remove("is-on"); shade.classList.remove("is-on");
      laugh(r.x, r.y);
      await wait(2200);
      return false;
    }
    // caught: the hand closes on him and pulls him down into the hole
    patrol = false;
    hand.innerHTML = HAND_SHUT;
    thud();
    boss.classList.add("is-caught");
    top.classList.remove("is-on");
    boss.style.zIndex = "3";
    const x0 = bx;
    await tween(900, (k) => {
      armH = reachH * (1 - k);
      arm.style.height = `${armH}px`;
      boss.style.left = `${x0 + (r.x - x0) * k}px`;
      boss.style.top = `${r.y - armH + 10}px`;
    });
    await speakCaught();
    r.caught?.();
    await wait(1600);
    boss.classList.remove("is-on");
    hole.classList.remove("is-on"); shadow.classList.remove("is-on"); shade.classList.remove("is-on");
    await wait(700);
    return true;
  } finally {
    cancelAnimationFrame(raf);
    hole.removeEventListener("pointerdown", tap);
    root.remove();
  }
}
function speakCaught() {
  speakAs("Aïe ! Lâchez-moi, je rends tout !", "excite");
  return wait(300);
}

function laugh(x: number, y: number) {
  speakAs("Hi hi hi hi hi !", "excite");
}

/** A coin or a card lying on the ground, to be taken. Returns its element (move it with `style.transform`). */
export function prop(kind: "coin" | "card", x: number, y: number): HTMLElement {
  const el = document.createElement("div");
  el.className = `thief__prop thief__prop--${kind}`;
  el.innerHTML =
    kind === "coin"
      ? `<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#f6c453" stroke="#c58a14" stroke-width="3"/><circle cx="20" cy="20" r="12" fill="none" stroke="#ffe58a" stroke-width="2"/><path d="M20 12 l6 4.4 -2.3 7 h-7.4 l-2.3 -7Z" fill="#c58a14"/></svg>`
      : `<i></i>`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  return el;
}
