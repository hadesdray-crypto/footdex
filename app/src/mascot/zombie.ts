// The Zombie falls to pieces when he is thrown too hard: his head and arms come off and bounce on the ground.
// A finger picks each piece up and puts it back on the golden dotted outline: « clic ». If nobody helps him,
// the Doctor comes: he sews the pieces back on (and gets bitten… in his metal collar), or, if the Zombie is in
// pieces everywhere, he puts everything in his sack and drags it off the screen.
import { figSvg, type Look } from "./look";
import { pick } from "./lines";
import { say } from "./state";
import { ballBounce, ballTrap } from "../sound";
import { doctorRepair, doctorSack, faute } from "./terrain";

type PartId = "head" | "armA" | "armB";
type Piece = { id: PartId; el: HTMLElement; hit: HTMLElement; slot: { x: number; y: number }; ox: number; oy: number; vx: number; vy: number; floor: number; held: boolean; on: boolean };

const SIZE = 74; // the same size as the character in his corner
const G = 1700;

/** Where each part sits on the drawing (px, from the top-left of a SIZE-wide figure). */
function slots(h: number) {
  const k = SIZE / 196;
  return {
    head: { x: (90 + 8) * k, y: 72 * k, r: 23, rest: h - 72 * k - 12 },
    armA: { x: (52 + 8) * k, y: 146 * k, r: 13, rest: h - 146 * k - 7 },
    armB: { x: (128 + 8) * k, y: 146 * k, r: 13, rest: h - 146 * k - 7 },
  };
}

