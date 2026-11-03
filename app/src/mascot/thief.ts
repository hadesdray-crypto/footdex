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

/** Runs the whole raid. Resolves when the hole has closed. */
export async function thiefRaid(r: Raid) {
  const root = document.createElement("div");
  root.className = "thief";
  root.setAttribute("aria-hidden", "true");
  root.style.setProperty("--tx", `${r.x}px`);
  root.style.setProperty("--ty", `${r.y}px`);
  root.innerHTML = `<i class="thief__shade"></i><i class="thief__shadow"></i><i class="thief__hole"></i><b class="thief__arm"><span class="thief__hand">${HAND_OPEN}</span></b>`;
  const shade = root.querySelector<HTMLElement>(".thief__shade")!;
  const shadow = root.querySelector<HTMLElement>(".thief__shadow")!;
  const hole = root.querySelector<HTMLElement>(".thief__hole")!;
  const arm = root.querySelector<HTMLElement>(".thief__arm")!;
  const hand = root.querySelector<HTMLElement>(".thief__hand")!;
  for (const el of [shadow, hole, arm]) {
    el.style.left = `${r.x}px`;
    el.style.top = `${r.y}px`;
  }
  document.body.appendChild(root);
  try {
    // 1. the shadow spreads on the ground, the light goes down around it
    growl(0.7);
    requestAnimationFrame(() => {
      shade.classList.add("is-on");
      shadow.classList.add("is-on");
    });
    await wait(1500);
    // 2. the hole opens
    thud();
    hole.classList.add("is-on");
    await wait(550);
    // 3. the arm comes up, longer and longer
    const h = Math.max(50, r.reach);
    await tween(850, (k) => {
      arm.style.height = `${k * h}px`;
    });
    // 4. the hand opens… and closes
    await wait(150);
    hand.innerHTML = HAND_SHUT;
    r.grab?.();
    await wait(350);
    // 5. he lifts it, then pulls it down into the hole
    await tween(350, (k) => {
      const up = k * 14;
      arm.style.height = `${h + up}px`;
      r.lift?.(up);
    });
    await tween(1050, (k) => {
      arm.style.height = `${(h + 14) * (1 - k)}px`;
      r.sink?.(k);
    });
    r.gone?.();
    // 6. the hole closes, and a laugh is heard
    hole.classList.remove("is-on");
    shadow.classList.remove("is-on");
    shade.classList.remove("is-on");
    laugh(r.x, r.y);
    await wait(2200);
  } finally {
    root.remove();
  }
}

function laugh(x: number, y: number) {
  const b = document.createElement("div");
  b.className = "thief__laugh";
  b.textContent = "Hi hi hi hi hi !";
  b.style.left = `${Math.max(70, Math.min(window.innerWidth - 70, x))}px`;
  b.style.top = `${Math.max(70, y - 90)}px`;
  document.body.appendChild(b);
  speakAs("Hi hi hi hi hi !", "excite");
  window.setTimeout(() => b.remove(), 2800);
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
