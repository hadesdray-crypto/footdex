// The Zombie falls to pieces when he is thrown too hard: at the very moment he hits the ground, his head and arms
// come off and bounce away. A finger picks each piece up and puts it back on the golden dotted outline: « clic ».
// The body can be moved with the finger too, even without its head. Now and then, if nobody helps him, the body
// shuffles off by itself to look for its pieces (without his head, he starts the wrong way…). After a while the
// Doctor comes: he sews the pieces back on (and gets bitten… in his metal collar), or, if the Zombie is in pieces
// everywhere, he puts everything in his sack and drags it off the screen.
import { figSvg, type Look } from "./look";
import { pick } from "./lines";
import { say } from "./state";
import { ballBounce, ballTrap } from "../sound";
import { doctorRepair, doctorSack, faute } from "./terrain";

type PartId = "head" | "armA" | "armB";
type Piece = {
  id: PartId;
  el: HTMLElement;
  hit: HTMLElement;
  x: number; // where the piece is (its centre, on the screen)
  y: number;
  vx: number;
  vy: number;
  ground: number; // the y of its centre when it lies on the ground
  held: boolean;
  on: boolean;
};

const SIZE = 74; // the same size as the character in his corner
const G = 1700;

/** Where each part sits on the drawing (px, from the top-left of a SIZE-wide figure), and how far its centre is above the ground when it lies there. */
function slots() {
  const k = SIZE / 196;
  return {
    head: { x: (90 + 8) * k, y: 72 * k, r: 23, off: 12 },
    armA: { x: (52 + 8) * k, y: 146 * k, r: 13, off: 7 },
    armB: { x: (128 + 8) * k, y: 146 * k, r: 13, off: 7 },
  };
}

