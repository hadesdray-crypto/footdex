import { useEffect, useRef, useState } from "react";
import { faute } from "../mascot/terrain";
import { LuArrowLeft, LuCircleCheck, LuGem, LuLayers, LuPlay, LuRotateCcw, LuStar, LuTrophy, LuVolume2, LuX } from "react-icons/lu";
import { Fig } from "../mascot/Fig";
import { PERSOS } from "../mascot/lines";
import { emit, sayLabel, stopTalking, useMascot } from "../mascot/state";
import { playFx } from "../mascot/bruits";
import { gameReward, useStore } from "../store";
import { PageTitle } from "../ui/bits";
import { click } from "../sound";
import { cx } from "../util";

// ------------------------------------------------------------ helpers

const rnd = (n: number) => Math.floor(Math.random() * n);
const shuffle = <T,>(a: T[]): T[] => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i -= 1) {
    const j = rnd(i + 1);
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};
const NUM = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf", "vingt"];
const words = (n: number) => NUM[n] ?? String(n);

type P = { speak: (t: string, hold?: boolean) => void; end: (win: boolean, text: string) => void; alive: () => boolean; sleep: (ms: number) => Promise<void>; lv: Lv };

// ------------------------------------------------------------ difficulty (the same for every game, remembered)

type Lv = 0 | 1 | 2;
const LV_KEY = "footdex.jeux.niveau";
const LV_NAMES = ["Facile", "Normal", "Difficile"] as const;
function readLv(): Lv {
  try {
    const v = Number(localStorage.getItem(LV_KEY));
    return v === 0 || v === 2 ? v : 1;
  } catch {
    return 1;
  }
}
function useLv(): [Lv, (v: Lv) => void] {
  const [lv, set] = useState<Lv>(readLv);
  return [
    lv,
    (v: Lv) => {
      try {
        localStorage.setItem(LV_KEY, String(v));
      } catch {
        /* fine */
      }
      set(v);
    },
  ];
}
function LvChips({ lv, onPick }: { lv: Lv; onPick: (v: Lv) => void }) {
  return (
    <div className="lvchips" role="radiogroup" aria-label="Difficulté des jeux">
      {LV_NAMES.map((n, i) => (
        <button key={n} type="button" role="radio" aria-checked={lv === i} className={cx("lvchip", `lvchip--${i}`, lv === i && "is-on")} onClick={() => { click("soft"); onPick(i as Lv); }}>
          {n}
        </button>
      ))}
    </div>
  );
}

