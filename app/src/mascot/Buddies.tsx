// « Des copains à l'écran » : friends next to the character (the other characters, or the Doctor).
// They are solid bodies moved by a small physics engine, every frame: they walk, run, bump into each other,
// fall when somebody is thrown at them, can be thrown with a flick of the finger, pass in front of or behind
// each other (the lower one is in front), and may run off one side of the screen and come back on the other.
// The Zombie walks after them; they keep away from him like a cat-and-mouse game: gently when he is far,
// screaming and running when he is close. And little scenes now and then: the Zombie sneezes his head off,
// hide-and-seek, the Doctor's check-up, the Papi falls asleep, the stadium cat, the Mexican wave…
import { useEffect, useRef, useState } from "react";
import { Fig } from "./Fig";
import { CARAC } from "./caractere";
import { LORE_HINTS, OLD_STORIES, PERSOS, pick, type Mode } from "./lines";
import { doctorHeadBack, refereeStops, refereeMovesOver } from "./terrain";
import { DOCTOR_LOOK, getMascot, play, say, sayFx, speakAs, takeTurn, turnsBusy, update, useMascot, zopt, type Buddy } from "./state";
import { fallApart } from "./zombie";
import { ballPlaymates, kickBallTo, looseBall, returnBall } from "./player";
import { figSvg, type Look } from "./look";
import { hasFx, playFx, type Slot } from "./bruits";
import { cough, hiss, meow, sneeze, thud } from "../sound";
import { prop, thiefRaid } from "./thief";
import { cx } from "../util";
import { depthZ } from "./depth";

export const BUDDY_NAME = (b: Buddy) => (b === "medecin" ? "Le Médecin" : PERSOS.find((p) => p.mode === b)?.name ?? b);

/** What each friend says when you touch him, or by himself. */
const TALK: Record<Buddy, string[]> = {
  statue: ["Hm. De mon temps, les ballons étaient en cuir. Et lourds !", "Hm… Tu sais qui a gagné la Coupe du monde en 1958 ? Pelé. À 17 ans.", "Ma canne et moi, on a vu Platini jouer. Hm."],
  excite: ["Oh là là, on est plusieurs à l'écran ! C'est la fête !", "Tu veux que je te raconte un truc ? Dis oui !", "ALLEZ ! ALLEZ ! On va gagner !"],
  poli: ["Bonjour ! Je reste à côté, si tu as besoin.", "Si je peux me permettre : les doublons s'échangent contre des pièces.", "Belle journée pour le football, n'est-ce pas ?"],
  joueur: ["Tu me fais une passe ?", "Regarde mes jongles… enfin, imagine-les !", "Un petit match après ?"],
  pointu: ["D'après les chiffres, nous sommes plusieurs. C'est mieux qu'un.", "Statistiquement, je parle moins que le supporter.", "Précisément : il y a 22 joueurs sur un terrain."],
  zombie: ["Grrr… du foot…", "Mmmh… cerveaux… euh, ballons !", "Grrr… je suis gentil. Presque."],
  medecin: ["Tout le monde va bien ? Personne n'est blessé ?", "Un pansement ? J'en ai plein ma sacoche.", "Je surveille, je surveille. Le docteur est là !"],
};
const REACT: Record<"thrown" | "doctor" | "card", Partial<Record<Buddy, string[]>> & { all: string[] }> = {
  thrown: {
    all: ["Oh non ! Ça va ?", "Aïe ! Ça a dû faire mal !", "Hé ! On ne lance pas les copains !"],
    statue: ["Hm. De mon temps, on ne lançait pas les gens."],
    zombie: ["Grrr… moi aussi je veux voler !"],
    medecin: ["J'arrive ! Ne bouge pas !", "Oh là là… Je prépare un bandage."],
    pointu: ["Selon mes calculs, ça a fait très mal."],
  },
  doctor: { all: ["Le docteur arrive !", "Courage !"], zombie: ["Grrr… le docteur… il a un goût de métal."] },
  card: { all: ["Oh oh… un carton !", "Il est sévère, l'arbitre !"], excite: ["CARTON ! Mais non, arbitre !"], statue: ["Hm. De mon temps, il n'y avait pas de cartons. Ils sont arrivés en 1970."] },
};
/** Little chats: the friend says something, the character answers. */
const CHATS: { a: string; b: string; who?: Buddy; to?: Mode }[] = [
  { a: "Tu crois qu'on va gagner aujourd'hui ?", b: "Bien sûr ! Avec Raphaël, on gagne toujours." },
  { a: "Papi, raconte-nous Pelé !", b: "Hm. En 1958, il avait 17 ans… Et il a tout gagné.", to: "statue" },
  { a: "Hm. Tu sais d'où on vient, toi ?", b: "Oui, Papi. Du Concepteur. Tu nous l'as déjà dit cent fois !", who: "statue" },
  { a: "Grrr… tu me prêtes ton ballon ?", b: "Pas question ! La dernière fois, tu l'as mangé.", who: "zombie" },
  { a: "N'oublie pas de t'hydrater, c'est important.", b: "Oui docteur !", who: "medecin" },
  { a: "Tu as vu toutes ces cartes dans le classeur ?", b: "Oui ! Et il en manque encore plein à trouver." },
];
const SCARED: string[][] = [
  [],
  ["Il… il s'approche…", "Euh… on s'éloigne un peu ?", "Doucement… doucement…"],
  ["Oh non, le zombie !", "Au secours ! Il vient par ici !", "Reculez ! Reculez !"],
  ["AAAAAAH !", "AU SECOURS ! IL VA ME MANGER !", "MAMAAAAN !", "NON NON NON NON !"],
];
const STATUE_SCARED = ["Hm ! Attendez-moi, ma canne !", "De mon temps… les zombies… AAAH !", "Pas si vite, je suis vieux !"];
export const mainScared = (level: number) => pick(SCARED[Math.max(1, Math.min(3, level))]);

// ------------------------------------------------------------------ the engine
type Pos = { x: number; y: number };
const W = 64;
const H = 74;
const G = 1500;
type Goal = { x: number; y: number; speed: number; stop: number; wrap: boolean; until: number; done: (ok: boolean) => void };
type Body = {
  key: Buddy;
  el: HTMLElement;
  flip: HTMLElement;
  look: Look;
  x: number; // feet
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  dir: 1 | -1;
  mode: "free" | "held" | "fly" | "down" | "go";
  goal: Goal | null;
  wish: Pos; // the speed he wants (set by his behaviour, a few times a second)
  wrap: boolean; // allowed to run off the screen and come back on the other side
  downUntil: number;
  scared: number;
  pursuit: { dir: 1 | -1; until: number } | null; // the zombie keeps running in one direction (a chase)
  pause: number;
  throwSpeed: number; // how hard he was thrown (the zombie loses his limbs when it is hard)
  say: (text: string, force?: boolean, slot?: Slot, o?: SayOpts) => Promise<void>;
  act: (name: string, ms: number) => void;
  hidden: boolean;
};
/** at: where his bubble shows (his head rolled away: the voice comes from there); onStart: at the very moment he starts to talk. */
type SayOpts = { at?: Pos; onStart?: () => void; /** show the words in a bubble (only to explain something) */ read?: boolean };
const bodies = new Map<Buddy, Body>();
let running = 0;
let lastT = 0;
let talkingUntil = 0;
const now = () => performance.now();

/** The main character's feet, wherever he is (in his corner, or walking about). */
function mainSpot(): Pos | null {
  const fab = document.querySelector<HTMLElement>(".mascot__fab");
  const el = fab && fab.style.visibility !== "hidden" ? fab : document.querySelector<HTMLElement>(".fbp, .act");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width ? { x: r.left + r.width / 2, y: r.bottom } : null;
}
const mainMode = () => PERSOS[getMascot().s.perso].mode;
/** Where the zombie is: a friend on the screen, or the main character himself. */
function zombieSpot(): Pos | null {
  const z = bodies.get("zombie");
  if (z && !z.hidden) return z;
  return mainMode() === "zombie" ? mainSpot() : null;
}
/** Afraid of the zombie: everybody… except the Doctor (and the zombie himself). */
const fearful = (b: Buddy) => b !== "zombie" && b !== "medecin";
const others = (b: Body) => [...bodies.values()].filter((o) => o !== b && !o.hidden);
const sameLine = (a: Pos, b: Pos) => Math.abs(a.y - b.y) < 24;
const top = () => 120;
const bottom = () => window.innerHeight - 78;

function knock(b: Body, vx: number) {
  if (b.mode === "fly" || b.mode === "held" || b.hidden) return;
  b.goal?.done(false);
  b.goal = null;
  b.mode = "fly";
  b.throwSpeed = Math.abs(vx);
  b.vx = vx * 0.6 + Math.sign(vx || 1) * 60;
  b.vz = 280;
  b.vy = 0;
  b.say(b.key === "zombie" ? pick(["Grrr !", "Grrraaah… pas gentil !"]) : b.key === "statue" ? pick(["Ouille ! Mes vieux os !", "Hm ! Ma canne !"]) : pick(["AÏE !", "Ouille !", "Hé !"]), true, "aie");
}

/** The zombie thrown hard falls to pieces at the very moment of a shock: a wall, a friend, the ground. */
const canBurst = (b: Body, vx: number) => b.key === "zombie" && zopt().limbs && b.throwSpeed >= 1000 && Math.abs(vx) > 380;
function burstZombie(zb: Body, vx: number) {
  const sp = zb.throwSpeed;
  const at = { x: zb.x, y: zb.y, z: zb.z };
  zb.mode = "free";
  zb.vz = 0;
  zb.vx = 0;
  zb.vy = 0;
  zb.z = 0;
  zb.hidden = true;
  zb.el.style.display = "none";
  zb.throwSpeed = 0;
  fallApart(
    zb.look,
    at,
    sp >= 1800 ? 3 : sp >= 1300 ? 2 : 1,
    (p) => {
      zb.x = p.x;
      zb.y = p.y;
      zb.hidden = false;
      zb.el.style.display = "";
    },
    { vx: vx || (Math.random() < 0.5 ? -300 : 300) },
  );
  thud();
  window.dispatchEvent(new CustomEvent("footdex:zombiehead", { detail: { x: zb.x, y: zb.y } }));
}

