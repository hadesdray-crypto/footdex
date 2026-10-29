// « Des copains à l'écran » : one or two friends next to the character (the other characters, or the Doctor).
// Each one lives his own little life: he breathes, looks around, takes a few steps, says something in his own
// voice now and then, and reacts to what happens (the character thrown, the Doctor, a card, the Papi's story).
// A tap: he talks. Hold and drag: he moves. They chat with the character from time to time.
import { useEffect, useRef, useState } from "react";
import { Fig } from "./Fig";
import { CARAC } from "./caractere";
import { LORE_HINTS, OLD_STORIES, PERSOS, pick, type Mode } from "./lines";
import { DOCTOR_LOOK, getMascot, play, say, speakAs, update, useMascot, type Buddy } from "./state";
import { cx } from "../util";
import { depthZ } from "./depth";

export const BUDDY_NAME = (b: Buddy) => (b === "medecin" ? "Le Médecin" : PERSOS.find((p) => p.mode === b)?.name ?? b);

/** What each friend says when you touch him, or by himself. */
const TALK: Record<Buddy, string[]> = {
  statue: ["Hm. De mon temps, les ballons étaient en cuir. Et lourds !", "Hm… Tu sais qui a gagné la Coupe du monde en 1958 ? Pelé. À 17 ans.", "Ma canne et moi, on a vu Platini jouer. Hm."],
  excite: ["Oh là là, on est DEUX à l'écran ! C'est la fête !", "Tu veux que je te raconte un truc ? Dis oui !", "ALLEZ ! ALLEZ ! On va gagner !"],
  poli: ["Bonjour ! Je reste à côté, si tu as besoin.", "Si je peux me permettre : les doublons s'échangent contre des étoiles.", "Belle journée pour le football, n'est-ce pas ?"],
  joueur: ["Tu me fais une passe ?", "Regarde mes jongles… enfin, imagine-les !", "Un petit match après ?"],
  pointu: ["D'après les chiffres, nous sommes deux. C'est mieux qu'un.", "Statistiquement, je parle moins que le supporter.", "Précisément : il y a 22 joueurs sur un terrain."],
  zombie: ["Grrr… du foot…", "Mmmh… cerveaux… euh, ballons !", "Grrr… je suis gentil. Presque."],
  medecin: ["Tout le monde va bien ? Personne n'est blessé ?", "Un pansement ? J'en ai plein ma sacoche.", "Je surveille, je surveille. Le docteur est là !"],
};
const REACT: Record<"thrown" | "doctor" | "card" | "lore", Partial<Record<Buddy, string[]>> & { all: string[] }> = {
  thrown: {
    all: ["Oh non ! Ça va ?", "Aïe ! Ça a dû faire mal !", "Hé ! On ne lance pas les copains !"],
    statue: ["Hm. De mon temps, on ne lançait pas les gens."],
    zombie: ["Grrr… moi aussi je veux voler !"],
    medecin: ["J'arrive ! Ne bouge pas !", "Oh là là… Je prépare un bandage."],
    pointu: ["Selon mes calculs, ça a fait très mal."],
  },
  doctor: { all: ["Le docteur arrive !", "Courage !"], zombie: ["Grrr… le docteur… il a un goût de métal."] },
  card: { all: ["Oh oh… un carton !", "Il est sévère, l'arbitre !"], excite: ["CARTON ! Mais non, arbitre !"], statue: ["Hm. De mon temps, il n'y avait pas de cartons. Ils sont arrivés en 1970."] },
  lore: { all: [] },
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

type Pos = { x: number; y: number };
/** One friend talks at a time (their bubbles must not cover each other). */
let talkingUntil = 0;

// ------------------------------------------------------------------ who is where (their feet), to keep away from the zombie
const REG = new Map<Buddy, Pos>();
/** The main character's feet, wherever he is (in his corner, or walking about). */
function mainSpot(): Pos | null {
  const fab = document.querySelector<HTMLElement>(".mascot__fab");
  const el = fab && fab.style.visibility !== "hidden" ? fab : document.querySelector<HTMLElement>(".fbp, .act");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width ? { x: r.left + r.width / 2, y: r.bottom } : null;
}
/** Where the zombie is: a friend on the screen, or the main character himself. */
function zombieSpot(): Pos | null {
  const z = REG.get("zombie");
  if (z) return z;
  return PERSOS[getMascot().s.perso].mode === "zombie" ? mainSpot() : null;
}
/** Afraid of the zombie: everybody… except the Doctor (and the zombie himself). */
const fearful = (b: Buddy) => b !== "zombie" && b !== "medecin";
const SCARED: string[][] = [
  [],
  ["Il… il s'approche…", "Euh… on s'éloigne un peu ?", "Je n'aime pas trop ce zombie…"],
  ["Oh non, le zombie !", "Au secours ! Il vient par ici !", "Reculez ! Reculez !"],
  ["AAAAAAH !", "AU SECOURS ! IL VA ME MANGER !", "MAMAAAAN !", "NON NON NON NON !"],
];
const STATUE_SCARED = ["Hm ! Attendez-moi, ma canne !", "De mon temps… les zombies… AAAH !", "Pas si vite, je suis vieux !"];
export const mainScared = (level: number) => pick(SCARED[Math.max(1, Math.min(3, level))]);
const W = 64;
const H = 74;

function lookOf(b: Buddy, looks: Record<string, unknown>) {
  if (b === "medecin") return DOCTOR_LOOK;
  const base = (looks[b] as typeof DOCTOR_LOOK | undefined) ?? CARAC[b].tenue;
  return b === "statue" && !base.acc.includes("cane") ? { ...base, acc: [...base.acc, "cane"] } : base;
}

function One({ b, index }: { b: Buddy; index: number }) {
  const m = useMascot();
  const saved = m.s.buddyPos[b];
  const start = (): Pos => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (saved) return { x: saved.fx * (vw - W), y: saved.fy * (vh - H - 80) + 60 };
    return { x: 12 + index * (W + 8), y: vh - H - 96 };
  };
  const [pos, setPosState] = useState<Pos>(start);
  const posRef = useRef<Pos>(pos);
  const setPos = (p: Pos | ((q: Pos) => Pos)) => {
    const np = typeof p === "function" ? p(posRef.current) : p;
    posRef.current = np;
    REG.set(b, { x: np.x + W / 2, y: np.y + H });
    setPosState(np);
  };
  const [walkMs, setWalkMs] = useState(0);
  const walk = walkMs > 0;
  const [run, setRun] = useState(false);
  const [scared, setScared] = useState(0);
  const [headOff, setHeadOff] = useState<null | { x: number; y: number; rot: number; ms: number }>(null);
  const headRef = useRef(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [dir, setDir] = useState(1);
  const [talk, setTalk] = useState(false);
  const [bubble, setBubble] = useState("");
  const [hidden, setHiddenState] = useState(false);
  const hiddenRef = useRef(false);
  const setHidden = (v: boolean) => {
    hiddenRef.current = v;
    setHiddenState(v);
    if (v) setBubble("");
  };
  const [act, setAct] = useState("");
  const drag = useRef<{ dx: number; dy: number; moved: boolean; t: number } | null>(null);
  const timers = useRef<number[]>([]);
  const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));

  /** He says something: his bubble, his voice, his mouth. */
  const speak = (text: string, force = false) => {
    if (!text) return;
    if (!force && Date.now() < talkingUntil) return;
    talkingUntil = Date.now() + Math.max(2600, text.length * 70) + 400;
    setBubble(text);
    setTalk(true);
    if (!getMascot().talking) speakAs(text, b);
    const ms = Math.max(2600, text.length * 70);
    later(ms * 0.8, () => setTalk(false));
    later(ms, () => setBubble(""));
  };

  /** He walks (or runs) to a place, at his own speed. */
  const walkRef = useRef(0);
  const moveTo = (nx: number, ny: number, speed: number) => {
    const p = posRef.current;
    const x = Math.max(4, Math.min(window.innerWidth - W - 4, nx));
    const y = Math.max(70, Math.min(window.innerHeight - H - 76, ny));
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < 4) return 0;
    const ms = Math.round((d / speed) * 1000);
    setDir(x >= p.x ? 1 : -1);
    setRun(speed > 160);
    setWalkMs(ms);
    walkRef.current = Date.now() + ms;
    setPos({ x, y });
    later(ms, () => setWalkMs(0));
    return ms;
  };

  useEffect(() => {
    REG.set(b, { x: posRef.current.x + W / 2, y: posRef.current.y + H });
    const keep = (p: Pos) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      update({ buddyPos: { ...getMascot().s.buddyPos, [b]: { fx: Math.max(0, Math.min(1, p.x / Math.max(1, vw - W))), fy: Math.max(0, Math.min(1, (p.y - 60) / Math.max(1, vh - H - 80))) } } });
    };
    // his own little life
    const life = () => {
      const k = Math.random();
      const st = getMascot();
      if (drag.current || hiddenRef.current || st.s.rest) return;
      if (b === "zombie") {
        // the zombie never stays still: he wanders, follows somebody, or lifts his arms like in the films
        const p = posRef.current;
        if (k < 0.22) {
          setAct("zarms");
          speak(pick(["Braaaains… euh… ballons !", "Grrraaaaah…", "Mmmmh… du fooot…", "Grrr… un câlin ?"]));
          later(2600, () => setAct(""));
        } else if (k < 0.62) {
          const targets = [mainSpot(), ...[...REG.entries()].filter(([k2]) => k2 !== "zombie").map(([, v]) => v)].filter(Boolean) as Pos[];
          const t = targets.sort((a, c) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(c.x - p.x, c.y - p.y))[0];
          if (t) {
            const ms = moveTo(t.x - W / 2 + (t.x > p.x + W / 2 ? -70 : 70), t.y - H, 34);
            later(ms + 100, () => keep(posRef.current));
          }
        } else {
          const ms = moveTo(p.x + (Math.random() - 0.5) * 220, p.y + (Math.random() - 0.5) * 60, 30);
          later(ms + 100, () => keep(posRef.current));
        }
        return;
      }
      if (b === "medecin" && zombieSpot() && k < 0.25) {
        // the Doctor is not afraid: he goes to see the zombie
        const z = zombieSpot() as Pos;
        moveTo(z.x - W / 2 + (z.x > posRef.current.x ? -60 : 60), z.y - H, 70);
        later(1500, () => speak(pick(["Viens là, toi, je vais te recoudre un point.", "Pas de panique, je n'ai pas peur des zombies.", "Ouvre la bouche… non, ferme-la !"])));
        return;
      }
      if (k < 0.45) {
        // a few steps
        const p = posRef.current;
        const span = b === "statue" ? 40 : 90;
        const ms = moveTo(p.x + (Math.random() - 0.5) * 2 * span, p.y, b === "statue" ? 22 : 45);
        later(ms + 100, () => keep(posRef.current));
      } else if (k < 0.62 && !st.talking && !st.bubble) {
        speak(b === "statue" && Math.random() < 0.4 ? OLD_STORIES[Math.floor(Math.random() * OLD_STORIES.length)].split(/(?<=[.!?])\s/)[0] : pick(TALK[b]));
      } else if (k < 0.72 && !st.talking && !st.bubble) {
        // a little chat with the character
        const mode = PERSOS[st.s.perso].mode;
        const fits = CHATS.filter((c) => (!c.who || c.who === b) && (!c.to || c.to === mode));
        const c = pick(fits);
        speak(c.a);
        later(Math.max(2800, c.a.length * 70), () => say(c.b));
      } else if (k < 0.8) {
        setAct("wave");
        later(2000, () => setAct(""));
      } else if (k < 0.84 && b !== "statue" && b !== "medecin") {
        speak(pick(LORE_HINTS));
      }
    };
    const loop = () => {
      later((b === "zombie" ? 4500 : b === "excite" ? 14000 : b === "statue" ? 32000 : 22000) * (0.7 + Math.random() * 0.8), () => {
        if (!document.hidden) life();
        loop();
      });
    };
    later(2500 + index * 1800, () => speak(pick(TALK[b])));
    loop();
    // reactions to what happens on the pitch
    const onEv = (e: Event) => {
      const ev = (e as CustomEvent<string>).detail;
      if (ev === "doctor-in") {
        // there is only one Doctor: our friend goes to work… (he hides while the Doctor of the pitch is there)
        if (b === "medecin") {
          speak("J'y vais !", true);
          later(700, () => setHidden(true));
          return;
        }
        if (Math.random() < 0.4) later(400, () => speak(pick(REACT.doctor[b] ?? REACT.doctor.all)));
        return;
      }
      if (ev === "doctor-out") {
        if (b === "medecin") later(600, () => setHidden(false));
        return;
      }
      if (ev === "thrown") {
        setAct("surprised");
        later(1800, () => setAct(""));
        if (Math.random() < 0.8) later(150 + index * 250, () => speak(pick(REACT.thrown[b] ?? REACT.thrown.all), index === 0));
        return;
      }
      if (ev === "card" && Math.random() < 0.6) later(1400 + index * 300, () => speak(pick(REACT.card[b] ?? REACT.card.all)));
      if (ev === "lore" && b !== "statue") {
        // the others know the story… and listen quietly
        setAct("listen");
        later(30000, () => setAct(""));
      }
    };
    window.addEventListener("footdex:terrain", onEv);

    // ---- the fear of the zombie: the closer he is, the bigger the fright; they run away, towards the others
    let fearAt = 0;
    const flee = (z: Pos, d: number, level: number) => {
      const p = posRef.current;
      const me = { x: p.x + W / 2, y: p.y + H };
      const away = Math.sign(me.x - z.x) || (Math.random() < 0.5 ? -1 : 1);
      // cornered against the edge: he cannot go further that way, so he runs up or down, away from the zombie
      if ((away < 0 && me.x < 70) || (away > 0 && me.x > window.innerWidth - 70)) {
        const vy = me.y > z.y ? 1 : -1;
        moveTo(p.x, p.y + vy * (level === 3 ? 140 : 90) * (p.y + vy * 140 > window.innerHeight - H - 80 || p.y + vy * 140 < 80 ? -1 : 1), b === "statue" ? 60 : [0, 120, 220, 330][level]);
        return;
      }
      // towards the group (the character and the other friends), if they are on the safe side
      const friends = [mainSpot(), ...[...REG.entries()].filter(([k2]) => k2 !== b && fearful(k2)).map(([, v]) => v)].filter((f): f is Pos => !!f && Math.sign(f.x - z.x) === away);
      let tx = me.x + away * (300 - d);
      if (friends.length) tx = tx * 0.5 + (friends.reduce((a, f) => a + f.x, 0) / friends.length + away * 50) * 0.5;
      const speed = b === "statue" ? 60 : [0, 120, 220, 330][level];
      moveTo(tx - W / 2, p.y + (Math.random() - 0.5) * 40, speed);
    };
    const fear = window.setInterval(() => {
      if (!fearful(b) || drag.current || hiddenRef.current || getMascot().s.rest) return;
      const z = zombieSpot();
      if (!z) return setScared(0);
      const p = posRef.current;
      const d = Math.hypot(p.x + W / 2 - z.x, (p.y + H - z.y) * 1.6);
      const level = d < 95 ? 3 : d < 165 ? 2 : d < 240 ? 1 : 0;
      setScared(level);
      if (!level) return;
      const now = Date.now();
      if (now > fearAt) {
        fearAt = now + (level === 3 ? 2200 : 4200);
        speak(b === "statue" && level > 1 ? pick(STATUE_SCARED) : pick(SCARED[level]), level === 3);
        if (level >= 2) {
          setAct("surprised");
          later(1200, () => setAct(""));
        }
      }
      if (walkRef.current <= Date.now()) {
        flee(z, d, level);
      }
    }, 450);

    // ---- the ball hits him
    const onBall = (e: Event) => {
      const { el, h, vx, speed } = (e as CustomEvent<{ el: HTMLElement; h: number; vx: number; speed: number }>).detail;
      if (el !== btnRef.current) return;
      if (b === "zombie" && h > 0.5 && speed > 160 && !headRef.current) {
        // in the head: it comes off… and rolls on the ground. He goes to get it back (he has both his arms).
        headRef.current = true;
        const p = posRef.current;
        const dist = (90 + Math.random() * 70) * (vx >= 0 ? 1 : -1);
        const hx = Math.max(10, Math.min(window.innerWidth - 40, p.x + W / 2 + dist));
        setHeadOff({ x: p.x, y: p.y, rot: 0, ms: 0 });
        requestAnimationFrame(() => requestAnimationFrame(() => setHeadOff({ x: hx - W / 2, y: p.y + H * 0.38, rot: dist * 3, ms: 900 })));
        window.dispatchEvent(new CustomEvent("footdex:zombiehead", { detail: { x: hx, y: p.y + H } }));
        speak("Mmmf ! MA TÊTE !", true);
        later(1600, () => {
          const ms = moveTo(hx - W / 2 - (dist > 0 ? 12 : -12), posRef.current.y, 55);
          later(ms + 200, () => {
            setAct("kneel");
            later(700, () => {
              setHeadOff(null);
              headRef.current = false;
              setAct("");
              speak(pick(["Clic ! Grrr… ma tête est revenue.", "Ah… je revois tout. Grrr.", "Qui a tiré ? Grrrr !"]), true);
              later(400, () => keep(posRef.current));
            });
          });
        });
        return;
      }
      setAct("surprised");
      later(900, () => setAct(""));
      speak(b === "zombie" ? pick(["Grrr ?", "Grrr… pas dans le ventre !"]) : b === "statue" ? pick(["Aïe ! Mes vieux os !", "Hm ! De mon temps, on visait le but !"]) : b === "medecin" ? "Aïe ! Qui soigne le docteur ?" : pick(["Aïe !", "Hé ! Fais attention !", "Ouille, mon nez !"]), true);
    };
    window.addEventListener("footdex:ballhit", onBall);
    // ---- the zombie lost his head: everybody near screams
    const onHead = (e: Event) => {
      if (!fearful(b)) return;
      const z = (e as CustomEvent<Pos>).detail;
      const p = posRef.current;
      const d = Math.hypot(p.x + W / 2 - z.x, p.y + H - z.y);
      const level = d < 140 ? 3 : d < 260 ? 2 : 1;
      later(150 + Math.random() * 300, () => {
        speak(level === 3 ? pick(["AAAAAH ! SA TÊTE !", "IIIIIH ! ELLE ROULE !", "BEUUUURK !"]) : level === 2 ? pick(["Oh non, sa tête !", "Beurk… elle roule par ici !"]) : "Euh… il a perdu quelque chose…", true);
        setAct("surprised");
        later(1400, () => setAct(""));
        if (level >= 2) flee(z, d, level);
      });
    };
    window.addEventListener("footdex:zombiehead", onHead);

    return () => {
      window.clearInterval(fear);
      window.removeEventListener("footdex:ballhit", onBall);
      window.removeEventListener("footdex:zombiehead", onHead);
      REG.delete(b);
      window.removeEventListener("footdex:terrain", onEv);
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b]);

  const down = (e: { preventDefault: () => void; currentTarget: EventTarget; pointerId: number; clientX: number; clientY: number }) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false, t: Date.now() };
  };
  const move = (e: { preventDefault: () => void; currentTarget: EventTarget; pointerId: number; clientX: number; clientY: number }) => {
    const d = drag.current;
    if (!d) return;
    const nx = e.clientX - d.dx;
    const ny = e.clientY - d.dy;
    if (!d.moved && Math.hypot(nx - pos.x, ny - pos.y) < 6) return;
    d.moved = true;
    setPos({ x: Math.max(0, Math.min(window.innerWidth - W, nx)), y: Math.max(60, Math.min(window.innerHeight - H - 70, ny)) });
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) speak(pick(TALK[b]), true);
    else update({ buddyPos: { ...getMascot().s.buddyPos, [b]: { fx: Math.max(0, Math.min(1, pos.x / Math.max(1, window.innerWidth - W))), fy: Math.max(0, Math.min(1, (pos.y - 60) / Math.max(1, window.innerHeight - H - 80))) } } });
  };

  if (hidden || m.s.rest) {
    REG.delete(b);
    return null;
  }
  const look = lookOf(b, m.s.looks);
  const mode = b === "medecin" ? "poli" : b;
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={cx("buddy", walk && "is-walk", run && walk && "is-run", b === "statue" && "is-old", b === "zombie" && "is-zombie", drag.current?.moved && "is-drag", scared > 0 && `is-scared s${scared}`)}
        style={{ left: `${pos.x}px`, top: `${pos.y}px`, transitionDuration: `${walkMs}ms`, zIndex: depthZ(pos.y + H) }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label={`${BUDDY_NAME(b)} : touche-le pour qu'il parle`}
      >
        <span className="buddy__flip" style={{ transform: `scaleX(${dir})` }}>
          <Fig look={look} size={W} crop="full" mouth={scared > 1 ? "open" : b === "medecin" ? "smile" : PERSOS.find((p) => p.mode === b)?.mouth ?? "smile"} talk={talk} mode={mode} act={act} className={headOff ? "no-head" : ""} />
        </span>
      </button>
      {headOff ? (
        <span className="bhead" style={{ left: `${headOff.x}px`, top: `${headOff.y}px`, transitionDuration: `${headOff.ms}ms`, transform: `rotate(${headOff.rot}deg)`, zIndex: depthZ(pos.y + H) + 1 }} aria-hidden="true">
          <Fig look={look} size={W} crop="full" mouth="open" mode={mode} />
        </span>
      ) : null}
      {bubble ? (
        <div className="buddy__bubble" style={{ left: `${Math.max(8, Math.min(window.innerWidth - 188, pos.x + W / 2 - 90))}px`, top: `${Math.max(64, pos.y - 58)}px` }} role="status">
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
      const z = REG.get("zombie");
      if (!me || !z) return;
      const d = Math.hypot(me.x - z.x, (me.y - z.y) * 1.6);
      const level = d < 95 ? 3 : d < 165 ? 2 : 0;
      if (!level || Date.now() < at) return;
      at = Date.now() + (level === 3 ? 3000 : 6000);
      say(mode === "statue" ? pick(STATUE_SCARED) : mainScared(level));
      play(level === 3 ? "surprised" : "shake", 1400);
    }, 500);
    const onHead = (e: Event) => {
      const z = (e as CustomEvent<Pos>).detail;
      const me = mainSpot();
      if (!me) return;
      const d = Math.hypot(me.x - z.x, me.y - z.y);
      window.setTimeout(() => {
        say(d < 160 ? pick(["AAAAAH ! SA TÊTE !", "IIIIH ! Elle a roulé jusqu'à moi !"]) : pick(["Oh non… sa tête !", "Beurk !"]));
        play("surprised", 1500);
      }, 200);
    };
    window.addEventListener("footdex:zombiehead", onHead);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("footdex:zombiehead", onHead);
    };
  }, [zombieHere, mode]);
  return (
    <div className="buddies">
      {list.map((b, i) => (
        <One key={b} b={b} index={i} />
      ))}
    </div>
  );
}

/** The chips to choose the friends (two at most). */
export function BuddyPicker() {
  const m = useMascot();
  const mode = PERSOS[m.s.perso].mode;
  const all: Buddy[] = ["statue", "excite", "poli", "joueur", "pointu", "zombie", "medecin"];
  const on = m.s.buddies;
  const toggle = (b: Buddy) => {
    const next = on.includes(b) ? on.filter((x) => x !== b) : [...on, b].slice(-2);
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