export function fallApart(look: Look, at: { x: number; y: number }, count: number, done: (at: { x: number; y: number }) => void) {
  const svg = figSvg(look, { size: SIZE, crop: "full", mouth: "open", label: "Le Zombie en morceaux" });
  const trunk = document.createElement("div");
  trunk.className = "ztrunk mfw";
  trunk.innerHTML = svg;
  document.body.appendChild(trunk);
  const h = (trunk.querySelector("svg")?.getAttribute("height") ? Number(trunk.querySelector("svg")!.getAttribute("height")) : SIZE * 1.09) || SIZE * 1.09;
  const left = at.x - SIZE / 2;
  const topY = at.y - h;
  trunk.style.transform = `translate(${left}px,${topY}px)`;
  const S = slots(h);
  const order: PartId[] = count >= 3 ? ["head", "armA", "armB"] : count === 2 ? ["head", Math.random() < 0.5 ? "armA" : "armB"] : [Math.random() < 0.6 ? "head" : "armA"];
  const dir = Math.random() < 0.5 ? -1 : 1;
  const pieces: Piece[] = order.map((id, i) => {
    trunk.classList.add(`no-${id}`);
    const el = document.createElement("div");
    el.className = `zpiece mfw zpiece--${id}`;
    el.innerHTML = svg;
    const hit = document.createElement("div");
    hit.className = "zpiece__hit";
    hit.setAttribute("role", "button");
    hit.setAttribute("aria-label", id === "head" ? "La tête du zombie : remets-la en place" : "Un bras du zombie : remets-le en place");
    const sl = S[id];
    hit.style.left = `${sl.x - 28}px`;
    hit.style.top = `${sl.y - 28}px`;
    el.appendChild(hit);
    document.body.appendChild(el);
    // the dotted outline where it goes back
    const ring = document.createElement("i");
    ring.className = `ztrunk__slot ztrunk__slot--${id}`;
    ring.style.left = `${sl.x - sl.r}px`;
    ring.style.top = `${sl.y - sl.r}px`;
    ring.style.width = ring.style.height = `${sl.r * 2}px`;
    trunk.appendChild(ring);
    return { id, el, hit, slot: { x: left + sl.x, y: topY + sl.y }, ox: 0, oy: 0, vx: dir * (160 + 220 * Math.random()) * (i % 2 ? -1 : 1), vy: -(380 + 260 * Math.random()), floor: sl.rest, held: false, on: false };
  });
  if (order.includes("head")) faute("zombie");
  say(order.includes("head") ? pick(["Ma tête !? Où est ma tête ?", "Grrr… je ne vois plus rien !", "Ma tête est partie toute seule !"]) : pick(["Mon bras ! Rends-moi mon bras !", "Grrr… il me manque un bras !"]));

  let raf = 0;
  let last = performance.now();
  let finished = false;
  const draw = (p: Piece) => {
    p.el.style.transform = `translate(${left + p.ox}px,${topY + p.oy}px)`;
  };
  const frame = (now: number) => {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    for (const p of pieces) {
      if (p.on || p.held) continue;
      p.vy += G * dt;
      p.ox += p.vx * dt;
      p.oy += p.vy * dt;
      if (p.oy >= p.floor) {
        p.oy = p.floor;
        if (p.vy > 160) {
          ballBounce(Math.min(1, p.vy / 900));
          p.vy = -p.vy * 0.35;
          p.vx *= 0.7;
        } else {
          p.vy = 0;
          p.vx *= Math.exp(-6 * dt);
        }
      }
      const minX = -left + 8 - S[p.id].x + 14;
      const maxX = window.innerWidth - left - 8 - S[p.id].x - 14;
      if (p.ox < minX) {
        p.ox = minX;
        p.vx = Math.abs(p.vx) * 0.5;
      } else if (p.ox > maxX) {
        p.ox = maxX;
        p.vx = -Math.abs(p.vx) * 0.5;
      }
      draw(p);
    }
    trunk.classList.toggle("is-wobble", pieces.some((p) => !p.on));
    if (!finished) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const attach = (p: Piece) => {
    if (p.on) return;
    p.on = true;
    p.held = false;
    p.el.classList.add("is-snap");
    p.ox = 0;
    p.oy = 0;
    draw(p);
    ballTrap(0.7);
    window.setTimeout(() => {
      p.el.remove();
      trunk.classList.remove(`no-${p.id}`);
      trunk.querySelector(`.ztrunk__slot--${p.id}`)?.remove();
      if (pieces.every((q) => q.on)) finish(true);
    }, 160);
  };

  for (const p of pieces) {
    let dx = 0;
    let dy = 0;
    p.hit.addEventListener("pointerdown", (e) => {
      if (p.on || finished) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        p.hit.setPointerCapture(e.pointerId);
      } catch {
        /* fine */
      }
      p.held = true;
      p.vx = p.vy = 0;
      dx = e.clientX - (left + S[p.id].x + p.ox);
      dy = e.clientY - (topY + S[p.id].y + p.oy);
      p.el.classList.add("is-held");
    });
    p.hit.addEventListener("pointermove", (e) => {
      if (!p.held) return;
      p.ox = e.clientX - dx - left - S[p.id].x;
      p.oy = Math.min(p.floor, e.clientY - dy - topY - S[p.id].y);
      draw(p);
    });
    const up = () => {
      if (!p.held) return;
      p.held = false;
      p.el.classList.remove("is-held");
      if (Math.hypot(p.ox, p.oy) < 34) attach(p);
    };
    p.hit.addEventListener("pointerup", up);
    p.hit.addEventListener("pointercancel", up);
  }

  // Nobody helps him? The Doctor comes after a while.
  const help = window.setTimeout(() => {
    if (finished) return;
    const loose = pieces.filter((p) => !p.on);
    const where = (p: Piece) => ({ x: left + S[p.id].x + p.ox, y: at.y });
    if (loose.length >= 3) {
      finished = true;
      cancelAnimationFrame(raf);
      void doctorSack(
        [
          ...loose.map((p) => ({ ...where(p), take: () => p.el.remove() })),
          { x: at.x, y: at.y, take: () => trunk.remove() },
        ],
        at,
      ).then(() => {
        window.setTimeout(() => finish(false), 3500);
      });
    } else {
      void doctorRepair(
        loose.map((p) => ({ ...where(p), take: () => attach(p) })),
        at,
      );
    }
  }, 25000);

  function finish(byHand: boolean) {
    if (finished && byHand) return;
    finished = true;
    window.clearTimeout(help);
    cancelAnimationFrame(raf);
    pieces.forEach((p) => p.el.remove());
    trunk.remove();
    done(at);
    say(byHand ? pick(["Grrr… merci ! Comme neuf !", "Clic ! Tout est à sa place. Grrr… merci.", "Ah… je revois tout ! Merci !"]) : pick(["Grrr… recousu ! Me revoilà !", "Me revoilà… avec des points en plus.", "Le docteur m'a recousu… et il a un goût de métal."]));
  }
}