const hits = new WeakMap<Body, number>();
const OUCH = ["Aïe !", "Ouch !", "Aouh !", "Ouille !", "Aïaïaïe !"];
/** A shock against something hard: he squashes, you hear the thud, he says « aïe » (a different one each time). */
function shock(b: Body, say = true) {
  const n = (hits.get(b) ?? 0) + 1;
  hits.set(b, n);
  b.flip.animate([{ transform: `scaleX(${b.dir}) scale(1.28,0.74)` }, { transform: `scaleX(${b.dir}) scale(0.92,1.1)`, offset: 0.6 }, { transform: `scaleX(${b.dir})` }], { duration: 260 });
  thud();
  if (say && b.key !== "zombie") void b.say(b.key === "statue" ? pick(["Ouille ! Mon dos !", "Aïe ! Mes os !", "Hm ! Ma canne !", "Ouille !"]) : OUCH[(n - 1) % OUCH.length], true, "aie");
}

function step(t: number) {
  const dt = Math.min(0.04, (t - lastT) / 1000 || 0.016);
  lastT = t;
  const list = [...bodies.values()].filter((b) => !b.hidden);
  const vw = window.innerWidth;
  const main = mainSpot();
  outer: for (const b of list) {
    if (b.mode === "held") continue;
    if (b.mode === "fly") {
      b.vz -= G * dt;
      b.z += b.vz * dt;
      b.x += b.vx * dt;
      b.y = Math.max(top(), Math.min(bottom(), b.y + b.vy * dt));
      // he flies into somebody: that one falls too
      for (const o of list) {
        if (o === b || o.mode === "fly" || o.mode === "held" || !sameLine(b, o)) continue;
        if (Math.abs(o.x - b.x) < 40 && b.z < H * 0.8) {
          const hitVx = b.vx;
          knock(o, b.vx);
          if (canBurst(b, hitVx)) {
            burstZombie(b, hitVx); // against a friend: he falls to pieces right there
            continue outer;
          }
          shock(b, false);
          b.vx = -b.vx * 0.35;
        }
      }
      if (main && sameLine(b, main) && Math.abs(main.x - b.x) < 36 && b.z < H * 0.8 && Math.abs(b.vx) > 120) {
        window.dispatchEvent(new CustomEvent("footdex:mainknock", { detail: { vx: b.vx } }));
        if (canBurst(b, b.vx)) {
          burstZombie(b, b.vx);
          continue outer;
        }
        b.vx = -b.vx * 0.35;
      }
      if (b.x < W / 2 || b.x > vw - W / 2) {
        if (canBurst(b, b.vx)) {
          burstZombie(b, b.vx); // the wall: he falls to pieces at the shock
          continue outer;
        }
        if (Math.abs(b.vx) > 140) shock(b);
        b.vx = -b.vx * 0.5;
        b.x = Math.max(W / 2, Math.min(vw - W / 2, b.x));
      }
      if (b.z <= 0) {
        b.z = 0;
        if (b.vz < -380) {
          b.vz = -b.vz * 0.3;
          b.vx *= 0.5;
          thud();
        } else if (b.key === "zombie" && zopt().limbs && b.throwSpeed >= 1000) {
          // the zombie thrown hard: at the shock, his head and arms come off (put them back, or he looks for them)
          burstZombie(b, b.vx || (Math.random() < 0.5 ? -300 : 300));
        } else {
          b.mode = "down";
          b.vz = 0;
          b.vx = 0;
          b.throwSpeed = 0;
          b.downUntil = t + 1300;
          thud();
          b.el.classList.add("is-down");
          const who = b;
          const nh = hits.get(who) ?? 0;
          hits.set(who, 0);
          shock(who, false);
          window.setTimeout(() => who.say(who.key === "zombie" ? "Grrr… atterrissage…" : nh >= 2 ? pick(["J'ai mal…", "J'ai mal partout…", "Ouf… j'ai trop mal…"]) : who.key === "statue" ? "Ouille… mon dos…" : pick(["Aïe !", "Ouille…", "Ouf ! Ça va…"]), true, nh >= 2 ? undefined : "atterrit"), 120);
        }
      }
    } else if (b.mode === "down") {
      if (t > b.downUntil) {
        b.mode = "free";
        b.el.classList.remove("is-down");
      }
    } else if (b.mode === "go" && b.goal) {
      const g = b.goal;
      const dx = g.x - b.x;
      const dy = g.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d <= g.stop || t > g.until) {
        b.goal = null;
        b.mode = "free";
        b.vx = b.vy = 0;
        g.done(d <= g.stop);
      } else {
        b.vx = (dx / d) * g.speed;
        b.vy = (dy / d) * g.speed;
      }
    } else {
      // free: he follows his wish, smoothly (no jerky stop-and-go)
      const k = Math.min(1, dt * 3);
      b.vx += (b.wish.x - b.vx) * k;
      b.vy += (b.wish.y - b.vy) * k;
    }
    if (b.mode === "go" || b.mode === "free") {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
  }
  // solid bodies: two on the same line cannot stand in the same place
  for (let i = 0; i < list.length; i += 1)
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i];
      const c = list[j];
      if (a.mode === "fly" || c.mode === "fly" || a.mode === "held" || c.mode === "held" || !sameLine(a, c)) continue;
      const dx = c.x - a.x;
      const over = 44 - Math.abs(dx);
      if (over > 0) {
        const s = Math.sign(dx) || 1;
        a.x -= (s * over) / 2;
        c.x += (s * over) / 2;
      }
    }
  if (main)
    for (const b of list) {
      if (b.mode === "fly" || b.mode === "held" || !sameLine(b, main)) continue;
      const dx = b.x - main.x;
      const over = 46 - Math.abs(dx);
      if (over > 0) b.x += (Math.sign(dx) || 1) * over;
    }
  // the edges: a chase may go off one side and come back on the other; otherwise he stays on the screen
  for (const b of list) {
    if (b.mode === "fly" || b.mode === "held") continue;
    const wrap = b.wrap || b.goal?.wrap;
    if (wrap) {
      if (b.x < -W * 0.7) b.x = vw + W * 0.6;
      else if (b.x > vw + W * 0.7) b.x = -W * 0.6;
    } else b.x = Math.max(W / 2, Math.min(vw - W / 2, b.x));
    b.y = Math.max(top(), Math.min(bottom(), b.y));
    const sp = Math.hypot(b.vx, b.vy);
    if (Math.abs(b.vx) > 6) b.dir = b.vx > 0 ? 1 : -1;
    b.el.classList.toggle("is-walk", sp > 8 && b.mode !== "down");
    b.el.classList.toggle("is-run", sp > 140 && b.mode !== "down");
  }
  for (const b of list) {
    b.el.style.transform = `translate(${b.x - W / 2}px,${b.y - H - b.z}px)`;
    b.el.style.zIndex = String(depthZ(b.y));
    b.flip.style.transform = b.mode === "fly" ? `scaleX(${b.dir}) rotate(${Math.max(-50, Math.min(50, b.vx * 0.09 * (b.vz > 0 ? 1 : 1.4))) * b.dir}deg)` : `scaleX(${b.dir})`;
  }
  moveHead(dt);
  running = bodies.size ? requestAnimationFrame(step) : 0;
}
function wake() {
  if (!running && bodies.size) {
    lastT = now();
    running = requestAnimationFrame(step);
  }
}
/** Walks (or runs) somewhere; resolves when he is there (or gave up). */
function goTo(b: Body, x: number, y: number, speed: number, opts: { stop?: number; wrap?: boolean; timeout?: number } = {}) {
  return new Promise<boolean>((done) => {
    if (b.mode === "fly" || b.mode === "held" || b.hidden) return done(false);
    b.goal?.done(false);
    b.mode = "go";
    b.goal = { x, y: Math.max(top(), Math.min(bottom(), y)), speed, stop: opts.stop ?? 6, wrap: !!opts.wrap, until: now() + (opts.timeout ?? 15000), done };
  });
}
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