function Shirt({ color, stripe, pat = "plain", size = 54 }: { color: string; stripe?: string; pat?: "plain" | "v" | "h" | "dots"; size?: number }) {
  const s = stripe ?? "#fff";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path d="M20 6 L8 14 L2 30 L12 34 L16 26 V58 H48 V26 L52 34 L62 30 L56 14 L44 6 Q32 16 20 6Z" fill={color} stroke="#10131c" strokeWidth="2.4" strokeLinejoin="round" />
      {pat === "v" ? [22, 30, 38].map((x) => <rect key={x} x={x} y="14" width="4" height="44" fill={s} opacity=".85" />) : null}
      {pat === "h" ? [26, 36, 46].map((y) => <rect key={y} x="16" y={y} width="32" height="4.5" fill={s} opacity=".85" />) : null}
      {pat === "dots" ? [[24, 28], [40, 28], [32, 40], [24, 50], [40, 50]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3.2" fill={s} />) : null}
      <path d="M26 7 Q32 16 38 7" fill="none" stroke="#10131c" strokeWidth="2" />
    </svg>
  );
}

function Ball({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="#10131c" strokeWidth="4" />
      <path d="M50 30 l17 12 -6 20 h-22 l-6 -20Z" fill="#10131c" />
      <path d="M50 30 V6 M67 42 L90 34 M61 62 L76 84 M39 62 L24 84 M33 42 L10 34" stroke="#10131c" strokeWidth="4" />
    </svg>
  );
}

const KITS: { c: string; s: string; p: "plain" | "v" | "h" | "dots" }[] = [
  { c: "#e0284f", s: "#fff", p: "h" },
  { c: "#2f5bff", s: "#f6c453", p: "v" },
  { c: "#34d399", s: "#0c2a1f", p: "plain" },
  { c: "#f6c453", s: "#0c5a41", p: "v" },
  { c: "#ff8a3d", s: "#fff", p: "dots" },
  { c: "#7a4dff", s: "#fff", p: "h" },
];

// ------------------------------------------------------------ 1. Mémo

const MEMO = [0.35, 0.75, 0.97];
function Memo({ speak, end, alive, sleep, lv }: P) {
  const [deck] = useState(() => shuffle([0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5]));
  const G = useRef({ open: [] as number[], done: [] as boolean[], you: 0, him: 0, turn: "you" as "you" | "him", lock: false, known: new Map<number, number>() });
  const [, bump] = useState(0);
  const g = G.current;
  if (g.done.length === 0) g.done = deck.map(() => false);
  const refresh = () => bump((n: number) => n + 1);

  useEffect(() => {
    speak("Retrouve les deux maillots pareils. Touche deux cartes. Après toi, c'est mon tour !");
  }, []);

  async function reveal(i: number) {
    g.open = [...g.open, i];
    g.known.set(i, deck[i]);
    refresh();
  }
  async function afterPair(who: "you" | "him") {
    const [a, b] = g.open;
    await sleep(900);
    if (!alive()) return;
    if (deck[a] === deck[b]) {
      g.done[a] = g.done[b] = true;
      g[who] += 1;
      g.open = [];
      refresh();
      if (g.done.every(Boolean)) {
        const win = g.you > g.him;
        end(win, win ? `Bravo, tu gagnes ${g.you} paires contre ${g.him} !` : g.you === g.him ? `Égalité, ${g.you} paires partout !` : `J'ai gagné ${g.him} paires contre ${g.you}. Rejoue !`);
        return;
      }
      if (who === "him") {
        speak("Bien joué, j'ai trouvé une paire ! Je rejoue.");
        await him();
      } else speak("Bravo, une paire ! Rejoue.");
      g.lock = false;
      refresh();
    } else {
      g.open = [];
      g.turn = who === "you" ? "him" : "you";
      refresh();
      if (g.turn === "him") {
        speak("Raté ! C'est mon tour.");
        await him();
      } else {
        speak("À toi de jouer !");
        g.lock = false;
      }
      refresh();
    }
  }
  async function him() {
    g.lock = true;
    await sleep(1200);
    if (!alive()) return;
    const free = deck.map((_, i) => i).filter((i) => !g.done[i]);
    let first = -1;
    let second = -1;
    for (const [i, v] of g.known) {
      if (g.done[i]) continue;
      for (const [j, w] of g.known) if (j !== i && !g.done[j] && w === v && Math.random() < MEMO[lv]) { first = i; second = j; }
      if (first >= 0) break;
    }
    if (first < 0) {
      const unknown = free.filter((i) => !g.known.has(i));
      first = (unknown.length ? unknown : free)[rnd((unknown.length ? unknown : free).length)];
    }
    await reveal(first);
    await sleep(900);
    if (!alive()) return;
    if (second < 0) {
      const match = [...g.known].find(([j, w]) => j !== first && !g.done[j] && w === deck[first]);
      if (match && Math.random() < MEMO[lv]) second = match[0];
      else {
        const rest = free.filter((i) => i !== first && !g.known.has(i));
        const pool = rest.length ? rest : free.filter((i) => i !== first);
        second = pool[rnd(pool.length)];
      }
    }
    await reveal(second);
    await afterPair("him");
  }
  function tap(i: number) {
    if (g.lock || g.turn !== "you" || g.done[i] || g.open.includes(i)) return;
    click("soft");
    void reveal(i).then(() => {
      if (g.open.length === 2) {
        g.lock = true;
        void afterPair("you");
      }
    });
  }
  return (
    <div>
      <p className="gm__score">Toi : <b>{g.you}</b> · Moi : <b>{g.him}</b> · {g.turn === "you" ? "À toi !" : "Mon tour…"}</p>
      <div className="gm__grid gm__grid--4">
        {deck.map((v, i) => {
          const up = g.open.includes(i) || g.done[i];
          const k = KITS[v];
          return (
            <button key={i} type="button" className={cx("gm__card", up && "is-up", g.done[i] && "is-done")} onClick={() => tap(i)} aria-label={up ? `Maillot ${v + 1}` : "Carte cachée"}>
              {up ? <Shirt color={k.c} stripe={k.s} pat={k.p} /> : <Ball size={34} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ 2. Penalty

const SIDES = ["à gauche", "au milieu", "à droite"];
function Penalty({ speak, end, alive, sleep, lv }: P) {
  const [round, setRound] = useState(0);
  const [you, setYou] = useState(0);
  const [him, setHim] = useState(0);
  const [lock, setLock] = useState(false);
  const [shot, setShot] = useState<{ ball: number; keeper: number } | null>(null);
  const shooting = round % 2 === 0;
  const rounds = 6;
  useEffect(() => {
    speak("Penalty ! Quand tu tires, choisis un coin. Quand tu es gardien, devine où je tire !");
  }, []);
  useEffect(() => {
    if (round < rounds) speak(shooting ? "À toi de tirer ! Choisis où tu veux mettre le ballon." : "Je tire ! Choisis où plonger.");
  }, [round]);
  async function choose(i: number) {
    if (lock) return;
    setLock(true);
    click("soft");
    const mine = shooting;
    // easy: the keeper often dives the wrong way, and my shots often go where you dive; hard: the opposite
    const sameP = [0.12, 1 / 3, 0.5][lv];
    const awayFrom = (k: number) => [0, 1, 2].filter((x) => x !== k)[rnd(2)];
    const other = mine ? (Math.random() < sameP ? i : awayFrom(i)) : Math.random() < [0.5, 1 / 3, 0.15][lv] ? i : awayFrom(i);
    const s = mine ? { ball: i, keeper: other } : { ball: other, keeper: i };
    setShot(s);
    await sleep(900);
    if (!alive()) return;
    const goal = s.ball !== s.keeper;
    let y = you;
    let h = him;
    if (mine) {
      if (goal) { y += 1; speak(`But ! Tu as tiré ${SIDES[s.ball]} et je plongeais ${SIDES[s.keeper]}. Bravo !`); } else speak(`Arrêt ! J'ai plongé ${SIDES[s.keeper]}, comme ton tir.`);
    } else if (goal) { h += 1; speak(`But pour moi : j'ai tiré ${SIDES[s.ball]}.`); } else speak(`Arrêté ! Tu as plongé ${SIDES[s.keeper]}, bravo gardien !`);
    setYou(y);
    setHim(h);
    await sleep(1900);
    if (!alive()) return;
    setShot(null);
    if (round + 1 >= rounds) {
      end(y > h, y > h ? `Tu gagnes ${y} à ${h} !` : y === h ? `Égalité ${y} à ${h}.` : `J'ai gagné ${h} à ${y}. Revanche ?`);
    } else {
      setRound(round + 1);
      setLock(false);
    }
  }
  return (
    <div>
      <p className="gm__score">Toi : <b>{you}</b> · Moi : <b>{him}</b> · Tir {Math.min(round + 1, rounds)} sur {rounds}</p>
      <p className="gm__role">{shooting ? "Tu tires !" : "Tu es gardien !"}</p>
      <div className="goal">
        <svg viewBox="0 0 300 130" aria-hidden="true">
          <rect x="10" y="10" width="280" height="110" fill="#ffffff10" stroke="#fff" strokeWidth="6" />
          {[0, 1, 2].map((i) => <rect key={i} x={10 + i * 93.3} y="10" width="93.3" height="110" fill={shot && shot.keeper === i ? "#34d39955" : "none"} stroke="#ffffff30" />)}
        </svg>
        {shot ? <span className="goal__ball" style={{ left: `${16 + shot.ball * 33.3}%` }}><Ball size={30} /></span> : null}
        {shot ? <span className="goal__keeper" style={{ left: `${16 + shot.keeper * 33.3}%` }}>🧤</span> : null}
      </div>
      <div className="gm__btns">
        {["Gauche", "Milieu", "Droite"].map((t, i) => (
          <button key={t} type="button" className="btn btn--gold btn--big" disabled={lock} onClick={() => void choose(i)}>{shooting ? "Tirer" : "Plonger"} {t.toLowerCase()}</button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ 3. Plus ou moins

function HighLow({ speak, end, alive, sleep, lv }: P) {
  const [cur, setCur] = useState(() => 1 + rnd(13));
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [him, setHim] = useState(0);
  const [lock, setLock] = useState(false);
  const [next, setNext] = useState<number | null>(null);
  const total = 6;
  useEffect(() => {
    speak(`La carte est un ${words(cur)}. La prochaine carte sera-t-elle plus grande ou plus petite ? Moi aussi je joue !`);
  }, []);
  async function guess(up: boolean) {
    if (lock) return;
    setLock(true);
    let n = 1 + rnd(13);
    while (n === cur) n = 1 + rnd(13);
    const myUp = lv === 0 ? Math.random() < 0.5 : cur < 7 ? true : cur > 7 ? false : Math.random() < 0.5;
    setNext(n);
    const ok = (n > cur) === up;
    const myOk = (n > cur) === myUp;
    const s = score + (ok ? 1 : 0);
    const h = him + (myOk ? 1 : 0);
    setScore(s);
    setHim(h);
    speak(`C'est un ${words(n)} ! ${ok ? "Bravo, bien deviné !" : "Pas cette fois."} ${myOk ? "Moi aussi j'avais bon." : "Moi, j'ai raté."}`);
    await sleep(2800);
    if (!alive()) return;
    if (step + 1 >= total) {
      end(lv === 0 ? s >= 3 : lv === 1 ? s >= h && s >= 4 : s > h && s >= 4, `Tu as ${s} bonnes réponses sur ${total}, et moi ${h}.`);
      return;
    }
    setStep(step + 1);
    setCur(n);
    setNext(null);
    setLock(false);
    speak(`Nouvelle carte : ${words(n)}. Plus grand ou plus petit ?`);
  }
  return (
    <div>
      <p className="gm__score">Toi : <b>{score}</b> · Moi : <b>{him}</b> · Carte {step + 1} sur {total}</p>
      <div className="gm__pair">
        <div className="numcard">{cur}</div>
        <div className={cx("numcard", next === null && "numcard--back")}>{next ?? "?"}</div>
      </div>
      <div className="gm__btns">
        <button type="button" className="btn btn--gold btn--big" disabled={lock} onClick={() => void guess(true)}>Plus grand ▲</button>
        <button type="button" className="btn btn--pitch btn--big" disabled={lock} onClick={() => void guess(false)}>Plus petit ▼</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ 4. Bataille

function War({ speak, end, alive, sleep, lv }: P) {
  const [round, setRound] = useState(0);
  const [mine, setMine] = useState<number | null>(null);
  const [his, setHis] = useState<number | null>(null);
  const [you, setYou] = useState(0);
  const [him, setHim] = useState(0);
  const [lock, setLock] = useState(false);
  const total = 10;
  useEffect(() => {
    speak("La bataille ! On retourne chacun une carte. Le plus grand nombre gagne le point.");
  }, []);
  async function flip() {
    if (lock) return;
    setLock(true);
    // it is a game of chance… but in easy mode, luck is a bit on your side
    const a = lv === 0 ? Math.max(1 + rnd(13), 1 + rnd(13)) : 1 + rnd(13);
    let b = lv === 2 ? Math.max(1 + rnd(13), 1 + rnd(13)) : 1 + rnd(13);
    if (b === a) b = a === 13 ? 12 : a + 1;
    setMine(a);
    await sleep(500);
    setHis(b);
    const y = you + (a > b ? 1 : 0);
    const h = him + (b > a ? 1 : 0);
    setYou(y);
    setHim(h);
    speak(a > b ? `Ton ${words(a)} bat mon ${words(b)} ! Point pour toi.` : `Mon ${words(b)} bat ton ${words(a)} ! Point pour moi.`);
    await sleep(2300);
    if (!alive()) return;
    if (round + 1 >= total) {
      end(y > h, y > h ? `Tu gagnes ${y} à ${h} !` : y === h ? `Égalité ${y} partout.` : `J'ai gagné ${h} à ${y}.`);
      return;
    }
    setRound(round + 1);
    setMine(null);
    setHis(null);
    setLock(false);
  }
  return (
    <div>
      <p className="gm__score">Toi : <b>{you}</b> · Moi : <b>{him}</b> · Manche {round + 1} sur {total}</p>
      <div className="gm__pair">
        <div className={cx("numcard", mine === null && "numcard--back")}>{mine ?? "?"}</div>
        <div className={cx("numcard", his === null && "numcard--back")}>{his ?? "?"}</div>
      </div>
      <div className="gm__btns">
        <button type="button" className="btn btn--gold btn--big" disabled={lock} onClick={() => void flip()}>Retourner ma carte</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ 5. Morpion

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const winner = (b: string[]) => {
  for (const [x, y, z] of LINES) if (b[x] && b[x] === b[y] && b[y] === b[z]) return b[x];
  return b.every(Boolean) ? "=" : "";
};
/** The perfect move for the cups (T), by trying every game to the end. */
function best(c: string[]): number {
  const score = (b: string[], turn: "T" | "B", depth: number): number => {
    const w = winner(b);
    if (w === "T") return 10 - depth;
    if (w === "B") return depth - 10;
    if (w === "=") return 0;
    let r = turn === "T" ? -99 : 99;
    for (let i = 0; i < 9; i += 1) {
      if (b[i]) continue;
      b[i] = turn;
      const v = score(b, turn === "T" ? "B" : "T", depth + 1);
      b[i] = "";
      r = turn === "T" ? Math.max(r, v) : Math.min(r, v);
    }
    return r;
  };
  let top = -99;
  let moves: number[] = [];
  for (let i = 0; i < 9; i += 1) {
    if (c[i]) continue;
    const b = [...c];
    b[i] = "T";
    const v = score(b, "B", 1);
    if (v > top) { top = v; moves = [i]; } else if (v === top) moves.push(i);
  }
  return moves[rnd(moves.length)];
}
function Morpion({ speak, end, alive, sleep, lv }: P) {
  const [b, setB] = useState<string[]>(Array(9).fill(""));
  const [lock, setLock] = useState(false);
  useEffect(() => {
    speak("Le morpion du foot ! Tu as les ballons, moi les coupes. Aligne trois ballons pour gagner.");
  }, []);
  function pickMove(c: string[]): number {
    const free = c.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    if (lv === 2) return best(c);
    if (lv === 0) {
      // easy: he wins when he can, but often forgets to block you
      for (const i of free) { const t = [...c]; t[i] = "T"; if (winner(t) === "T") return i; }
      if (Math.random() < 0.65) return free[rnd(free.length)];
    }
    for (const who of ["T", "B"]) for (const i of free) { const t = [...c]; t[i] = who; if (winner(t) === who) return i; }
    if (!c[4]) return 4;
    const corners = free.filter((i) => [0, 2, 6, 8].includes(i));
    if (corners.length && Math.random() < 0.7) return corners[rnd(corners.length)];
    return free[rnd(free.length)];
  }
  async function play(i: number) {
    if (lock || b[i]) return;
    setLock(true);
    click("soft");
    const c = [...b];
    c[i] = "B";
    setB(c);
    let r = winner(c);
    if (r) return done(r);
    await sleep(700);
    if (!alive()) return;
    const m = pickMove(c);
    c[m] = "T";
    setB([...c]);
    r = winner(c);
    if (r) return done(r);
    setLock(false);
  }
  function done(r: string) {
    end(r === "B", r === "B" ? "Trois ballons alignés, tu as gagné !" : r === "T" ? "J'ai aligné trois coupes, j'ai gagné !" : "Match nul, la grille est pleine.");
  }
  return (
    <div className="gm__grid gm__grid--3 gm__ttt">
      {b.map((v, i) => (
        <button key={i} type="button" className="gm__cell" onClick={() => void play(i)} aria-label={v === "B" ? "Ballon" : v === "T" ? "Coupe" : "Case vide"}>
          {v === "B" ? <Ball size={46} /> : v === "T" ? <LuTrophy aria-hidden="true" style={{ color: "#ffd76a", width: 44, height: 44 }} /> : null}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ 6. Où est le ballon

function Cups({ speak, end, alive, sleep, lv }: P) {
  const [round, setRound] = useState(0);
  const [order, setOrder] = useState([0, 1, 2]);
  const [ballAt, setBallAt] = useState(rnd(3));
  const [phase, setPhase] = useState<"show" | "shuffle" | "pick" | "result">("show");
  const [picked, setPicked] = useState(-1);
  const [good, setGood] = useState(0);
  const total = 3;
  useEffect(() => {
    void start(0);
  }, []);
  async function start(r: number) {
    const at = rnd(3);
    setBallAt(at);
    setPicked(-1);
    setOrder([0, 1, 2]);
    setPhase("show");
    speak(r === 0 ? "Où est le ballon ? Regarde bien sous quel gobelet il se cache… puis suis-le !" : "Encore une fois ! Regarde bien le ballon.");
    await sleep(2000);
    if (!alive()) return;
    setPhase("shuffle");
    let o = [0, 1, 2];
    for (let i = 0; i < [2 + r, 4 + r * 2, 6 + r * 3][lv]; i += 1) {
      const a = rnd(3);
      let c = rnd(3);
      while (c === a) c = rnd(3);
      o = [...o];
      [o[a], o[c]] = [o[c], o[a]];
      setOrder(o);
      await sleep(Math.max(240, [720 - r * 60, 520 - r * 90, 420 - r * 70][lv]));
      if (!alive()) return;
    }
    setPhase("pick");
    speak("Où est le ballon ? Touche un gobelet !");
  }
  async function pick(slot: number) {
    if (phase !== "pick") return;
    const cup = order[slot];
    setPicked(slot);
    setPhase("result");
    const ok = cup === ballAt;
    const g = good + (ok ? 1 : 0);
    setGood(g);
    speak(ok ? "Bravo, tu l'as trouvé !" : "Oh non, ce n'est pas celui-là !");
    await sleep(2200);
    if (!alive()) return;
    if (round + 1 >= total) {
      end(g >= 2, `Tu as trouvé le ballon ${g} fois sur ${total}.`);
      return;
    }
    setRound(round + 1);
    void start(round + 1);
  }
  return (
    <div>
      <p className="gm__score">Bonnes réponses : <b>{good}</b> · Manche {round + 1} sur {total}</p>
      <div className="cups">
        {[0, 1, 2].map((cup) => {
          const slot = order.indexOf(cup);
          const lifted = phase === "show" || (phase === "result" && (slot === picked || cup === ballAt));
          return (
            <button key={cup} type="button" className={cx("cup", lifted && "cup--up")} style={{ left: `${slot * 33.3 + 3}%` }} onClick={() => void pick(slot)} aria-label="Gobelet">
              <span className="cup__ball">{cup === ballAt ? <Ball size={34} /> : null}</span>
              <span className="cup__body" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ 7. Nombre mystère

function Mystery({ speak, end, alive, sleep, lv }: P) {
  const top = [10, 20, 30][lv];
  const [secret] = useState(() => 1 + rnd(top));
  const [lo, setLo] = useState(1);
  const [hi, setHi] = useState(top);
  const [tries, setTries] = useState(0);
  const [lock, setLock] = useState(false);
  const max = [5, 6, 6][lv];
  useEffect(() => {
    speak(`J'ai pensé à un nombre entre un et ${words(top)}. Essaie de le trouver ! Je te dirai plus grand ou plus petit.`);
  }, []);
  async function tryNum(n: number) {
    if (lock || n < lo || n > hi) return;
    click("soft");
    const t = tries + 1;
    setTries(t);
    if (n === secret) {
      setLock(true);
      end(true, `Bravo ! C'était ${words(secret)}, trouvé en ${t} essai${t > 1 ? "s" : ""} !`);
      return;
    }
    if (n < secret) { setLo(n + 1); speak(`${words(n)}, c'est plus grand !`); } else { setHi(n - 1); speak(`${words(n)}, c'est plus petit !`); }
    if (t >= max) {
      setLock(true);
      await sleep(1500);
      if (alive()) end(false, `C'était ${words(secret)}. On rejoue ?`);
    }
  }
  return (
    <div>
      <p className="gm__score">Essais : <b>{tries}</b> sur {max} · Le nombre est entre <b>{lo}</b> et <b>{hi}</b></p>
      <div className={cx("gm__grid", top > 20 ? "gm__grid--6" : "gm__grid--5")}>
        {Array.from({ length: top }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" className={cx("gm__num", (n < lo || n > hi) && "is-out")} disabled={lock || n < lo || n > hi} onClick={() => void tryNum(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ 8. Gant, ballon, sifflet

const RPS = [
  { name: "le gant", beats: 1, node: <svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true"><path d="M18 56 V34 L12 22 Q12 16 18 18 L22 26 V10 Q22 6 27 6 Q32 6 32 10 V24 V8 Q32 4 37 4 Q42 4 42 8 V24 V12 Q42 8 47 8 Q52 8 52 12 V38 Q52 56 36 58 Z" fill="#ffcf4f" stroke="#10131c" strokeWidth="3" strokeLinejoin="round" /></svg> },
  { name: "le ballon", beats: 2, node: <Ball size={54} /> },
  { name: "le sifflet", beats: 0, node: <svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true"><path d="M8 26 H40 Q58 26 58 40 Q58 54 42 54 Q30 54 28 44 H8Z" fill="#c9d4ea" stroke="#10131c" strokeWidth="3" strokeLinejoin="round" /><circle cx="42" cy="40" r="6" fill="#10131c" /></svg> },
];
function Rps({ speak, end, alive, sleep, lv }: P) {
  const [you, setYou] = useState(0);
  const [him, setHim] = useState(0);
  const [last, setLast] = useState<[number, number] | null>(null);
  const [lock, setLock] = useState(false);
  const seen = useRef([0, 0, 0]);
  useEffect(() => {
    speak("Gant, ballon, sifflet ! Le gant arrête le ballon, le ballon couvre le sifflet, le sifflet arrête le gant. Le premier à trois points gagne.");
  }, []);
  async function play(a: number) {
    if (lock) return;
    setLock(true);
    // easy: he often plays what you beat; hard: he plays against what you play most often
    const loser = RPS[a].beats;
    const fav = seen.current.indexOf(Math.max(...seen.current));
    const counter = RPS.findIndex((x) => x.beats === fav);
    const b = lv === 0 && Math.random() < 0.35 ? loser : lv === 2 && Math.random() < 0.4 ? counter : rnd(3);
    seen.current[a] += 1;
    setLast([a, b]);
    const w = a === b ? 0 : RPS[a].beats === b ? 1 : 2;
    const y = you + (w === 1 ? 1 : 0);
    const h = him + (w === 2 ? 1 : 0);
    setYou(y);
    setHim(h);
    speak(w === 0 ? `Nous avons joué ${RPS[a].name} tous les deux : égalité.` : w === 1 ? `${RPS[a].name} bat ${RPS[b].name} : point pour toi !` : `${RPS[b].name} bat ${RPS[a].name} : point pour moi !`);
    await sleep(2200);
    if (!alive()) return;
    if (y >= 3 || h >= 3) {
      end(y >= 3, y >= 3 ? `Tu gagnes ${y} à ${h} !` : `J'ai gagné ${h} à ${y}.`);
      return;
    }
    setLast(null);
    setLock(false);
  }
  return (
    <div>
      <p className="gm__score">Toi : <b>{you}</b> · Moi : <b>{him}</b></p>
      <div className="gm__pair gm__pair--rps">
        <div className="numcard">{last ? RPS[last[0]].node : "?"}</div>
        <div className="numcard">{last ? RPS[last[1]].node : "?"}</div>
      </div>
      <div className="gm__btns">
        {RPS.map((r, i) => (
          <button key={r.name} type="button" className="btn btn--soft btn--big gm__pick" disabled={lock} onClick={() => void play(i)} aria-label={r.name}>{r.node}</button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ 9. Compte les ballons

function Count({ speak, end, alive, sleep, lv }: P) {
  const [round, setRound] = useState(0);
  const span = ([[1, 6], [2, 9], [5, 12]] as const)[lv];
  const draw = () => span[0] + rnd(span[1] - span[0] + 1);
  const [n, setN] = useState(draw);
  const [opts, setOpts] = useState<number[]>([]);
  const [good, setGood] = useState(0);
  const [lock, setLock] = useState(false);
  const total = 5;
  const mk = (k: number) => {
    const s = new Set<number>([k]);
    const d = lv === 2 ? 1 : 2;
    while (s.size < 3) s.add(Math.max(1, Math.min(14, k + rnd(2 * d + 1) - d)));
    return shuffle([...s]);
  };
  useEffect(() => {
    setOpts(mk(n));
    speak("Compte les ballons avec moi, puis touche le bon nombre !");
    void sleep(2400).then(() => { if (alive()) void countAloud(n); });
  }, []);
  async function countAloud(k: number) {
    for (let i = 1; i <= k && alive(); i += 1) {
      speak(words(i));
      await sleep(620);
    }
  }
  async function answer(v: number) {
    if (lock) return;
    setLock(true);
    const ok = v === n;
    const g = good + (ok ? 1 : 0);
    setGood(g);
    speak(ok ? `Oui ! Il y a ${words(n)} ballons. Bravo !` : `Non, il y avait ${words(n)} ballons.`);
    await sleep(2200);
    if (!alive()) return;
    if (round + 1 >= total) {
      end(g >= 4, `Tu as compté juste ${g} fois sur ${total} !`);
      return;
    }
    const k = draw();
    setRound(round + 1);
    setN(k);
    setOpts(mk(k));
    setLock(false);
    speak("Combien de ballons ? Compte bien !");
  }
  return (
    <div>
      <p className="gm__score">Bonnes réponses : <b>{good}</b> · Question {round + 1} sur {total}</p>
      <div className="balls" aria-label={`${n} ballons`}>
        {Array.from({ length: n }, (_, i) => <span key={i} className="balls__b" style={{ animationDelay: `${i * 70}ms` }}><Ball size={42} /></span>)}
      </div>
      <div className="gm__btns">
        {opts.map((v) => <button key={v} type="button" className="btn btn--gold btn--big gm__bignum" disabled={lock} onClick={() => void answer(v)}>{v}</button>)}
        <button type="button" className="btn btn--soft" onClick={() => void countAloud(n)}><LuVolume2 aria-hidden="true" /> Compter avec moi</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ 10. L'intrus

function Odd({ speak, end, alive, sleep, lv }: P) {
  const cells = [6, 9, 16][lv];
  const mkRound = () => {
    const base = KITS[rnd(KITS.length)];
    let other = KITS[rnd(KITS.length)];
    while (other === base) other = KITS[rnd(KITS.length)];
    return { base, other, at: rnd(cells) };
  };
  const [round, setRound] = useState(0);
  const [r, setR] = useState(mkRound);
  const [good, setGood] = useState(0);
  const [lock, setLock] = useState(false);
  const total = 5;
  useEffect(() => {
    speak("Trouve l'intrus ! Un seul maillot est différent des autres. Touche-le !");
  }, []);
  async function pick(i: number) {
    if (lock) return;
    setLock(true);
    const ok = i === r.at;
    const g = good + (ok ? 1 : 0);
    setGood(g);
    speak(ok ? "Bravo, tu l'as trouvé !" : "Ce n'est pas celui-là. Regarde, c'est celui qui brille.");
    await sleep(1800);
    if (!alive()) return;
    if (round + 1 >= total) {
      end(g >= 4, `Tu as trouvé ${g} intrus sur ${total}.`);
      return;
    }
    setRound(round + 1);
    setR(mkRound());
    setLock(false);
    speak("Un autre ! Où est l'intrus ?");
  }
  return (
    <div>
      <p className="gm__score">Trouvés : <b>{good}</b> · Question {round + 1} sur {total}</p>
      <div className={cx("gm__grid", cells > 9 ? "gm__grid--4" : "gm__grid--3")}>
        {Array.from({ length: cells }, (_, i) => {
          const k = i === r.at ? r.other : r.base;
          return (
            <button key={i} type="button" className={cx("gm__cell", lock && i === r.at && "gm__cell--glow")} onClick={() => void pick(i)} aria-label="Maillot">
              <Shirt color={k.c} stripe={k.s} pat={k.p} size={cells > 9 ? 50 : 64} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ the list and the frame

type Game = { id: string; name: string; text: string; rule: string; icon: typeof LuStar; Comp: (p: P) => any };
const GAMES: Game[] = [
  { id: "memo", name: "Mémo des maillots", text: "Trouve les paires, à tour de rôle", rule: "Retrouve les deux maillots pareils. On joue chacun son tour.", icon: LuLayers, Comp: Memo },
  { id: "penalty", name: "Penalty", text: "Tireur et gardien", rule: "Tu tires, puis tu es gardien. Devine où va le ballon !", icon: LuPlay, Comp: Penalty },
  { id: "pm", name: "Plus ou moins", text: "La prochaine carte est plus grande ?", rule: "Devine si la prochaine carte est plus grande ou plus petite.", icon: LuStar, Comp: HighLow },
  { id: "bataille", name: "La bataille", text: "Le plus grand nombre gagne", rule: "On retourne une carte chacun. Le plus grand gagne.", icon: LuGem, Comp: War },
  { id: "morpion", name: "Morpion du foot", text: "Trois ballons alignés", rule: "Aligne trois ballons avant mes coupes.", icon: LuX, Comp: Morpion },
  { id: "gobelets", name: "Où est le ballon ?", text: "Suis le ballon des yeux", rule: "Suis le gobelet qui cache le ballon.", icon: LuCircleCheck, Comp: Cups },
  { id: "mystere", name: "Le nombre mystère", text: "Trouve mon nombre secret", rule: "Trouve mon nombre secret. Je te dis plus grand ou plus petit.", icon: LuRotateCcw, Comp: Mystery },
  { id: "pfc", name: "Gant, ballon, sifflet", text: "Pierre-feuille-ciseaux du foot", rule: "Le gant bat le ballon, le ballon bat le sifflet, le sifflet bat le gant.", icon: LuTrophy, Comp: Rps },
  { id: "compte", name: "Compte les ballons", text: "Un, deux, trois…", rule: "Compte les ballons et touche le bon nombre.", icon: LuVolume2, Comp: Count },
  { id: "intrus", name: "L'intrus", text: "Un maillot est différent", rule: "Un seul maillot est différent. Trouve-le !", icon: LuLayers, Comp: Odd },
];

export function Jeux() {
  const s = useStore();
  const [game, setGame] = useState<Game | null>(null);
  const [lv, setLv] = useLv();
  return (
    <div className="jeux">
      <PageTitle kicker="On joue ensemble" title="Les jeux">
        <p>Dix petits jeux où le personnage joue avec toi et parle à voix haute. Gagne-en un chaque jour : 3 étoiles par jeu !</p>
      </PageTitle>
      {game ? (
        <GameFrame key={game.id} game={game} onExit={() => setGame(null)} lv={lv} setLv={setLv} />
      ) : (
        <>
        <div className="lvbar"><span>Difficulté :</span><LvChips lv={lv} onPick={setLv} /></div>
        <ul className="gamelist">
          {GAMES.map((g) => {
            const Icon = g.icon;
            return (
              <li key={g.id}>
                <button type="button" className="gamecard" onClick={() => setGame(g)}>
                  <span className="gamecard__icon"><Icon aria-hidden="true" /></span>
                  <strong>{g.name}</strong>
                  <em>{g.text}</em>
                  {s.gamesDay[g.id] ? <span className="gamecard__done" title="Déjà gagné aujourd'hui"><LuCircleCheck aria-hidden="true" /></span> : null}
                </button>
              </li>
            );
          })}
        </ul>
        </>
      )}
    </div>
  );
}

function GameFrame({ game, onExit, lv, setLv }: { game: Game; onExit: () => void; lv: Lv; setLv: (v: Lv) => void }) {
  const m = useMascot();
  const perso = PERSOS[m.s.perso];
  const [msg, setMsg] = useState("");
  const [over, setOver] = useState<{ win: boolean; text: string; stars: number } | null>(null);
  const [run, setRun] = useState(0);
  const mounted = useRef(true);
  const version = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopTalking();
    };
  }, []);
  version.current = run;
  const my = run;
  const alive = () => mounted.current && version.current === my;
  const speak = (t: string) => {
    if (!alive()) return;
    setMsg(t);
    sayLabel(t);
  };
  const sleep = (ms: number) => new Promise<void>((res) => window.setTimeout(res, ms));
  const end = (win: boolean, text: string) => {
    // the Square Referee, if he happens to be around, does not like a lost game
    if (!win) faute("perdu");
    // a win: everybody on the screen does the Mexican wave
    else emit("goal");
    if (!alive()) return;
    const stars = gameReward(game.id, win);
    setOver({ win, text, stars });
    const full = `${win ? "Bravo ! " : ""}${text}${stars ? ` Tu gagnes ${stars} étoiles !` : ""}`;
    setMsg(full);
    // his recorded « victoire ! » or « oh non… », exactly now; otherwise he says it
    if (!playFx(perso.mode, win ? "victoire" : "defaite")) sayLabel(full);
  };
  const Comp = game.Comp;
  return (
    <div className="gm">
      <div className="gm__head">
        <button type="button" className="btn btn--soft" onClick={onExit}><LuArrowLeft aria-hidden="true" /> Les jeux</button>
        <button type="button" className="btn btn--soft" onClick={() => speak(game.rule)}><LuVolume2 aria-hidden="true" /> Écouter la règle</button>
      </div>
      <div className="gm__host">
        <Fig look={m.s.look} size={74} crop="bust" mouth={perso.mouth} talk={m.talking} mode={perso.mode} />
        <p className="gm__say" role="status">{msg || game.rule}</p>
      </div>
      <h2 className="gm__title">{game.name}</h2>
      <LvChips lv={lv} onPick={(v) => { if (v === lv) return; stopTalking(); setLv(v); setOver(null); setMsg(""); setRun(run + 1); }} />
      <div className="gm__board">
        <Comp key={run} speak={speak} end={end} alive={alive} sleep={sleep} lv={lv} />
      </div>
      {over ? (
        <div className={cx("gm__over", over.win && "gm__over--win")} role="status">
          <strong>{over.win ? "Victoire !" : "Fin de la partie"}</strong>
          <p>{over.text}</p>
          {over.stars ? <p className="gm__stars"><LuStar aria-hidden="true" /> +{over.stars} étoiles</p> : null}
          <div className="gm__btns">
            <button type="button" className="btn btn--gold" onClick={() => { stopTalking(); setOver(null); setMsg(""); setRun(run + 1); }}><LuRotateCcw aria-hidden="true" /> Rejouer</button>
            <button type="button" className="btn btn--soft" onClick={onExit}>Autres jeux</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