export function fallApart(look: Look, at: { x: number; y: number }, count: number, done: (at: { x: number; y: number }) => void, impact: { vx: number } = { vx: 0 }) {
  const svg = figSvg(look, { size: SIZE, crop: "full", mouth: "open", label: "Le Zombie en morceaux" });
  const trunk = document.createElement("div");
  trunk.className = "ztrunk mfw";
  trunk.innerHTML = svg;
  document.body.appendChild(trunk);
  const h = Number(trunk.querySelector("svg")?.getAttribute("height")) || SIZE * 1.09;
  // the body: top-left corner of the drawing
  let tx = at.x - SIZE / 2;
  let ty = at.y - h;
  const S = slots();
  const slotAt = (id: PartId) => ({ x: tx + S[id].x, y: ty + S[id].y });
  const drawTrunk = () => {
    trunk.style.transform = `translate(${tx}px,${ty}px)`;
  };
  drawTrunk();

  // a handle on the body, to move it with the finger
  const grip = document.createElement("div");
  grip.className = "ztrunk__grip";
  grip.setAttribute("role", "button");
  grip.setAttribute("aria-label", "Le corps du zombie : tu peux le déplacer");
  trunk.appendChild(grip);

  const order: PartId[] = count >= 3 ? ["head", "armA", "armB"] : count === 2 ? ["head", Math.random() < 0.5 ? "armA" : "armB"] : [Math.random() < 0.6 ? "head" : "armA"];
  const pieces: Piece[] = order.map((id, i) => {
    trunk.classList.add(`no-${id}`);
    const el = document.createElement("div");
    el.className = `zpiece mfw zpiece--${id}`;
    el.innerHTML = svg;
    const hit = document.createElement("div");
    hit.className = "zpiece__hit";
    hit.setAttribute("role", "button");
    hit.setAttribute("aria-label", id === "head" ? "La tête du zombie : remets-la en place" : "Un bras du zombie : remets-le en place");
    hit.style.left = `${S[id].x - 28}px`;
    hit.style.top = `${S[id].y - 28}px`;
    el.appendChild(hit);
    document.body.appendChild(el);
    // the dotted outline where it goes back
    const ring = document.createElement("i");
    ring.className = `ztrunk__slot ztrunk__slot--${id}`;
    ring.style.left = `${S[id].x - S[id].r}px`;
    ring.style.top = `${S[id].y - S[id].r}px`;
    ring.style.width = ring.style.height = `${S[id].r * 2}px`;
    trunk.appendChild(ring);
    const start = slotAt(id);
    // they fly off at the moment of the shock, carried on by the throw
    const side = i % 2 ? -1 : 1;
    const vx = impact.vx * 0.55 + side * (140 + 200 * Math.random()) * (Math.random() < 0.5 ? -1 : 1);
    return { id, el, hit, x: start.x, y: start.y, vx, vy: -(420 + 260 * Math.random()), ground: at.y - S[id].off, held: false, on: false };
  });
  if (order.includes("head")) faute("zombie");
  say(order.includes("head") ? pick(["Ma tête !? Où est ma tête ?", "Grrr… je ne vois plus rien !", "Ma tête est partie toute seule !"]) : pick(["Mon bras ! Rends-moi mon bras !", "Grrr… il me manque un bras !"]));

  let raf = 0;
  let last = performance.now();
  let finished = false;
  let walk: { to: () => number; t: number; wrong: number } | null = null;
  let draggingBody = false;
  const draw = (p: Piece) => {
    p.el.style.transform = `translate(${p.x - S[p.id].x}px,${p.y - S[p.id].y}px)`;
  };
  pieces.forEach(draw);

  const frame = (now: number) => {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    for (const p of pieces) {
      if (p.on || p.held) continue;
      p.vy += G * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y >= p.ground) {
        p.y = p.ground;
        if (p.vy > 160) {
          ballBounce(Math.min(1, p.vy / 900));
          p.vy = -p.vy * 0.35;
          p.vx *= 0.7;
        } else {
          p.vy = 0;
          p.vx *= Math.exp(-6 * dt);
        }
      }
      if (p.x < 16) {
        p.x = 16;
        p.vx = Math.abs(p.vx) * 0.5;
      } else if (p.x > window.innerWidth - 16) {
        p.x = window.innerWidth - 16;
        p.vx = -Math.abs(p.vx) * 0.5;
      }
      draw(p);
    }
    // the body shuffling by itself towards a piece
    if (walk && !draggingBody) {
      walk.t += dt;
      const cx = tx + SIZE / 2;
      let goal = walk.to();
      if (walk.t < walk.wrong) goal = cx + (goal > cx ? -60 : 60); // no head: first the wrong way
      const dx = goal - cx;
      if (Math.abs(dx) > 2) tx += Math.sign(dx) * Math.min(Math.abs(dx), 48 * dt);
      tx = Math.max(-10, Math.min(window.innerWidth - SIZE + 10, tx));
      drawTrunk();
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
    const s = slotAt(p.id);
    p.x = s.x;
    p.y = s.y;
    draw(p);
    ballTrap(0.7);
    window.setTimeout(() => {
      p.el.remove();
      trunk.classList.remove(`no-${p.id}`);
      trunk.querySelector(`.ztrunk__slot--${p.id}`)?.remove();
      if (pieces.every((q) => q.on)) finish(true);
    }, 160);
  };

  // the pieces: picked up and put back with the finger
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
      dx = e.clientX - p.x;
      dy = e.clientY - p.y;
      p.el.classList.add("is-held");
    });
    p.hit.addEventListener("pointermove", (e) => {
      if (!p.held) return;
      p.x = Math.max(10, Math.min(window.innerWidth - 10, e.clientX - dx));
      p.y = Math.max(20, Math.min(window.innerHeight - 10, e.clientY - dy));
      draw(p);
    });
    const up = () => {
      if (!p.held) return;
      p.held = false;
      p.el.classList.remove("is-held");
      const s = slotAt(p.id);
      if (Math.hypot(p.x - s.x, p.y - s.y) < 34) attach(p);
      // otherwise it stays about where it was dropped (it falls a little)
      else p.ground = Math.min(window.innerHeight - 12, Math.max(p.y + 6, 60));
    };
    p.hit.addEventListener("pointerup", up);
    p.hit.addEventListener("pointercancel", up);
  }

  // the body: moved with the finger (its pieces stay where they are)
  {
    let ox = 0;
    let oy = 0;
    grip.addEventListener("pointerdown", (e) => {
      if (finished) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        grip.setPointerCapture(e.pointerId);
      } catch {
        /* fine */
      }
      draggingBody = true;
      ox = e.clientX - tx;
      oy = e.clientY - ty;
      trunk.classList.add("is-held");
    });
    grip.addEventListener("pointermove", (e) => {
      if (!draggingBody) return;
      tx = Math.max(-10, Math.min(window.innerWidth - SIZE + 10, e.clientX - ox));
      ty = Math.max(40, Math.min(window.innerHeight - h - 60, e.clientY - oy));
      drawTrunk();
      // a piece right on its outline clicks back in place
      for (const p of pieces) {
        if (p.on || p.held) continue;
        const s = slotAt(p.id);
        if (Math.hypot(p.x - s.x, p.y - s.y) < 26) attach(p);
      }
    });
    const up = () => {
      if (!draggingBody) return;
      draggingBody = false;
      trunk.classList.remove("is-held");
    };
    grip.addEventListener("pointerup", up);
    grip.addEventListener("pointercancel", up);
  }

  const feet = () => ({ x: tx + SIZE / 2, y: ty + h });

  // Sometimes, if nobody helps him, the body goes and looks for its pieces by itself.
  const search = window.setTimeout(() => {
    if (finished || Math.random() > 0.4) return;
    void (async () => {
      const noHead = pieces.some((p) => p.id === "head" && !p.on);
      say(noHead ? pick(["Grrr… où… où est ma tête ?", "Je ne vois rien… je cherche…"]) : pick(["Grrr… mon bras… j'arrive…", "Bouge pas, mon bras !"]));
      for (const p of pieces) {
        if (finished) return;
        if (p.on) continue;
        walk = { to: () => p.x, t: 0, wrong: noHead && p.id === "head" ? 1.6 : 0 };
        const t0 = performance.now();
        // he shuffles until he is over the piece (or gives up after a while)
        while (!finished && !p.on && performance.now() - t0 < 9000) {
          await new Promise((r) => window.setTimeout(r, 120));
          if (!p.held && !draggingBody && Math.abs(feet().x - p.x) < 18) {
            // he bends down… and clic, it is back
            p.vx = p.vy = 0;
            attach(p);
          }
        }
        walk = null;
      }
    })();
  }, 6000 + Math.random() * 4000);

  // Nobody helps him? The Doctor comes after a while.
  const help = window.setTimeout(() => {
    if (finished) return;
    walk = null;
    const loose = pieces.filter((p) => !p.on);
    if (!loose.length) return;
    const f = feet();
    if (loose.length >= 3) {
      finished = true;
      cancelAnimationFrame(raf);
      void doctorSack([...loose.map((p) => ({ x: p.x, y: f.y, take: () => p.el.remove() })), { x: f.x, y: f.y, take: () => trunk.remove() }], f).then(() => {
        window.setTimeout(() => finish(false), 3500);
      });
    } else {
      void doctorRepair(
        loose.map((p) => ({ x: p.x, y: f.y, take: () => attach(p) })),
        f,
      );
    }
  }, 25000);

  function finish(byHand: boolean) {
    if (finished && byHand) return;
    finished = true;
    walk = null;
    window.clearTimeout(help);
    window.clearTimeout(search);
    cancelAnimationFrame(raf);
    const f = feet();
    pieces.forEach((p) => p.el.remove());
    trunk.remove();
    done(f);
    say(byHand ? pick(["Grrr… merci ! Comme neuf !", "Clic ! Tout est à sa place. Grrr… merci.", "Ah… je revois tout ! Merci !"]) : pick(["Grrr… recousu ! Me revoilà !", "Me revoilà… avec des points en plus.", "Le docteur m'a recousu… et il a un goût de métal."]));
  }
}