// ------------------------------------------------------------------ behaviours (a few times a second)
const lastFearTalk = new Map<Buddy, number>();
function think() {
  const t = now();
  const z = zombieSpot();
  const main = mainSpot();
  const vw = window.innerWidth;
  for (const b of bodies.values()) {
    if (b.hidden || b.mode !== "free") continue;
    if (b.key === "zombie") {
      // he never stays still: he walks after somebody, slowly; sometimes he stops to groan
      if (t < b.pause) {
        b.wish = { x: 0, y: 0 };
        continue;
      }
      if (b.pursuit && t < b.pursuit.until) {
        b.wrap = true;
        b.wish = { x: b.pursuit.dir * 46, y: 0 };
        continue;
      }
      b.pursuit = null;
      b.wrap = false;
      if (!zopt().chase) {
        // he does not chase anybody: he just wanders about
        if (Math.random() < 0.15) b.wish = { x: (Math.random() - 0.5) * 50, y: (Math.random() - 0.5) * 16 };
        continue;
      }
      const prey = [main && mainMode() !== "zombie" ? main : null, ...others(b).map((o) => ({ x: o.x, y: o.y }))].filter(Boolean) as Pos[];
      const target = prey.sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
      if (!target) {
        b.wish = { x: (Math.random() - 0.5) * 40, y: 0 };
        continue;
      }
      const dx = target.x - b.x;
      const dy = target.y - b.y;
      const d = Math.hypot(dx, dy);
      // the prey ran off the screen and came back on the other side: he follows the same way
      if (Math.abs(dx) > vw * 0.55 && Math.random() < 0.6) {
        b.pursuit = { dir: dx > 0 ? -1 : 1, until: t + 5000 };
        continue;
      }
      if (d < 70) {
        b.wish = { x: 0, y: 0 };
        if (Math.random() < 0.08) b.pause = t + 1800;
      } else b.wish = { x: (dx / d) * 30, y: (dy / d) * 14 };
      continue;
    }
    const fearK = [0, 0.6, 1][zopt().fear];
    if (fearful(b.key) && z && fearK > 0) {
      const dx = b.x - z.x;
      const dy = (b.y - z.y) * 1.6;
      const d = Math.hypot(dx, dy) / fearK;
      const level = d < 95 ? 3 : d < 165 ? 2 : d < 260 ? 1 : 0;
      // the Papi asleep does not move… unless the zombie is right next to him
      if (b.el.classList.contains("is-asleep")) {
        if (level < 3) {
          b.wish = { x: 0, y: 0 };
          continue;
        }
        b.el.classList.remove("is-asleep");
        b.say("Hein ?! Quoi ?! AAAAH ! LE ZOMBIE !", true, "peur");
      }
      b.scared = level;
      b.el.classList.toggle("is-scared", level > 0);
      b.el.classList.toggle("s1", level === 1);
      b.el.classList.toggle("s2", level === 2);
      b.el.classList.toggle("s3", level === 3);
      if (level) {
        // cat and mouse: the closer he is, the faster they go away (gently when he is far)
        const speed = (b.key === "statue" ? 0.35 : 1) * (22 + ((260 - Math.min(260, d)) / 165) * 260);
        let ax = Math.sign(dx) || (Math.random() < 0.5 ? -1 : 1);
        let ay = Math.sign(b.y - z.y) * 0.35;
        // towards the group (the character and the friends) on the safe side
        const mates = [main && mainMode() !== "zombie" ? main : null, ...others(b).filter((o) => fearful(o.key)).map((o) => ({ x: o.x, y: o.y }))].filter(
          (m): m is Pos => !!m && Math.sign(m.x - z.x) === ax,
        );
        if (mates.length) {
          const gx = mates.reduce((a, m) => a + m.x, 0) / mates.length;
          ay += Math.sign(mates[0].y - b.y) * 0.2;
          if (Math.abs(gx - b.x) > 70) ax += Math.sign(gx - b.x) * 0.4;
        }
        // a real chase: they may run off the screen and come back on the other side
        b.wrap = level >= 2;
        if (!b.wrap && ((ax < 0 && b.x < W) || (ax > 0 && b.x > vw - W))) {
          ax = 0;
          ay = b.y > window.innerHeight / 2 ? -1 : 1;
        }
        const n = Math.hypot(ax, ay) || 1;
        b.wish = { x: (ax / n) * speed, y: (ay / n) * speed * 0.6 };
        const last = lastFearTalk.get(b.key) ?? 0;
        if (t - last > (level === 3 ? 2400 : level === 2 ? 4200 : 7000)) {
          lastFearTalk.set(b.key, t);
          b.say(b.key === "statue" && level > 1 ? pick(STATUE_SCARED) : pick(SCARED[level]), level === 3, level >= 2 ? "peur" : undefined);
          if (level >= 2) b.act("surprised", 1100);
        }
        continue;
      }
      b.wrap = false;
    }
    // calm: now and then a few slow steps
    if (Math.random() < 0.06) {
      const sp = b.key === "statue" ? 14 : 30;
      b.wish = { x: (Math.random() - 0.5) * 2 * sp, y: (Math.random() - 0.5) * sp * 0.4 };
    } else if (Math.random() < 0.12) b.wish = { x: 0, y: 0 };
    // close friends drift back towards each other (a real group, not strangers on the same screen)
    if (Math.random() < 0.03) {
      const mate = others(b).filter((o) => o.key !== "zombie" && !o.hidden && o.mode === "free").sort((p, q) => aff(b.key, q.key) - aff(b.key, p.key))[0];
      if (mate && aff(b.key, mate.key) >= 2.5 && Math.abs(mate.x - b.x) > 150) {
        const sp = b.key === "statue" ? 16 : 34;
        b.wish = { x: Math.sign(mate.x - b.x) * sp, y: Math.sign(mate.y - b.y) * sp * 0.3 };
      }
    }
  }
}
let thinker = 0;

// ------------------------------------------------------------------ friendships: who likes whom (1 = neutral, 3 = best friends)
const AFFINITY: Record<string, number> = {
  "excite|poli": 3, "excite|joueur": 3.5, "joueur|poli": 2, "medecin|poli": 2.5, "medecin|statue": 3, "excite|statue": 0.6, "poli|statue": 2,
  "joueur|statue": 1.5, "excite|medecin": 1.2, "joueur|medecin": 1.4,
};
const aff = (a: string, b: string) => (a === "zombie" || b === "zombie" ? 0.3 : AFFINITY[[a, b].sort().join("|")] ?? 1);

// ------------------------------------------------------------------ the zombie's head (it comes off: a ball in the head, a sneeze)
let head: { el: HTMLElement; x: number; y: number; vx: number; vz: number; z: number; rot: number; carrier: Body | null } | null = null;
const curHead = () => head;
function moveHead(dt: number) {
  if (!head) return;
  const h = head;
  if (h.carrier) {
    h.x = h.carrier.x + h.carrier.dir * 14;
    h.y = h.carrier.y;
    h.z = 46;
    h.rot = 0;
  } else if (h.z > 0 || h.vz > 0) {
    h.vz -= G * dt;
    h.z = Math.max(0, h.z + h.vz * dt);
    h.x += h.vx * dt;
    h.rot += h.vx * dt * 3;
    if (h.z === 0) h.vz = h.vz < -200 ? -h.vz * 0.35 : 0;
  } else if (Math.abs(h.vx) > 4) {
    // it rolls on the grass
    h.x += h.vx * dt;
    h.rot += h.vx * dt * 3;
    h.vx *= Math.exp(-2.2 * dt);
  }
  h.x = Math.max(14, Math.min(window.innerWidth - 14, h.x));
  h.el.style.transform = `translate(${h.x - W / 2}px,${h.y - H - h.z + H * 0.38}px) rotate(${h.rot}deg)`;
  h.el.style.zIndex = String(depthZ(h.y) + 1);
}
/** His head comes off and flies (vx: where to). Everybody near screams. */
function dropHead(z: Body, vx: number, high = 0) {
  if (head) return;
  const el = document.createElement("div");
  el.className = "bhead";
  el.innerHTML = `<div class="mfw">${figSvg(z.look, { size: W, crop: "full", mouth: "open" })}</div>`;
  document.body.appendChild(el);
  head = { el, x: z.x, y: z.y, vx, vz: 260 + high, z: H * 0.55, rot: 0, carrier: null };
  z.el.classList.add("no-head");
  window.dispatchEvent(new CustomEvent("footdex:zombiehead", { detail: { x: z.x + vx * 0.5, y: z.y } }));
}
function headBack(z: Body) {
  head?.el.remove();
  head = null;
  z.el.classList.remove("no-head");
}
/** The zombie goes to get his head himself (he has his two arms: no problem). */
async function fetchHead(z: Body) {
  await wait(1400);
  const h = curHead();
  if (!h) return;
  await goTo(z, h.x - (h.x > z.x ? 14 : -14), h.y, 50, { stop: 10, timeout: 12000 });
  z.act("kneel", 900);
  await wait(700);
  headBack(z);
  z.say(pick(["Clic ! Grrr… ma tête est revenue.", "Ah… je revois tout. Grrr.", "Qui a fait ça ? Grrrr !"]), true, "merci");
}

// ------------------------------------------------------------------ the little scenes
let sceneOn = false;
async function scene<T>(f: () => Promise<T>) {
  if (sceneOn) return;
  sceneOn = true;
  try {
    await f();
  } finally {
    sceneOn = false;
  }
}
/** He says a line and we wait until it is finished (never longer than 9 s, whatever happens). */
const sayW = (b: Body, text: string, force = true, slot?: Slot, o?: SayOpts) => Promise.race([b.say(text, force, slot, o), wait(9000)]);
const nearest = (p: Pos, list: Body[]) => [...list].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];


