// « Des copains à l'écran » : one or two friends next to the character (the other characters, or the Doctor).
// Each one lives his own little life: he breathes, looks around, takes a few steps, says something in his own
// voice now and then, and reacts to what happens (the character thrown, the Doctor, a card, the Papi's story).
// A tap: he talks. Hold and drag: he moves. They chat with the character from time to time.
import { useEffect, useRef, useState } from "react";
import { Fig } from "./Fig";
import { CARAC } from "./caractere";
import { LORE_HINTS, OLD_STORIES, PERSOS, pick, type Mode } from "./lines";
import { DOCTOR_LOOK, getMascot, say, speakAs, update, useMascot, type Buddy } from "./state";
import { cx } from "../util";

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
  const [pos, setPos] = useState<Pos>(start);
  const [walk, setWalk] = useState(false);
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

  useEffect(() => {
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
      if (k < 0.45) {
        // a few steps
        setPos((p) => {
          const span = b === "statue" ? 40 : b === "zombie" ? 50 : 90;
          const nx = Math.max(4, Math.min(window.innerWidth - W - 4, p.x + (Math.random() - 0.5) * 2 * span));
          setDir(nx >= p.x ? 1 : -1);
          setWalk(true);
          later(b === "statue" ? 4200 : 2600, () => setWalk(false));
          const np = { x: nx, y: p.y };
          later(2700, () => keep(np));
          return np;
        });
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
      later((b === "excite" ? 14000 : b === "statue" ? 32000 : 22000) * (0.7 + Math.random() * 0.8), () => {
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
        if (Math.random() < 0.4) later(1200, () => speak(pick(REACT.doctor[b] ?? REACT.doctor.all)));
        return;
      }
      if (ev === "doctor-out") {
        if (b === "medecin") later(600, () => setHidden(false));
        return;
      }
      if (ev === "thrown") {
        setAct("surprised");
        later(1800, () => setAct(""));
        if (Math.random() < 0.7) later(900 + index * 700, () => speak(pick(REACT.thrown[b] ?? REACT.thrown.all)));
        return;
      }
      if (ev === "card" && Math.random() < 0.6) later(2200 + index * 600, () => speak(pick(REACT.card[b] ?? REACT.card.all)));
      if (ev === "lore" && b !== "statue") {
        // the others know the story… and listen quietly
        setAct("listen");
        later(30000, () => setAct(""));
      }
    };
    window.addEventListener("footdex:terrain", onEv);
    return () => {
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

  if (hidden || m.s.rest) return null;
  const look = lookOf(b, m.s.looks);
  const mode = b === "medecin" ? "poli" : b;
  return (
    <>
      <button
        type="button"
        className={cx("buddy", walk && "is-walk", b === "statue" && "is-old", drag.current?.moved && "is-drag")}
        style={{ left: `${pos.x}px`, top: `${pos.y}px`, transitionDuration: walk ? (b === "statue" ? "4s" : b === "zombie" ? "3.4s" : "2.4s") : "0s" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label={`${BUDDY_NAME(b)} : touche-le pour qu'il parle`}
      >
        <span className="buddy__flip" style={{ transform: `scaleX(${dir})` }}>
          <Fig look={look} size={W} crop="full" mouth={b === "medecin" ? "smile" : PERSOS.find((p) => p.mode === b)?.mouth ?? "smile"} talk={talk} mode={mode} act={act} />
        </span>
      </button>
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
