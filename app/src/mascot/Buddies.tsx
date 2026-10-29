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
import { DOCTOR_LOOK, getMascot, play, say, sayFx, speakAs, update, useMascot, zopt, type Buddy } from "./state";
import { fallApart } from "./zombie";
import { figSvg, type Look } from "./look";
import { hasFx, playFx, type Slot } from "./bruits";
import { cough, hiss, meow, sneeze, thud } from "../sound";
import { cx } from "../util";
import { depthZ } from "./depth";

export const BUDDY_NAME = (b: Buddy) => (b === "medecin" ? "Le Médecin" : PERSOS.find((p) => p.mode === b)?.name ?? b);

/** What each friend says when you touch him, or by himself. */
const TALK: Record<Buddy, string[]> = {
  statue: ["Hm. De mon temps, les ballons étaient en cuir. Et lourds !", "Hm… Tu sais qui a gagné la Coupe du monde en 1958 ? Pelé. À 17 ans.", "Ma canne et moi, on a vu Platini jouer. Hm."],
  excite: ["Oh là là, on est plusieurs à l'écran ! C'est la fête !", "Tu veux que je te raconte un truc ? Dis oui !", "ALLEZ ! ALLEZ ! On va gagner !"],
  poli: ["Bonjour ! Je reste à côté, si tu as besoin.", "Si je peux me permettre : les doublons s'échangent contre des étoiles.", "Belle journée pour le football, n'est-ce pas ?"],
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
  say: (text: string, force?: boolean, slot?: Slot) => void;
  act: (name: string, ms: number) => void;
  hidden: boolean;
};
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

function step(t: number) {
  const dt = Math.min(0.04, (t - lastT) / 1000 || 0.016);
  lastT = t;
  const list = [...bodies.values()].filter((b) => !b.hidden);
  const vw = window.innerWidth;
  const main = mainSpot();
  for (const b of list) {
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
          knock(o, b.vx);
          b.vx = -b.vx * 0.35;
        }
      }
      if (main && sameLine(b, main) && Math.abs(main.x - b.x) < 36 && b.z < H * 0.8 && Math.abs(b.vx) > 120) {
        window.dispatchEvent(new CustomEvent("footdex:mainknock", { detail: { vx: b.vx } }));
        b.vx = -b.vx * 0.35;
      }
      if (b.x < W / 2 || b.x > vw - W / 2) {
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
          const zb = b;
          zb.mode = "free";
          zb.vz = 0;
          zb.vx = 0;
          zb.hidden = true;
          zb.el.style.display = "none";
          const sp = zb.throwSpeed;
          zb.throwSpeed = 0;
          fallApart(zb.look, { x: zb.x, y: zb.y }, sp >= 1800 ? 3 : sp >= 1300 ? 2 : 1, (p) => {
            zb.x = p.x;
            zb.y = p.y;
            zb.hidden = false;
            zb.el.style.display = "";
          }, { vx: zb.vx || (Math.random() < 0.5 ? -300 : 300) });
          thud();
          window.dispatchEvent(new CustomEvent("footdex:zombiehead", { detail: { x: zb.x, y: zb.y } }));
        } else {
          b.mode = "down";
          b.vz = 0;
          b.vx = 0;
          b.throwSpeed = 0;
          b.downUntil = t + 1300;
          thud();
          b.el.classList.add("is-down");
          const who = b;
          window.setTimeout(() => who.say(who.key === "zombie" ? "Grrr… atterrissage…" : who.key === "statue" ? "Ouille… mon dos…" : pick(["Aïe !", "Ouille…", "Ouf ! Ça va…"]), true, "atterrit"), 120);
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
    b.flip.style.transform = `scaleX(${b.dir})`;
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
  }
}
let thinker = 0;

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
const nearest = (p: Pos, list: Body[]) => [...list].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];

/** 1. The zombie sneezes… and his head flies off. A brave friend (trembling) brings it back. */
const sneezeScene = () =>
  scene(async () => {
    const z = bodies.get("zombie");
    if (!z || z.hidden || head || z.mode !== "free") return;
    z.pause = now() + 6000;
    z.say("Aaah… AAAAH…", true);
    await wait(1300);
    z.say("ATCHOUM !", true, "eternue");
    sneeze();
    dropHead(z, (Math.random() < 0.5 ? -1 : 1) * 200, 160);
    await wait(1500);
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
  const speak = (text: string, force = false, slot?: Slot) => {
    if (!text) return;
    if (slot && hasFx(b, slot)) force = true; // a recorded noise always plays, exactly at its moment
    if (!force && Date.now() < talkingUntil) return;
    const ms = Math.max(2400, text.length * 68);
    talkingUntil = Date.now() + ms + 300;
    const bd = bodyRef.current;
    if (bd) setBpos({ x: bd.x, y: bd.y - bd.z });
    setBubble(text);
    setTalk(true);
    const recorded = slot ? playFx(b, slot) : false;
    if (!recorded && !getMascot().talking) speakAs(text, b);
    later(ms * 0.8, () => setTalk(false));
    later(ms, () => setBubble(""));
  };
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
      if (k < 0.3 && !st.talking && !st.bubble) speak(b === "statue" && Math.random() < 0.4 ? OLD_STORIES[Math.floor(Math.random() * OLD_STORIES.length)].split(/(?<=[.!?])\s/)[0] : pick(TALK[b]));
      else if (k < 0.42 && !st.talking && !st.bubble) {
        const mode = PERSOS[st.s.perso].mode;
        const fits = CHATS.filter((c) => (!c.who || c.who === b) && (!c.to || c.to === mode));
        const c = pick(fits);
        speak(c.a);
        later(Math.max(2800, c.a.length * 70), () => say(c.b));
      } else if (k < 0.5) doAct("wave", 2000);
      else if (k < 0.54 && b !== "statue" && b !== "medecin") speak(pick(LORE_HINTS));
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
    };
    window.addEventListener("footdex:terrain", onEv);
    // for checking the scenes in a browser (« ?essai-terrain »)
    if (location.search.includes("essai-terrain")) (window as unknown as { __scenes?: unknown }).__scenes = { sneezeScene, hideScene, checkupScene, sleepScene, passScene, catScene, ola, recre };
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