/** What the thief has taken and not given back yet (a friend), and what is on stage now. */
let loot: Body[] = [];
const comeBack = (v: Body, fromSky: boolean) => {
  loot = loot.filter((o) => o !== v);
  v.el.style.clipPath = "";
  v.hidden = false;
  v.el.style.display = "";
  v.vx = 0; v.vy = 0; v.vz = 0; v.throwSpeed = 0;
  if (fromSky) { v.z = 520; v.mode = "fly"; } else { v.z = 0; v.mode = "free"; }
  v.pause = 0;
};
/** Everybody is afraid: they run off the screen away from him, then come back, head first, peeking. */
async function flee(list: Body[], fromX: number) {
  const vw = window.innerWidth;
  await Promise.all(list.map(async (o, i) => {
    o.pause = now() + 12000;
    o.goal?.done(false); o.goal = null;
    o.mode = "held";
    o.el.classList.add("is-scared", "s2", "is-run");
    const dir: 1 | -1 = o.x >= fromX ? 1 : -1;
    o.dir = dir;
    const x0 = o.x, x1 = dir > 0 ? vw + 60 : -60;
    const t0 = now();
    await new Promise<void>((done) => { const f = () => { const k = Math.min(1, (now() - t0) / (700 + i * 150)); o.x = x0 + (x1 - x0) * k; if (k < 1) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
    o.el.classList.remove("is-run");
  }));
}
async function peek(list: Body[]) {
  const vw = window.innerWidth;
  await Promise.all(list.map(async (o, i) => {
    await wait(i * 400);
    const right = o.x > vw / 2;
    const edge = right ? vw + 18 : -18;
    const inX = right ? vw - 8 : 8; // only the head shows
    o.dir = right ? -1 : 1;
    o.x = edge;
    const t0 = now();
    await new Promise<void>((done) => { const f = () => { const k = Math.min(1, (now() - t0) / 500); o.x = edge + (inX - edge) * k; if (k < 1) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
    o.say(pick(["Il est parti ?", "Chut… je regarde si c'est fini.", "Je ne vois plus son bras…"]), true);
    await wait(1400);
    o.mode = "free"; o.x = Math.max(40, Math.min(vw - 40, o.x)); o.pause = now() + 1500;
    o.el.classList.remove("is-scared", "s2");
  }));
}


/** 10. The fête: a match is open, the friends are fans. They shout, jump, line up in a conga, shove each other a little. */
const partyScene = (title = "", year = "") =>
  scene(async () => {
    const fans = freeFriends().filter((b) => b.key !== "zombie" && b.key !== "medecin");
    if (fans.length < 1) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    for (const f of fans) f.pause = now() + 20000;
    const cries = ["Allez les Bleus !", "Quel match !", year ? `Ah ! ${year} ! Quel souvenir !` : "Quel souvenir !", "On a gagné !", "Vive le foot !"];
    fans.forEach((f, i) => window.setTimeout(() => { f.act("cheer", 1600); void f.say(cries[(i + Math.floor(Math.random() * 3)) % cries.length], true, "ola"); }, i * 900));
    await wait(fans.length * 900 + 800);
    // they run to the middle and jump together
    await Promise.all(fans.map((f, i) => goTo(f, vw * (0.3 + 0.4 * (fans.length > 1 ? i / (fans.length - 1) : 0.5)), vh * 0.62, 150, { stop: 8, timeout: 5000 })));
    for (const f of fans) f.act("cheer", 1500);
    await wait(900);
    // a shove, as in every crowd
    if (fans.length >= 2) {
      const [a, c] = fans;
      void a.say("Pousse-toi, je ne vois rien !", true);
      await wait(1400);
      knock(c, c.x >= a.x ? 220 : -220);
      await wait(2600);
      void c.say("Hé ! On se bat pas, on fait la fête !", true);
      await wait(2200);
    }
    // the conga: they line up one behind the other, then hop one after the other
    const ys = vh * 0.66;
    await Promise.all(fans.map((f, i) => (f.mode === "free" ? goTo(f, vw * 0.22 + i * 56, ys, 130, { stop: 6, timeout: 5000 }) : Promise.resolve(false))));
    for (let r = 0; r < 2; r += 1) for (const f of fans) { f.act("cheer", 500); await wait(280); }
    await wait(600);
    for (const f of fans) f.pause = 0;
    void title;
  });

/** 9. The Chapardeur: a shadow, two black holes (his arm goes into one, comes out of the other), he takes a friend or a coin. Double tap on the hole: he is caught and gives back what he took before. */
const thiefScene = () =>
  scene(async () => {
    const frs = freeFriends().filter((b) => b.key !== "zombie" && b.key !== "medecin");
    const victim = frs.length ? pick(frs) : null;
    const vw = window.innerWidth;
    const x = victim ? victim.x : vw * (0.3 + Math.random() * 0.4);
    const y = victim ? victim.y : window.innerHeight * 0.6;
    const bystanders = others(victim ?? ({} as Body)).filter((o) => o.mode === "free");
    if (victim) victim.pause = now() + 30000;
    const coin = victim ? null : prop("coin", x, y);
    window.setTimeout(() => {
      for (const o of bystanders.slice(0, 2)) o.say(pick(["Oh non… il arrive !", "C'est lui… sauvez-vous !", "J'ai peur !"]), true);
    }, 700);
    window.setTimeout(() => void flee(bystanders, x), 1500);
    const caught = await thiefRaid({
      x, y, reach: 62,
      grab: () => { victim?.say(pick(["Aaah ! Lâche-moi !", "Hé ! Qu'est-ce que… !"]), true); },
      lift: (px) => { if (victim) { victim.mode = "held"; victim.z = px; } if (coin) coin.style.transform = `translate(-50%, calc(-100% - ${px}px))`; },
      sink: (k) => {
        if (victim) { victim.z = 14 - k * 90; victim.el.style.clipPath = `inset(0 0 ${Math.max(0, k * 100)}% 0)`; }
        if (coin) coin.style.opacity = String(1 - k);
      },
      gone: () => { coin?.remove(); if (victim) { victim.hidden = true; victim.el.style.display = "none"; loot.push(victim); } },
      release: () => { coin?.remove(); if (victim) { victim.el.style.clipPath = ""; victim.z = 0; victim.mode = "free"; victim.pause = 0; } },
      caught: () => { for (const v of [...loot]) comeBack(v, true); },
    });
    await wait(300);
    await peek(bystanders);
    if (caught) {
      for (const o of [victim, ...bystanders]) o?.say(pick(["Bravo ! On l'a eu !", "Il est tombé dans son piège !", "Hourra !"]), true);
    } else {
      for (const o of bystanders.slice(0, 1)) o.say("Il a pris " + (victim ? "notre copain" : "la pièce") + " ! Il faut le piéger : touche 2 fois son trou noir !", true);
      if (victim) window.setTimeout(() => { if (loot.includes(victim)) { comeBack(victim, true); victim.say("Aïe ! Il m'a lâché !", true); } }, 45000);
    }
  });

/** 1. The zombie sneezes: « A-TCHOU… » his head flies off on « tchou », rolls away… and the body ends the word alone: « …me ! » (Atchoum). */
const sneezeScene = () =>
  scene(async () => {
    const z = bodies.get("zombie");
    if (!z || z.hidden || head || z.mode !== "free") return;
    z.pause = now() + 20000;
    await sayW(z, "Aaah… AAAAH…");
    await wait(300);
    const side = (Math.random() < 0.5 ? -1 : 1) * 200;
    const recorded = hasFx("zombie", "eternue");
    const pop = () => {
      sneeze();
      dropHead(z, side, 160);
    };
    if (recorded) {
      // his own recorded « atchoum » plays whole: the head flies off in the middle of it
      await sayW(z, "ATCHOUM !", true, "eternue", { onStart: () => window.setTimeout(pop, 450) });
      await wait(600);
    } else {
      // « A-TCHOU »: the head leaves exactly when he says « tchou »
      await sayW(z, "A-TCHOU…", true, undefined, { onStart: () => window.setTimeout(pop, 520) });
      // the head is already rolling on the grass when the body ends the word: « …me ! »
      await wait(350);
      const h = curHead();
      await sayW(z, "…me !", true, undefined, h ? { at: { x: h.x, y: h.y } } : undefined);
      await wait(500);
    }
    z.pause = now() + 6000;
    // rarely, the friends think the head is a ball…
    if (curHead() && Math.random() < 0.2 && freeFriends().length >= 2) return headFootball(z);
    const brave = nearest(z, others(z).filter((o) => fearful(o.key) && o.mode === "free"));
    const h0 = curHead();
    if (!brave || !h0) return fetchHead(z);
    brave.say(pick(["Bon… j'y vais… mais je tremble !", "Personne ? D'accord… c'est moi qui y vais…"]), true);
    brave.el.classList.add("is-scared", "s2");
    await goTo(brave, h0.x, h0.y, 70, { stop: 12, timeout: 9000 });
    const h1 = curHead();
    if (!h1) return;
    h1.carrier = brave;
    brave.say(pick(["Beurk… elle est toute molle !", "Je la tiens… je la tiens…"]), true, "beurk");
    await goTo(brave, z.x + (brave.x > z.x ? 40 : -40), z.y, 55, { stop: 8, timeout: 9000 });
    headBack(z);
    z.say("Grrr… merci… Tu veux un câlin ?", true, "merci");
    await wait(900);
    brave.say("NON MERCI ! AAAAH !", true, "peur");
    await goTo(brave, brave.x > z.x ? window.innerWidth + 120 : -120, brave.y, 300, { wrap: true, timeout: 6000 });
    brave.el.classList.remove("is-scared", "s2");
  });

/** Gives the head a kick: it flies and rolls toward `dir`. */
function kickHead(dir: 1 | -1) {
  const h = head;
  if (!h) return;
  h.carrier = null;
  h.vx = dir * (240 + Math.random() * 160);
  h.vz = 150 + Math.random() * 120;
  h.z = Math.max(h.z, 1);
}

/** Rare: the friends play football with the Zombie's head. He is not pleased: the Referee stops everybody,
 *  the Doctor puts the head back, and everybody is sorry. */
async function headFootball(z: Body) {
  const players = freeFriends().slice(0, 3);
  if (players.length < 2) return fetchHead(z);
  players[0].say(pick(["Oh, un ballon ! Passe-la moi !", "Hé ! Un ballon tout rond ! On joue ?"]), true);
  await wait(1800);
  for (let i = 0; i < 5 && curHead() && !players.some((p) => p.hidden); i += 1) {
    const p = players[i % players.length];
    const h = curHead();
    if (!h) break;
    const dir: 1 | -1 = p.x < players[(i + 1) % players.length].x ? 1 : -1;
    await goTo(p, h.x - dir * 18, h.y, 240, { stop: 8, timeout: 3500 });
    p.act("kick", 450);
    await wait(180);
    kickHead(dir);
    if (i === 1) players[1].say(pick(["Passe ! Passe !", "Ha ha ! Quel dribble !"]), true, "passe");
    if (i === 3) z.say("GRRR ! Ce n'est PAS un ballon ! C'est ma TÊTE !", true, undefined, { at: { x: z.x, y: z.y - 60 } });
    await wait(1100);
  }
  const h2 = curHead();
  if (!h2) return;
  z.say("Rendez-moi ma tête ! Grrrr !", true, "tete", { at: { x: h2.x, y: h2.y } });
  players.forEach((p) => (p.pause = now() + 20000));
  await wait(1500);
  // the Referee stops everybody
  await refereeStops({ x: h2.x, y: h2.y }, ["TUUUT ! Stop ! On ne joue pas au foot avec la tête du zombie !", "Rendez-lui sa tête, tout de suite !"]);
  // the Doctor puts it back
  await doctorHeadBack(() => ({ x: z.x, y: z.y }), () => headBack(z), () => ({ x: h2.x, y: h2.y }));
  z.say("Grrr… merci docteur. Mais vous, les copains… pfff.", true, "merci");
  await wait(2600);
  for (const [i, p] of players.entries()) {
    p.pause = 0;
    window.setTimeout(() => p.say(pick(["Pardon, zombie… on a été de mauvais garçons.", "On n'aurait pas dû… Excuse-nous.", "Snif… c'était pas bien de faire ça."]), true), i * 300);
  }
  await wait(3200);
}

/** 6. Hide-and-seek: the friends hide behind the character, the zombie sniffs around… and finds them. */
const hideScene = () =>
  scene(async () => {
    const z = bodies.get("zombie");
    const main = mainSpot();
    const hiders = [...bodies.values()].filter((b) => fearful(b.key) && !b.hidden && b.mode === "free");
    if (!z || !main || !hiders.length || mainMode() === "zombie") return;
    hiders[0].say("Vite ! On se cache derrière lui !", true);
    await Promise.all(hiders.map((h, i) => goTo(h, main.x + (i % 2 ? 16 : -16), main.y - 10, 200, { stop: 6, timeout: 6000 })));
    hiders.forEach((h) => (h.wish = { x: 0, y: 0 }));
    z.pause = now() + 9000;
    z.act("sniff", 4000);
    z.say("Snif… snif… Où êtes-vous ? Grrr…", true);
    await wait(2600);
    say(pick(["Chut… je ne vois personne, moi.", "Hein ? Personne ici !"]));
    await wait(2600);
    z.pause = 0;
    z.say("JE VOUS AI TROUVÉS ! Grrraaah !", true, "bruit");
    await goTo(z, main.x, main.y, 45, { stop: 60, timeout: 5000 });
  });

/** 5. The Doctor's check-up: « Dites 33 ! » */
const checkupScene = () =>
  scene(async () => {
    const d = bodies.get("medecin");
    if (!d || d.hidden || d.mode !== "free") return;
    const patients = others(d).filter((o) => o.mode === "free");
    const main = mainSpot();
    const p = patients.length && Math.random() < 0.6 ? nearest(d, patients) : null;
    const to = p ? { x: p.x, y: p.y } : main;
    if (!to) return;
    d.say("Check-up surprise ! Ne bougez pas !", true);
    await goTo(d, to.x + (d.x < to.x ? -46 : 46), to.y, 90, { stop: 6, timeout: 8000 });
    d.act("work", 2000);
    d.say("Dites… trente-trois !", true);
    await wait(1600);
    if (p) p.say(p.key === "zombie" ? "Grrrente-trois… kof kof !" : "Trente-trois… kof kof !", true, "toux");
    else sayFx("Trente-trois… kof kof !", "toux");
    if (!(p ? hasFx(p.key, "toux") : hasFx(mainMode(), "toux"))) cough();
    await wait(1600);
    d.say(pick(["Rien de grave ! Un peu de sport, et ça ira.", "Excellent ! Bon pour le match !"]), true);
  });

/** 3. The Papi falls asleep on his cane. A tap wakes him up: « Hein ? Quoi ? Pelé ? » */
const sleepScene = () =>
  scene(async () => {
    const p = bodies.get("statue");
    if (p && !p.hidden && p.mode === "free") {
      p.wish = { x: 0, y: 0 };
      p.el.classList.add("is-asleep");
      p.say("Zzzz… Pelé… zzz…", true, "dodo");
      await wait(16000);
      if (p.el.classList.contains("is-asleep")) {
        p.el.classList.remove("is-asleep");
        p.say("Hein ? Quoi ? J'ai dormi ? Non !", true, "reveil");
      }
      return;
    }
    if (mainMode() === "statue" && !getMascot().busy) {
      play("sleep", 16000);
      sayFx("Zzzz… Pelé… zzz…", "dodo");
    }
  });

/** 4. The Jongleur passes the ball to a friend… who gets it right in the face. */
const passScene = () =>
  scene(async () => {
    const target = [...bodies.values()].filter((b) => !b.hidden && b.mode === "free" && b.key !== "zombie")[0] ?? bodies.get("zombie");
    if (!target || target.hidden || mainMode() !== "joueur") return;
    target.say("Passe ! Passe-la moi !", true, "passe");
    await wait(900);
    window.dispatchEvent(new CustomEvent("footdex:pass", { detail: { x: target.x, y: target.y } }));
  });


/** Two friends meet and talk football (the closer they are, the likelier). Best friends sometimes start a kickabout. */
const FOOT_TALK = [
  ["Tu as vu le match d'hier ?", "Oui ! Quel but à la fin !"],
  ["Moi je dis que c'était hors-jeu !", "Mais non, il était bien dans le jeu !"],
  ["Ton équipe va gagner le championnat ?", "Si elle arrête de rater les penaltys…"],
  ["Mon joueur préféré a marqué hier !", "Ah ! Le mien a été formidable aussi !"],
  ["On fait une partie tout à l'heure ?", "Oui ! Je prends le ballon !"],
];
const FLAVOUR: Record<string, string[]> = {
  excite: ["INCROYABLE !", "Je ne tiens plus en place !"],
  poli: ["Je vous en prie, après vous.", "Avec plaisir !"],
  statue: ["De mon temps, les ballons étaient en cuir…", "Ah… ça me rappelle ma jeunesse."],
  medecin: ["Pensez à vous échauffer !", "Buvez de l'eau, ça fait du bien."],
  joueur: ["Allez, une petite partie ?", "Je m'entraîne tous les jours !"],
};
function freeFriends() {
  return [...bodies.values()].filter((b) => !b.hidden && b.mode === "free" && b.key !== "zombie");
}
function bestPair(): [Body, Body] | null {
  const l = freeFriends();
  const pairs: { p: [Body, Body]; w: number }[] = [];
  for (let i = 0; i < l.length; i += 1) for (let j = i + 1; j < l.length; j += 1) pairs.push({ p: [l[i], l[j]], w: aff(l[i].key, l[j].key) });
  if (!pairs.length) return null;
  let r = Math.random() * pairs.reduce((a, q) => a + q.w, 0);
  for (const q of pairs) if ((r -= q.w) <= 0) return q.p;
  return pairs[0].p;
}
const chatScene = () =>
  scene(async () => {
    const pr = bestPair();
    if (!pr) return;
    const [a, b] = pr;
    await goTo(a, b.x + (a.x < b.x ? -58 : 58), b.y, 120, { stop: 10, timeout: 7000 });
    if (a.hidden || b.hidden) return;
    const [la, lb] = pick(FOOT_TALK);
    a.say(la, true);
    await wait(2200);
    b.say(lb, true);
    await wait(2200);
    const fl = FLAVOUR[Math.random() < 0.5 ? a.key : b.key];
    if (fl) (Math.random() < 0.5 ? a : b).say(pick(fl), true);
    await wait(1800);
    if (aff(a.key, b.key) >= 2.5 && Math.random() < 0.6) await kickabout(a, b);
  });

let kball: HTMLElement | null = null;
const putBall = (x: number, y: number, z = 0) => {
  if (!kball) {
    kball = document.createElement("div");
    kball.className = "kball";
    kball.textContent = "⚽";
    document.body.appendChild(kball);
  }
  kball.style.transform = `translate(${x - 11}px, ${y - 22 - z}px)`;
};
async function flyBall(from: Pos, to: Pos, ms: number) {
  const t0 = performance.now();
  await new Promise<void>((done) => {
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      putBall(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, Math.sin(k * Math.PI) * 38);
      if (k < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  });
}
/** A few passes between friends, then a shot at the side of the screen: « BUT ! » */
async function kickabout(a: Body, b: Body) {
  try {
    const at = (x: Body, off: number): Pos => ({ x: x.x + x.dir * off, y: x.y });
    putBall(a.x + 16, a.y);
    a.say("Allez, on s'fait une petite partie !", true);
    b.say("Oui ! Passe !", true);
    let from = a;
    let to = b;
    const passes = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < passes; i += 1) {
      if (from.hidden || to.hidden || from.mode !== "free" || to.mode !== "free") break;
      from.act("kick", 500);
      await flyBall({ x: from.x + from.dir * 18, y: from.y }, at(to, to.x < from.x ? 18 : -18), 700);
      to.act("cheer", 500);
      await goTo(to, to.x + (Math.random() - 0.5) * 120, to.y + (Math.random() - 0.5) * 60, 150, { stop: 8, timeout: 1500 });
      [from, to] = [to, from];
    }
    // the shot
    const side = from.x < window.innerWidth / 2 ? window.innerWidth - 20 : 20;
    from.say("Tir… et c'est le BUT !", true, "ola");
    from.act("kick", 600);
    await flyBall({ x: from.x, y: from.y }, { x: side, y: from.y - 10 }, 800);
    from.act("cheer", 1500);
    to.say(pick(["Bien joué !", "Pfff, j'étais le gardien !", "Joli tir !"]), true);
    await wait(1600);
  } finally {
    kball?.remove();
    kball = null;
  }
}
const kickScene = () =>
  scene(async () => {
    const pr = bestPair();
    if (!pr) return;
    const [a, b] = pr;
    await goTo(a, b.x + (a.x < b.x ? -80 : 80), b.y, 140, { stop: 10, timeout: 6000 });
    await kickabout(a, b);
  });

/** If the ball is lying there (the Jongleur is in his corner), the friends play with it: they run to it and pass it around, then put it back. */
const ballScene = () =>
  scene(async () => {
    const players = freeFriends().slice(0, 3);
    if (players.length < 1 || !looseBall()) return;
    players[0].say(pick(["Oh, un ballon ! Je peux jouer ?", "Un ballon ! On fait une partie ?"]), true);
    ballPlaymates(players.map((p) => p.el));
    try {
    for (let i = 0; i < 6; i += 1) {
      const p = players[i % players.length];
      const next = players[(i + 1) % players.length];
      const b = looseBall();
      if (!b || p.hidden || p.mode !== "free") break;
      await goTo(p, b.x, b.y, 240, { stop: 14, timeout: 4000 });
      const b2 = looseBall();
      if (!b2) break;
      p.act("kick", 450);
      await wait(160);
      // the pass goes to a spot just before his friend (he runs to meet it): the ball never hits him
      const to = next === p ? { x: Math.min(window.innerWidth - 40, Math.max(40, p.x + (Math.random() < 0.5 ? -1 : 1) * 160)), y: p.y } : { x: next.x + (p.x < next.x ? -90 : 90), y: next.y + (p.y < next.y ? -18 : 18) };
      kickBallTo(to.x, to.y, 0.9);
      if (i === 1) next.say(pick(["Passe !", "Ici ! Ici !", "Joli ! Encore !"]), true, "passe");
      if (i === 4) p.say(pick(["Et c'est le BUT !", "Quel tir !"]), true);
      await wait(1300);
    }
    await wait(900);
    players.forEach((p) => p.act("cheer", 1000));
    players[0].say(pick(["Merci pour le ballon !", "On le remet à sa place."]), true);
    await wait(1500);
    } finally {
      ballPlaymates([]);
      returnBall();
    }
  });

/** Too many friends stand in the middle of the screen: the Referee comes and tells them to move over. */
const middleScene = () =>
  scene(async () => {
    const mid = [...bodies.values()].filter((b) => !b.hidden && b.mode === "free" && Math.abs(b.x - window.innerWidth / 2) < window.innerWidth * 0.16 && b.y > window.innerHeight * 0.25 && b.y < window.innerHeight - 90);
    if (!mid.length) return;
    const who = mid[0];
    await refereeMovesOver(() => ({ x: who.x, y: who.y }), pick(["Poussez-vous ! Bougez, on ne voit rien !", "Hé, vous ! Bougez de là, on ne voit plus rien !", "Pas au milieu de l'écran ! Poussez-vous !"]), () => {
      mid.forEach((b, i) => {
        b.say(pick(["Oups, pardon !", "Oui, monsieur l'arbitre !", "On se pousse !"]), i === 0);
        const left = b.x < window.innerWidth / 2;
        void goTo(b, left ? 50 + i * 40 : window.innerWidth - 50 - i * 40, b.y, 220, { stop: 8, timeout: 5000 });
      });
    });
  });

/** The Referee forms the teams: everyone lines up on one side or the other, cheers, then back to his place. */
async function teams() {
  const l = freeFriends();
  const z = bodies.get("zombie");
  if (z && !z.hidden) l.push(z);
  if (!l.length) return;
  const shuffled = [...l].sort(() => Math.random() - 0.5);
  const midY = window.innerHeight * 0.52;
  await Promise.all(
    shuffled.map(async (b, i) => {
      const left = i % 2 === 0;
      const row = Math.floor(i / 2);
      await wait(i * 200);
      b.say(left ? pick(["Je suis dans l'équipe bleue !", "À gauche, c'est parti !"]) : pick(["Équipe rouge !", "À droite, avec moi !"]), i === 0);
      await goTo(b, left ? 60 + row * 52 : window.innerWidth - 60 - row * 52, midY + (left ? -34 : 34) + row * 24, 230, { stop: 8, timeout: 6000 });
      b.act("cheer", 1200);
    }),
  );
  await wait(1800);
  const ev = freeFriends();
  if (ev.length >= 2) await kickabout(ev[0], ev[1]);
}

/** 7. The Referee whistles the end of playtime: everybody back to his place. */
async function recre() {
  const list = [...bodies.values()].filter((b) => !b.hidden);
  await Promise.all(
    list.map(async (b, i) => {
      await wait(i * 250);
      b.say(pick(["On y va !", "Oui, monsieur l'arbitre !", "J'arrive !"]), i === 0);
      const s = getMascot().s.buddyPos[b.key];
      const x = s ? s.fx * (window.innerWidth - W) + W / 2 : 40 + i * 70;
      const y = s ? s.fy * (window.innerHeight - H - 80) + 60 + H : bottom() - 20;
      await goTo(b, x, y, 220, { stop: 6, timeout: 6000 });
    }),
  );
}

/** 2. The Mexican wave: everybody lifts his arms, one after the other. */
async function ola() {
  const list = [...bodies.values()].filter((b) => !b.hidden).sort((a, b) => a.x - b.x);
  const main = mainSpot();
  const all: (Body | "main")[] = [...list];
  if (main) all.splice(list.filter((b) => b.x < main.x).length, 0, "main");
  all.forEach((b, i) =>
    window.setTimeout(() => {
      if (b === "main") {
        play("cheer", 1600);
        sayFx("OLAAAA !", "ola");
      } else {
        b.act("cheer", 1500);
        b.say(i === 0 ? "OLAAAA !" : "Ola !", true, "ola");
      }
    }, i * 380),
  );
}

// ------------------------------------------------------------------ 8. the stadium cat
let cat: { el: HTMLElement; x: number; y: number; dir: 1 | -1; state: "walk" | "hiss" } | null = null;
const CAT_SVG = `<svg viewBox="0 0 60 44" width="46" height="34" aria-hidden="true"><path d="M8 30 Q2 20 6 10" fill="none" stroke="#3b3b4a" stroke-width="4" stroke-linecap="round" class="cat__tail"/><ellipse cx="26" cy="28" rx="16" ry="10" fill="#4a4a5c"/><path d="M14 36 v6 M20 37 v6 M32 37 v6 M38 36 v6" stroke="#4a4a5c" stroke-width="4" stroke-linecap="round"/><circle cx="44" cy="18" r="10" fill="#4a4a5c"/><path d="M36 12 L38 2 L44 9Z M46 9 L52 2 L53 13Z" fill="#4a4a5c"/><circle cx="41" cy="17" r="2.4" fill="#ffd76a"/><circle cx="48" cy="17" r="2.4" fill="#ffd76a"/><circle cx="41" cy="17" r="1" fill="#111"/><circle cx="48" cy="17" r="1" fill="#111"/><path d="M44 21 l1.5 1.5 l1.5 -1.5" stroke="#ff9db4" stroke-width="1.4" fill="none"/><path d="M50 21 h8 M50 23 l7 2 M38 21 h-7" stroke="#cfd4dc" stroke-width="0.8"/></svg>`;
async function catScene() {
  if (cat || sceneOn) return;
  sceneOn = true;
  try {
    const el = document.createElement("div");
    el.className = "stadcat";
    el.innerHTML = CAT_SVG;
    document.body.appendChild(el);
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const y = bottom() - 10 - Math.random() * 120;
    cat = { el, x: dir > 0 ? -40 : window.innerWidth + 40, y, dir, state: "walk" };
    const c = cat;
    const draw = () => {
      el.style.transform = `translate(${c.x - 23}px,${c.y - 34}px) scaleX(${c.dir})`;
      el.style.zIndex = String(depthZ(c.y));
    };
    meow();
    const others0 = [...bodies.values()].filter((b) => !b.hidden && b.key !== "zombie");
    if (others0[0]) others0[0].say(pick(["Oh ! Un chat !", "Un chat sur le terrain !"]), true, "chat");
    else sayFx(pick(["Oh ! Un chat !", "Tiens, un chat !"]), "chat");
    const z = bodies.get("zombie");
    let met = false;
    let last = now();
    await new Promise<void>((done) => {
      const tick = (t: number) => {
        const dt = Math.min(0.04, (t - last) / 1000);
        last = t;
        if (c.state === "walk") c.x += c.dir * 60 * dt;
        // the zombie wants to stroke it…
        if (z && !z.hidden && !met && Math.abs(c.x - z.x) < 260 && z.mode === "free") {
          met = true;
          void (async () => {
            z.pause = now() + 8000;
            z.say("Grrr… gentil minou… viens…", true);
            await goTo(z, c.x - c.dir * 10, c.y, 40, { stop: 56, timeout: 6000 });
            c.state = "hiss";
            el.classList.add("is-hiss");
            hiss();
            await wait(600);
            z.pause = 0;
            z.act("surprised", 1200);
            z.say("AAAAAH ! UN CHAT ! AU SECOURS !", true, "peur");
            await goTo(z, z.x < c.x ? -120 : window.innerWidth + 120, z.y, 260, { wrap: true, timeout: 5000 });
            const brave = [...bodies.values()].find((b) => !b.hidden && fearful(b.key));
            if (brave) brave.say(pick(["Le zombie a peur d'un chat ! Ha ha !", "Ha ha ! Un chat a fait peur au zombie !"]), true, "rire");
            else sayFx("Ha ha ! Le zombie a peur des chats !", "rire");
            await wait(800);
            el.classList.remove("is-hiss");
            c.state = "walk";
          })();
        }
        draw();
        if (c.x < -60 || c.x > window.innerWidth + 60) return done();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    el.remove();
  } finally {
    cat = null;
    sceneOn = false;
  }
}

// ------------------------------------------------------------------ one friend
function lookOf(b: Buddy, looks: Record<string, unknown>): Look {
  if (b === "medecin") return DOCTOR_LOOK;
  const base = (looks[b] as Look | undefined) ?? CARAC[b].tenue;
  return b === "statue" && !base.acc.includes("cane") ? { ...base, acc: [...base.acc, "cane"] } : base;
}

function One({ b, index }: { b: Buddy; index: number }) {
  const m = useMascot();
  const [talk, setTalk] = useState(false);
  const [bubble, setBubble] = useState("");
  const [bpos, setBpos] = useState<Pos>({ x: 0, y: 0 });
  const [hidden, setHidden] = useState(false);
  const [act, setAct] = useState("");
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const flipRef = useRef<HTMLSpanElement | null>(null);
  const bodyRef = useRef<Body | null>(null);
  const timers = useRef<number[]>([]);
  const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));
  const look = lookOf(b, m.s.looks);

  /** He says something: his bubble, his voice (or the noise recorded for him), his mouth. */
  const bubbleTok = useRef(0);
  const speak = (text: string, force = false, slot?: Slot, o: SayOpts = {}): Promise<void> => {
    if (!text) return Promise.resolve();
    if (slot && hasFx(b, slot)) force = true; // a recorded noise always plays, exactly at its moment
    // chatter that nobody asked for waits for silence; what the scenes say is never lost, it takes its turn
    if (!force && (Date.now() < talkingUntil || turnsBusy() || sceneOn)) return Promise.resolve();
    const ms = Math.max(2400, text.length * 68);
    return new Promise<void>((resolve) => {
      takeTurn(
        (end) => {
          talkingUntil = Date.now() + ms + 300;
          const bd = bodyRef.current;
          const at = o.at ?? (bd ? { x: bd.x, y: bd.y - bd.z } : null);
          if (at) setBpos(at);
          bubbleTok.current += 1;
          const tok = bubbleTok.current;
          const t0 = Date.now();
          if (o.read) setBubble(text);
          setTalk(true);
          o.onStart?.();
          // the bubble stays as long as his voice goes on (at least a moment), then disappears
          let over = false;
          const finish = () => {
            if (over) return;
            over = true;
            // he keeps his bubble a moment at least, so it can be read; then the next one speaks
            later(Math.max(120, (o.read ? 1500 : 150) - (Date.now() - t0)), () => {
              end();
              resolve();
              if (bubbleTok.current === tok) {
                setTalk(false);
                setBubble("");
              }
            });
          };
          const recorded = slot ? playFx(b, slot) : false;
          if (recorded) later(Math.min(ms, 2600), finish);
          else if (!getMascot().talking) speakAs(text, b, finish);
          else later(ms, finish);
          later(ms + 2300, finish); // safety: no voice at all
        },
        { prio: force ? 1 : 0, ms },
      );
    });
  };
  useEffect(() => {
    const hush = () => {
      bubbleTok.current += 1;
      setBubble("");
      setTalk(false);
    };
    window.addEventListener("footdex:hush", hush);
    return () => window.removeEventListener("footdex:hush", hush);
  }, []);
  const doAct = (name: string, ms: number) => {
    setAct(name);
    later(ms, () => setAct((a) => (a === name ? "" : a)));
  };

  useEffect(() => {
    const el = btnRef.current;
    const flip = flipRef.current;
    if (!el || !flip) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const saved = getMascot().s.buddyPos[b];
    const x = saved ? saved.fx * (vw - W) + W / 2 : 50 + index * (W + 14);
    const y = saved ? saved.fy * (vh - H - 80) + 60 + H : vh - 120;
    const body: Body = {
      key: b,
      el,
      flip,
      look,
      x,
      y,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      dir: 1,
      mode: "free",
      goal: null,
      wish: { x: 0, y: 0 },
      wrap: false,
      downUntil: 0,
      scared: 0,
      pursuit: null,
      pause: 0,
      throwSpeed: 0,
      say: speak,
      act: doAct,
      hidden: false,
    };
    bodyRef.current = body;
    bodies.set(b, body);
    wake();
    if (!thinker) thinker = window.setInterval(think, 250);
    later(2500 + index * 2200, () => speak(pick(TALK[b]), false, "bonjour"));

    // his own little life (talks, chats, waves; the zombie groans and lifts his arms)
    const life = () => {
      const k = Math.random();
      const st = getMascot();
      if (body.mode !== "free" || body.hidden || st.s.rest || body.el.classList.contains("is-asleep")) return;
      if (b === "zombie") {
        if (k < 0.3) {
          doAct("zarms", 2600);
          speak(pick(["Braaaains… euh… ballons !", "Grrraaaaah…", "Mmmmh… du fooot…", "Grrr… un câlin ?"]), false, "bruit");
        } else if (k < 0.4) speak(pick(TALK.zombie), false, "bruit");
        return;
      }
      if (b === "medecin" && zombieSpot() && k < 0.25) {
        const z = zombieSpot() as Pos;
        void goTo(body, z.x + (z.x > body.x ? -56 : 56), z.y, 70, { stop: 6, timeout: 8000 }).then(() =>
          speak(pick(["Viens là, toi, je vais te recoudre un point.", "Pas de panique, je n'ai pas peur des zombies.", "Ouvre la bouche… non, ferme-la !"])),
        );
        return;
      }
      if (k < 0.3 && !st.talking && !st.bubble) speak(b === "statue" && Math.random() < 0.4 ? OLD_STORIES[Math.floor(Math.random() * OLD_STORIES.length)].split(/(?<=[.!?])\s/)[0] : pick(TALK[b]), false, undefined, { read: b === "statue" });
      else if (k < 0.42 && !st.talking && !st.bubble) {
        const mode = PERSOS[st.s.perso].mode;
        const fits = CHATS.filter((c) => (!c.who || c.who === b) && (!c.to || c.to === mode));
        const c = pick(fits);
        speak(c.a);
        later(Math.max(2800, c.a.length * 70), () => say(c.b));
      } else if (k < 0.5) doAct("wave", 2000);
      else if (k < 0.54 && b !== "statue" && b !== "medecin") speak(pick(LORE_HINTS), false, undefined, { read: true });
      else if (k < 0.58) speak(pick(TALK[b]), false, "bruit");
    };
    const loop = () =>
      later((b === "zombie" ? 9000 : b === "excite" ? 16000 : b === "statue" ? 32000 : 24000) * (0.7 + Math.random() * 0.8), () => {
        if (!document.hidden) life();
        loop();
      });
    loop();

    // reactions to what happens on the pitch
    const onEv = (e: Event) => {
      const ev = (e as CustomEvent<string>).detail;
      if (ev === "doctor-in") {
        // there is only one Doctor: our friend goes to work (he hides while the Doctor of the pitch is there)
        if (b === "medecin") {
          speak("J'y vais !", true);
          later(700, () => {
            body.hidden = true;
            setHidden(true);
          });
          return;
        }
        if (Math.random() < 0.4) later(400, () => speak(pick(REACT.doctor[b] ?? REACT.doctor.all), false, "soigne"));
        return;
      }
      if (ev === "doctor-out") {
        if (b === "medecin")
          later(600, () => {
            body.hidden = false;
            setHidden(false);
          });
        return;
      }
      if (ev === "thrown") {
        doAct("surprised", 1600);
        if (Math.random() < 0.8) later(150 + index * 250, () => speak(pick(REACT.thrown[b] ?? REACT.thrown.all), index === 0));
        return;
      }
      if (ev === "card" && Math.random() < 0.6) later(1400 + index * 300, () => speak(pick(REACT.card[b] ?? REACT.card.all), false, "carton"));
      if (ev === "lore" && b !== "statue") doAct("listen", 30000);
    };
    const onParty = (e: Event) => { const d = (e as CustomEvent<{ title: string; year: string }>).detail; if (!sceneOn) void partyScene(d?.title, d?.year); };
    window.addEventListener("footdex:party", onParty);
    window.addEventListener("footdex:terrain", onEv);
    // the ball hits him
    const onBall = (e: Event) => {
      const { el: hit, h, vx, speed } = (e as CustomEvent<{ el: HTMLElement; h: number; vx: number; speed: number }>).detail;
      if (hit !== el) return;
      if (b === "zombie" && zopt().ballHead && h > 0.5 && speed > 160 && !head) {
        speak("Mmmf ! MA TÊTE !", true, "tete");
        dropHead(body, (vx >= 0 ? 1 : -1) * (160 + Math.random() * 90));
        void fetchHead(body);
        return;
      }
      if (speed > 520) return knock(body, vx);
      doAct("surprised", 900);
      speak(
        b === "zombie" ? pick(["Grrr ?", "Grrr… pas dans le ventre !"]) : b === "statue" ? pick(["Aïe ! Mes vieux os !", "Hm ! De mon temps, on visait le but !"]) : b === "medecin" ? "Aïe ! Qui soigne le docteur ?" : pick(["Aïe !", "Hé ! Fais attention !", "Ouille, mon nez !"]),
        true,
        "ballon",
      );
    };
    window.addEventListener("footdex:ballhit", onBall);
    // somebody thrown flies into him
    const onKnock = (e: Event) => {
      const { el: hit, vx } = (e as CustomEvent<{ el: HTMLElement; vx: number }>).detail;
      if (hit === el) knock(body, vx);
    };
    window.addEventListener("footdex:knock", onKnock);
    // the zombie lost his head: everybody near screams
    const onHead = (e: Event) => {
      if (!fearful(b)) return;
      const z = (e as CustomEvent<Pos>).detail;
      const d = Math.hypot(body.x - z.x, body.y - z.y);
      const level = d < 140 ? 3 : d < 260 ? 2 : 1;
      later(150 + Math.random() * 300, () => {
        speak(level === 3 ? pick(["AAAAAH ! SA TÊTE !", "IIIIIH ! ELLE ROULE !", "BEUUUURK !"]) : level === 2 ? pick(["Oh non, sa tête !", "Beurk… elle roule par ici !"]) : "Euh… il a perdu quelque chose…", level === 3, "beurk");
        doAct("surprised", 1400);
      });
    };
    window.addEventListener("footdex:zombiehead", onHead);
    return () => {
      window.removeEventListener("footdex:party", onParty);
      window.removeEventListener("footdex:terrain", onEv);
      window.removeEventListener("footdex:ballhit", onBall);
      window.removeEventListener("footdex:knock", onKnock);
      window.removeEventListener("footdex:zombiehead", onHead);
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      body.goal?.done(false);
      bodies.delete(b);
      if (b === "zombie" && head) headBack(body);
      if (!bodies.size && thinker) {
        window.clearInterval(thinker);
        thinker = 0;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b]);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.look = look;
  }, [look]);

  // the finger: a tap (he talks, or wakes up), a drag (he is moved), a flick (he flies!)
  const drag = useRef<{ ox: number; oy: number; moved: boolean; pts: { t: number; x: number; y: number }[] } | null>(null);
  const down = (e: { preventDefault: () => void; currentTarget: EventTarget; pointerId: number; clientX: number; clientY: number }) => {
    const body = bodyRef.current;
    if (!body || body.mode === "fly") return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { ox: e.clientX - body.x, oy: e.clientY - body.y, moved: false, pts: [{ t: now(), x: e.clientX, y: e.clientY }] };
  };
  const move = (e: { clientX: number; clientY: number }) => {
    const d = drag.current;
    const body = bodyRef.current;
    if (!d || !body) return;
    const nx = e.clientX - d.ox;
    const ny = e.clientY - d.oy;
    if (!d.moved && Math.hypot(nx - body.x, ny - body.y) < 7) return;
    if (!d.moved) {
      d.moved = true;
      body.goal?.done(false);
      body.goal = null;
      body.mode = "held";
      body.el.classList.add("is-drag");
    }
    body.x = Math.max(W / 2, Math.min(window.innerWidth - W / 2, nx));
    body.y = Math.max(top(), Math.min(bottom(), ny));
    body.z = 0;
    const t = now();
    d.pts.push({ t, x: e.clientX, y: e.clientY });
    d.pts = d.pts.filter((p) => t - p.t < 120);
  };
  const up = () => {
    const d = drag.current;
    const body = bodyRef.current;
    drag.current = null;
    if (!d || !body) return;
    body.el.classList.remove("is-drag");
    if (!d.moved) {
      if (body.el.classList.contains("is-asleep")) {
        body.el.classList.remove("is-asleep");
        return speak("Hein ? Quoi ? Pelé ? … Ah, c'est toi.", true, "reveil");
      }
      return speak(pick(TALK[b]), true, "bonjour");
    }
    const a = d.pts[0];
    const z = d.pts[d.pts.length - 1];
    const span = a && z && z.t > a.t ? (z.t - a.t) / 1000 : 0;
    const vx = span ? (z.x - a.x) / span : 0;
    const vy = span ? (z.y - a.y) / span : 0;
    if (Math.hypot(vx, vy) > 650) {
      // thrown!
      body.mode = "fly";
      body.throwSpeed = Math.hypot(vx, vy);
      body.vx = Math.max(-1400, Math.min(1400, vx * 0.8));
      body.vz = Math.max(260, Math.min(1000, -vy * 0.8));
      body.vy = 0;
      speak(b === "zombie" ? "Grrraaaah ! Je vole !" : b === "statue" ? "Hé ! Pas les vieux ! AAAAH !" : pick(["Waaaah !", "Hiiiii !", "Pose-moi !"]), true, "lance");
      return;
    }
    body.mode = "free";
    body.wish = { x: 0, y: 0 };
    update({ buddyPos: { ...getMascot().s.buddyPos, [b]: { fx: Math.max(0, Math.min(1, (body.x - W / 2) / Math.max(1, window.innerWidth - W))), fy: Math.max(0, Math.min(1, (body.y - H - 60) / Math.max(1, window.innerHeight - H - 80))) } } });
  };

  if (m.s.rest) return null;
  const mode = b === "medecin" ? "poli" : b;
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={cx("buddy", b === "statue" && "is-old", b === "zombie" && "is-zombie")}
        style={{ display: hidden ? "none" : undefined }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label={`${BUDDY_NAME(b)} : touche-le pour qu'il parle, lance-le d'un coup de doigt`}
      >
        <span ref={flipRef} className="buddy__flip">
          <Fig look={look} size={W} crop="full" mouth={talk ? "open" : b === "medecin" ? "smile" : PERSOS.find((p) => p.mode === b)?.mouth ?? "smile"} talk={talk} mode={mode} act={act} />
        </span>
      </button>
      {bubble && !hidden ? (
        <div className="buddy__bubble" style={{ left: `${Math.max(8, Math.min(window.innerWidth - 188, bpos.x - 90))}px`, top: `${Math.max(64, bpos.y - H - 56)}px` }} role="status">
          <b>{BUDDY_NAME(b)}</b> {bubble}
        </div>
      ) : null}
    </>
  );
}

export function Buddies() {
  const m = useMascot();
  const mode = PERSOS[m.s.perso].mode;
  // the main character is not his own friend
  const list = m.s.buddies.filter((b) => b !== mode);
  // the main character is afraid of a zombie friend too (the closer, the bigger the fright)
  const zombieHere = list.includes("zombie") && mode !== "zombie";
  useEffect(() => {
    if (!zombieHere) return;
    let at = 0;
    const t = window.setInterval(() => {
      const st = getMascot();
      if (st.busy || st.s.rest || st.talking) return;
      const me = mainSpot();
      const z = bodies.get("zombie");
      if (!me || !z || z.hidden) return;
      const k = [0, 0.6, 1][zopt().fear];
      if (!k) return;
      const d = Math.hypot(me.x - z.x, (me.y - z.y) * 1.6) / k;
      const level = d < 95 ? 3 : d < 165 ? 2 : 0;
      if (!level || Date.now() < at) return;
      at = Date.now() + (level === 3 ? 3000 : 6000);
      const text = mode === "statue" ? pick(STATUE_SCARED) : mainScared(level);
      sayFx(text, "peur");
      if (mode !== "statue" && (level === 3 || Math.random() < 0.4)) {
        window.dispatchEvent(new CustomEvent("footdex:flee", { detail: { x: z.x, y: z.y } }));
        return;
      }
      play(level === 3 ? "surprised" : "shake", 1400);
    }, 500);
    const onHead = (e: Event) => {
      const z = (e as CustomEvent<Pos>).detail;
      const me = mainSpot();
      if (!me) return;
      const d = Math.hypot(me.x - z.x, me.y - z.y);
      window.setTimeout(() => {
        sayFx(d < 160 ? pick(["AAAAAH ! SA TÊTE !", "IIIIH ! Elle a roulé jusqu'à moi !"]) : pick(["Oh non… sa tête !", "Beurk !"]), "beurk");
        play("surprised", 1500);
      }, 200);
    };
    window.addEventListener("footdex:zombiehead", onHead);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("footdex:zombiehead", onHead);
    };
  }, [zombieHere, mode]);

  // the director: a little scene now and then; the stadium cat; the wave; the end of playtime
  useEffect(() => {
    const timers: number[] = [];
    const nextScene = () =>
      timers.push(
        window.setTimeout(() => {
          const st = getMascot();
          if (!document.hidden && !st.busy && !st.s.rest && !document.querySelector(".mm, .wd, .reveal, .chm, .subst")) {
            const has = (k: Buddy) => !!bodies.get(k) && !bodies.get(k)?.hidden;
            const options: (() => Promise<unknown> | void)[] = [];
            if (has("zombie") && zopt().sneeze) options.push(sneezeScene);
            if (has("zombie") && [...bodies.values()].some((b) => fearful(b.key))) options.push(hideScene);
            if (has("medecin")) options.push(checkupScene);
            if (has("statue") || mode === "statue") options.push(sleepScene);
            if (mode === "joueur" && bodies.size) options.push(passScene);
            if (freeFriends().length >= 2) options.push(chatScene, chatScene, kickScene);
            if (freeFriends().length >= 1 && looseBall()) options.push(ballScene, ballScene);
            if ([...bodies.values()].some((b) => !b.hidden && b.mode === "free" && Math.abs(b.x - window.innerWidth / 2) < window.innerWidth * 0.16 && b.y > window.innerHeight * 0.25)) options.push(middleScene, middleScene, middleScene);
            if (freeFriends().filter((b) => b.key !== "zombie" && b.key !== "medecin").length >= 1 && Math.random() < 0.4) options.push(thiefScene);
            if (options.length) void pick(options)();
          }
          nextScene();
        }, (bodies.size ? 45000 : 120000) * (0.7 + Math.random() * 0.8)),
      );
    nextScene();
    const catLoop = () =>
      timers.push(
        window.setTimeout(() => {
          const st = getMascot();
          if (zopt().cat && !document.hidden && !st.s.rest && !document.querySelector(".mm, .wd, .reveal, .chm, .subst")) void catScene();
          catLoop();
        }, (360000 + Math.random() * 360000) * (bodies.has("zombie") ? 0.5 : 1)),
      );
    catLoop();
    const onEv = (e: Event) => {
      const ev = (e as CustomEvent<string>).detail;
      if (ev === "card") playFx(mode, "carton");
      if (ev === "doctor-in") playFx(mode, "soigne");
      if (ev === "doctor-out") window.setTimeout(() => playFx(mode, "merci"), 300);
      if (ev === "goal") void ola();
      if (ev === "recre") void recre();
      if (ev === "teams") void scene(async () => { await teams(); await wait(2500); await recre(); });
    };
    window.addEventListener("footdex:terrain", onEv);
    // for checking the scenes in a browser (« ?essai-terrain »)
    if (location.search.includes("essai-terrain")) (window as unknown as { __scenes?: unknown }).__scenes = {
      partyScene, thiefScene, sneezeScene, hideScene, checkupScene, sleepScene, passScene, catScene, ola, recre, chatScene, kickScene, teams, ballScene, middleScene, headFootball: () => scene(async () => { const z = bodies.get("zombie"); if (z) { dropHead(z, 200, 160); await wait(800); await headFootball(z); } }),
      // test helpers: throw a friend, read where everybody is
      fling: (key: Buddy, vx: number, vz: number, speed: number) => {
        const b = bodies.get(key);
        if (!b) return false;
        b.goal = null;
        b.mode = "fly";
        b.throwSpeed = speed;
        b.vx = vx;
        b.vz = vz;
        b.vy = 0;
        return true;
      },
      where: () => [...bodies.values()].map((b) => ({ k: b.key, x: Math.round(b.x), y: Math.round(b.y), z: Math.round(b.z), m: b.mode, h: b.hidden, s: b.scared })),
    };
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("footdex:terrain", onEv);
    };
  }, [mode]);

  return (
    <div className="buddies">
      {list.map((b, i) => (
        <One key={b} b={b} index={i} />
      ))}
    </div>
  );
}

/** The chips to choose the friends (three at most). */
export function BuddyPicker() {
  const m = useMascot();
  const mode = PERSOS[m.s.perso].mode;
  const all: Buddy[] = ["statue", "excite", "poli", "joueur", "pointu", "zombie", "medecin"];
  const on = m.s.buddies;
  const toggle = (b: Buddy) => {
    const next = on.includes(b) ? on.filter((x) => x !== b) : [...on, b].slice(-3);
    update({ buddies: next });
  };
  return (
    <div className="chips" role="group" aria-label="Copains à l'écran">
      {all
        .filter((b) => b !== mode)
        .map((b) => (
          <button key={b} type="button" className={cx("chip", on.includes(b) && "chip--on")} aria-pressed={on.includes(b)} onClick={() => toggle(b)}>
            {BUDDY_NAME(b).replace(/^Le /, "")}
          </button>
        ))}
    </div>
  );
}
