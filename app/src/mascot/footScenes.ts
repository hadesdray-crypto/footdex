// What the Jongleur does with his ball when he goes out on the screen. One player, one ball, always together.
import { pick } from "./lines";
import { say as sayIt } from "./state";
// While he plays, his words show at the top of the screen: the bubble must not hide his legs.
const say = (t: string) => sayIt(t, { top: true });
import { ballInfo, behindBall, trapBall, type Footballer } from "./player";

type Pt = { x: number; y: number };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const spot = (): Pt => ({ x: rnd(60, window.innerWidth - 60), y: rnd(170, window.innerHeight - 120) });

/** Runs to the ball wherever it is, and stops it under his sole. */
async function getBall(f: Footballer) {
  for (let i = 0; i < 6 && !f.dead; i += 1) {
    const b = ballInfo();
    if (!b) return;
    await f.run(() => {
      const c = ballInfo() ?? b;
      return { x: c.x, y: c.y };
    }, { speed: 330, stop: 14, timeout: 5000 });
    if (f.dead) return;
    const now = ballInfo();
    if (now?.held) {
      await f.wait(400);
      continue;
    }
    if (trapBall()) return;
    await f.wait(120);
  }
}

/** Runs with the ball at his feet to `to`. If the ball is not at his feet (or someone takes it), he gets it back first. */
async function dribbleTo(f: Footballer, to: Pt, speed = 210) {
  const until = performance.now() + 16000;
  while (!f.dead && performance.now() < until) {
    const b = ballInfo();
    if (!b) return;
    if (b.held || b.z > 6 || Math.hypot(b.x - f.x, b.y - f.y) > 28) {
      await getBall(f);
      continue;
    }
    const ok = await f.run(to, { speed, dribble: true, stop: 6, timeout: 9000 });
    if (f.dead) return;
    if (ok) break;
  }
  trapBall();
}

async function shoot(f: Footballer) {
  const b = ballInfo();
  if (!b) return;
  const dir: 1 | -1 = b.x < window.innerWidth / 2 ? 1 : -1;
  const spotB = behindBall(dir);
  if (spotB) await f.run(() => behindBall(dir) ?? spotB, { speed: 160, stop: 4, timeout: 3000 });
  if (f.dead) return;
  await f.kick(dir, 0.6 + Math.random() * 0.4);
  if (Math.random() < 0.5) say(pick(["Et c'est le BUT !", "Frappe de mule !", "Lucarne !", "Tir… et c'est parti !"]));
  await f.wait(500);
  if (Math.random() < 0.5) await f.cheer(1400);
  await getBall(f);
}

async function juggling(f: Footballer) {
  say(pick(["Regarde : des jongles !", "Hop hop hop, je ne le laisse pas tomber !", "Je vais battre mon record !"]));
  await getBall(f);
  if (f.dead) return;
  await f.juggle(6 + Math.floor(Math.random() * 6));
  if (f.dead) return;
  await getBall(f);
  if (Math.random() < 0.6) await f.cheer(1200);
}

/** One outing: dribbles, shots, juggling, a sprint, push-ups… then home, with the ball at his feet. */
export type Outing = "play" | "stolen" | "thrown" | "moved" | "pass";

export async function footballOuting(f: Footballer, home: Pt, why: Outing = "play", fling?: { vx: number; vz: number; vy: number }, broken = false, onHit?: () => Promise<"out" | void> | void, to?: Pt): Promise<"banc" | void> {
  try {
    if (why === "thrown" && fling) {
      // Thrown away from his ball: he flies, falls, gets up, and goes back for his ball.
      say(pick(["Aaaaaah !", "Wouaaah ! Pose-moi !", "Au secouuuurs !"]));
      // the shock: he reacts at once, and if he is hurt, he waits for the Doctor before going back to his ball
      const hit: { care: Promise<"out" | void> | null } = { care: null };
      await f.fling(fling.vx, fling.vz, fling.vy, () => {
        const c = onHit?.();
        if (c) hit.care = c;
        return false;
      });
      const care = hit.care;
      if (f.dead) return;
      if (care) {
        const r = await care;
        if (f.dead) return;
        if (r === "out") broken = true;
      }
      if (broken) {
        // a broken leg: no more football today, he hobbles off the pitch
        say(pick(["Aïe ! Ma jambe ! Je sors…", "Ouille… je crois que c'est cassé !"]));
        await f.run({ x: f.x < window.innerWidth / 2 ? -80 : window.innerWidth + 80, y: f.y }, { speed: 70, limp: true, timeout: 20000 });
        return "banc";
      }
      if (!care) say(pick(["Aïe… Bon. Mon ballon !", "Ouille. Où est mon ballon ?", "Pas drôle ! Je retourne à mon ballon."]));
      await getBall(f);
    } else if (why === "moved") {
      // Moved to another place: his ball stayed behind. He goes for it and brings it to his new spot.
      say(pick(["Attends, je vais chercher mon ballon !", "Mon ballon est resté là-bas !", "Je reviens avec mon ballon !"]));
      await getBall(f);
    } else if (why === "pass" && to) {
      // a pass to a friend… who does not always catch it
      await getBall(f);
      await dribbleTo(f, { x: Math.max(60, Math.min(window.innerWidth - 60, to.x + (to.x > f.x ? -170 : 170))), y: to.y }, 220);
      say(pick(["Attrape !", "Tiens, à toi !", "Passe !"]));
      await f.kick(to.x > f.x ? 1 : -1, 0.35);
      await f.wait(1800);
      await getBall(f);
    } else if (why === "stolen") {
      say(pick(["Hé ! Mon ballon !", "Rends-moi mon ballon !", "Ah non, pas mon ballon !"]));
      await getBall(f);
    } else {
      const r = Math.random();
      if (r < 0.4) {
        await dribbleTo(f, spot());
        await dribbleTo(f, spot());
        await shoot(f);
      } else if (r < 0.75) {
        await dribbleTo(f, { x: Math.min(window.innerWidth - 80, Math.max(80, home.x + rnd(-120, 120))), y: Math.max(180, home.y - rnd(40, 140)) });
        await juggling(f);
      } else {
        await dribbleTo(f, spot(), 280);
        await dribbleTo(f, spot(), 280);
        say(pick(["Pfff… je suis crevé !", "Une petite pause… je n'en peux plus !"]));
        await f.tired(2600);
        if (Math.random() < 0.5) {
          say(pick(["Allez, des pompes !", "Dix pompes pour être en forme !"]));
          await f.pushups(4200);
        }
      }
    }
    if (!f.dead) await dribbleTo(f, home, 200);
    if (!f.dead) trapBall();
  } catch {
    /* he goes home */
  }
}
