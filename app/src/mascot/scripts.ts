// What each character does when he walks about on his own.
import { juggle, kickTowards, type Actor, type Pt } from "./actor";
import { ballPos, hasBall } from "./ball";
import type { Mode } from "./lines";
import { pick } from "./lines";
import { say } from "./state";

export type Ctx = { home: Pt; target: () => HTMLElement | null };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const spot = (): Pt => ({ x: rnd(50, window.innerWidth - 50), y: rnd(150, window.innerHeight - 110) });
const near = (r: DOMRect, a: Actor): Pt => ({ x: r.left + r.width / 2 + (a.x < r.left + r.width / 2 ? -34 : 34), y: Math.min(window.innerHeight - 80, r.bottom + 14) });

async function sprint(a: Actor, legs: number) {
  for (let i = 0; i < legs && !a.dead; i += 1) {
    const ok = await a.walkTo(spot(), "run", 8, 7000);
    if (!ok || a.dead) return;
    if (Math.random() < 0.5 || i === legs - 1) {
      a.pose("tired");
      if (Math.random() < 0.6) say(pick(["Pfff… je suis crevé !", "Une petite pause… je n'en peux plus !", "Ouf… je n'ai plus de souffle !"]));
      await a.wait(2800);
    }
  }
}

async function pushups(a: Actor) {
  a.face(Math.random() < 0.5 ? 1 : -1, 0);
  a.pose("push");
  say(pick(["Allez, des pompes ! Un, deux, trois…", "Pour être en forme, dix pompes !", "Hop, hop, hop ! Les pompes !"]));
  await a.wait(5200);
}

async function football(a: Actor) {
  if (!hasBall()) return sprint(a, 2);
  const kicks = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < kicks && !a.dead; i += 1) {
    const b = ballPos();
    const dir = b ? (b.x < window.innerWidth * 0.5 ? 1 : -1) : 1;
    await kickTowards(a, dir, 0.8 + Math.random() * 0.6);
    if (a.dead) return;
    await a.wait(i === kicks - 1 ? 300 : 1100);
    // He runs after the ball, wherever it went.
    await a.walkTo(() => {
      const p = ballPos();
      return p ? { x: p.x, y: p.y + 20 } : a;
    }, "run", 46, 3200);
  }
  if (a.dead) return;
  if (Math.random() < 0.7) {
    say(pick(["Regarde ça : des jongles !", "Hop hop hop, je ne le laisse pas tomber !"]));
    await juggle(a, 5 + Math.floor(Math.random() * 3));
  }
  if (!a.dead) {
    a.pose("tired");
    say(pick(["Ouf, ça fatigue, le foot !", "Pfff… quel match !"]));
    await a.wait(2400);
  }
}

export async function runScript(mode: Mode, a: Actor, c: Ctx) {
  if (mode === "joueur") {
    const r = Math.random();
    if (r < 0.5) await football(a);
    else if (r < 0.85) {
      await sprint(a, 2 + Math.floor(Math.random() * 2));
      if (!a.dead && Math.random() < 0.5) await pushups(a);
    } else await pushups(a);
  } else if (mode === "excite") {
    // The fan sprints to something and worships it.
    const el = c.target();
    if (el) {
      const ok = await a.walkTo(near(el.getBoundingClientRect(), a), "run", 8, 7000);
      if (ok && !a.dead) {
        a.pose("kneel");
        say(pick(["Oh ! Magnifique ! Je suis à genoux !", "Je l'adore ! Je l'adore !", "Quel chef-d'œuvre !"]));
        el.animate([{ transform: "scale(1)" }, { transform: "scale(1.1)" }, { transform: "scale(1)" }], { duration: 700, iterations: 4 });
        await a.wait(4200);
      }
    } else await sprint(a, 2);
    if (!a.dead) {
      a.pose("cheer");
      await a.wait(1800);
    }
  } else if (mode === "poli") {
    await a.walkTo(spot(), "walk", 8, 14000);
    if (!a.dead) {
      a.face(1, 0);
      a.pose("bow");
      say(pick(["Bonjour, très cher ami.", "Mes respects, cher visiteur.", "Je vous souhaite une excellente journée."]));
      await a.wait(3400);
    }
  } else if (mode === "pointu") {
    const el = c.target();
    if (el) {
      const ok = await a.walkTo(near(el.getBoundingClientRect(), a), "walk", 8, 14000);
      if (ok && !a.dead) {
        a.face(el.getBoundingClientRect().left > a.x ? 1 : -1, 0);
        a.pose("bow");
        say(pick(["Hmm. Intéressant. Très intéressant.", "Je vérifie un détail technique.", "Selon mes calculs, ce bouton est parfait."]));
        await a.wait(3600);
      }
    } else await a.walkTo(spot(), "walk", 8, 12000);
  } else {
    // The statue: a few slow steps, then he freezes again.
    await a.walkTo({ x: Math.max(50, Math.min(window.innerWidth - 50, a.x + rnd(-130, 130))), y: Math.max(150, Math.min(window.innerHeight - 110, a.y + rnd(-60, 60))) }, "walk", 6, 14000);
    if (!a.dead) {
      a.pose("idle");
      await a.wait(2600);
    }
  }
  if (!a.dead) await a.walkTo(c.home, mode === "excite" || mode === "joueur" ? "run" : "walk", 6, 15000);
}
