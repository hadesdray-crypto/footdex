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

const THIEF = `<svg viewBox="0 0 70 80" width="70" height="80" aria-hidden="true"><path d="M8 80 Q6 36 35 30 Q64 36 62 80Z" fill="#3b1d7a"/><circle cx="35" cy="26" r="20" fill="#2a1a4d"/><ellipse cx="35" cy="30" rx="13" ry="10" fill="#0d0620"/><circle cx="29" cy="29" r="3.2" fill="#ffe58a"/><circle cx="41" cy="29" r="3.2" fill="#ffe58a"/><path d="M27 37 Q35 43 43 37" stroke="#ffe58a" stroke-width="2" fill="none"/></svg>`;

/** Runs the whole raid. Resolves true if the player caught the thief (double tap on the black hole), false if he got away. */
export async function thiefRaid(r: Raid): Promise<boolean> {
  const root = document.createElement("div");
  root.className = "thief";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `<i class="thief__shade"></i><i class="thief__shadow"></i><i class="thief__hole thief__hole--top"></i><b class="thief__boss">${THIEF}</b><i class="thief__hole"></i><b class="thief__arm"><span class="thief__hand">${HAND_OPEN}</span></b><u class="thief__hint">Touche 2 fois le trou noir pour l'attraper !</u>`;
  const q = (c: string) => root.querySelector<HTMLElement>(c)!;
  const shade = q(".thief__shade"), shadow = q(".thief__shadow"), hole = q(".thief__hole:not(.thief__hole--top)"), top = q(".thief__hole--top"), boss = q(".thief__boss"), arm = q(".thief__arm"), hand = q(".thief__hand"), hint = q(".thief__hint");
  const topY = 74;
  for (const el of [shadow, hole, arm]) { el.style.left = `${r.x}px`; el.style.top = `${r.y}px`; }
  for (const el of [top, boss]) { el.style.left = `${r.x}px`; el.style.top = `${topY}px`; }
  document.body.appendChild(root);
  let caught = false;
  let armH = 0;
  // double tap on the black hole = the hole turns round and swallows the thief himself
  let lastTap = 0;
  const tap = () => {
    const t = performance.now();
    if (t - lastTap < 500) caught = true;
    lastTap = t;
  };
  hole.addEventListener("pointerdown", tap);
  const live = () => !caught;
  const tw = async (ms: number, f: (k: number) => void) => { if (live()) await tween(ms, (k) => { if (live()) f(k); }); };
  try {
    growl(0.7);
    requestAnimationFrame(() => { shade.classList.add("is-on"); shadow.classList.add("is-on"); });
    await wait(1500);
    thud();
    hole.classList.add("is-on");
    top.classList.add("is-on");
    boss.classList.add("is-on"); // he shows up at the top of the screen, his arm goes into the first hole…
    await wait(550);
    hole.style.pointerEvents = "auto"; // …and the second hole opens where the arm comes out
    hint.classList.add("is-on");
    const h = Math.max(50, r.reach);
    await tw(850, (k) => { armH = k * h; arm.style.height = `${armH}px`; });
    if (live()) await wait(150);
    if (live()) { hand.innerHTML = HAND_SHUT; r.grab?.(); await wait(1300); }
    await tw(350, (k) => { armH = h + k * 14; arm.style.height = `${armH}px`; r.lift?.(k * 14); });
    await tw(1050, (k) => { armH = (h + 14) * (1 - k); arm.style.height = `${armH}px`; r.sink?.(k); });
    hint.classList.remove("is-on");
    hole.style.pointerEvents = "none";
    if (!caught) {
      r.gone?.();
      hole.classList.remove("is-on"); top.classList.remove("is-on"); boss.classList.remove("is-on");
      shadow.classList.remove("is-on"); shade.classList.remove("is-on");
      laugh(r.x, r.y);
      await wait(2200);
      return false;
    }
    // caught: the thief is pulled down through his own arm, right to the hole
    hint.classList.remove("is-on");
    thud();
    r.release?.();
    arm.style.height = `${armH}px`;
    const y0 = topY;
    boss.style.zIndex = "3";
    await tween(900, (k) => { boss.style.top = `${y0 + (r.y - y0 - 6) * k}px`; arm.style.height = `${armH * (1 - k)}px`; });
    top.classList.remove("is-on");
    await speakCaught();
    r.caught?.();
    await wait(1600);
    boss.classList.remove("is-on");
    hole.classList.remove("is-on"); shadow.classList.remove("is-on"); shade.classList.remove("is-on");
    await wait(700);
    return true;
  } finally {
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
