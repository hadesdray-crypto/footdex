// The character's memory (look, character, voice speed, place on screen), its voice and its bubble.
import { useSyncExternalStore } from "react";
import { babble as babbleSound, robot as robotSound } from "../sound";
import { piperWav } from "../piper";
import { appeler, moduleDisponible } from "../natif";
import { storageGet, storageSet } from "../util";
import { PAGES, PERSOS, pick, type Kind } from "./lines";
import { DEFAULT_LOOK, sanitizeLook, type Look } from "./look";
import { CARAC } from "./caractere";

const KEY = "footdex.mascotte.v1";
export const SPEEDS = [
  { label: "Lent", factor: 0.78 },
  { label: "Normal", factor: 1 },
  { label: "Rapide", factor: 1.3 },
];

export type Engine = "native" | "phone" | "piper" | "robot" | "babble";
/** Inside the Android app (APK): the phone's own speech engine, through Capacitor. Works with no internet. */
export const isApp = () => moduleDisponible("TextToSpeech");
export const ENGINES_ALL: { id: Engine; name: string; text: string }[] = [
  { id: "native", name: "Voix d'Android", text: "La vraie voix française du téléphone, dans l'appli installée. Marche sans connexion." },
  { id: "phone", name: "Voix du téléphone", text: "La voix française installée dans le téléphone. Marche sans connexion." },
  { id: "piper", name: "Belle voix (Piper)", text: "Une vraie voix française, très naturelle. Se télécharge une seule fois (60 Mo), puis marche sans connexion." },
  { id: "robot", name: "Voix robot intégrée", text: "Fabriquée par l'application elle-même : sans internet, sans rien installer. Un peu robotique." },
  { id: "babble", name: "Voix rigolote", text: "Seulement des bruits drôles, sans mots." },
];
/** The ways that exist here: the Android voice only in the app; in the app, the browser voice is the same engine, so it is not shown twice. */
export const ENGINES = ENGINES_ALL.filter((e) => (isApp() ? e.id !== "phone" : e.id !== "native"));
export type Settings = { look: Look; perso: number; speed: number; auto: boolean; engine: "auto" | Engine; heard: Partial<Record<Engine, boolean>>; piper: boolean; looks: Record<string, Look>; rest: boolean; narrate: boolean; fx: number; fy: number; day: string };
export type Bubble = { id: number; text: string; top: boolean } | null;
type Snap = { reading: boolean; s: Settings; eng: Partial<Record<Engine, "ok" | "ko">>; using: Engine | null; bubble: Bubble; talking: boolean; busy: boolean; anim: string | null; animId: number; vx: number; vy: number; hurt: number };

function loadSettings(): Settings {
  const d: Settings = { look: DEFAULT_LOOK, perso: 0, speed: 1, auto: true, engine: "auto", heard: {}, piper: false, looks: {}, rest: false, narrate: false, fx: 1, fy: 1, day: "" };
  try {
    const raw = JSON.parse(storageGet(KEY) ?? "null") as Partial<Settings> | null;
    if (!raw) return d;
    const num = (v: unknown, lo: number, hi: number, def: number) => (typeof v === "number" && v >= lo && v <= hi ? v : def);
    const perso = Math.floor(num(raw.perso, 0, PERSOS.length - 1, 0));
    const look = sanitizeLook(raw.look);
    // Each character keeps his own outfit. The outfit chosen before this version stays with the current character.
    const looks: Record<string, Look> = {};
    if (raw.looks && typeof raw.looks === "object") for (const [k, v] of Object.entries(raw.looks)) if (k in CARAC) looks[k] = sanitizeLook(v);
    if (!looks[PERSOS[perso].mode]) looks[PERSOS[perso].mode] = look;
    return {
      look,
      perso,
      looks,
      rest: raw.rest === true,
      speed: Math.floor(num(raw.speed, 0, SPEEDS.length - 1, 1)),
      auto: raw.auto !== false,
      engine: raw.engine === "native" || raw.engine === "phone" || raw.engine === "piper" || raw.engine === "robot" || raw.engine === "babble" ? raw.engine : "auto",
      heard: raw.heard && typeof raw.heard === "object" ? raw.heard : {},
      piper: raw.piper === true,
      narrate: raw.narrate === true,
      fx: num(raw.fx, 0, 1, 1),
      fy: num(raw.fy, 0, 1, 1),
      day: typeof raw.day === "string" ? raw.day : "",
    };
  } catch {
    return d;
  }
}

let snap: Snap = { reading: false, s: loadSettings(), eng: {}, using: null, bubble: null, talking: false, busy: false, anim: null, animId: 0, vx: 0, vy: 0, hurt: 0 };
const listeners = new Set<() => void>();
function set(patch: Partial<Snap>) {
  snap = { ...snap, ...patch };
  for (const fn of listeners) fn();
}
export function useMascot(): Snap {
  return useSyncExternalStore(
    (fn: () => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => snap,
  );
}
export function getMascot(): Snap {
  return snap;
}

/** Chooses a character: he comes with his own outfit, his own voice and his own way of talking. */
export function choosePerso(i: number) {
  const mode = PERSOS[i].mode;
  update({ perso: i, look: snap.s.looks[mode] ?? CARAC[mode].tenue, rest: false });
}
/** The outfit he wears right now: while reading, he adds his reading gear (glasses, notebook…). */
export function wornLook(): Look {
  const look = snap.s.look;
  if (!snap.reading) return look;
  const add = CARAC[PERSOS[snap.s.perso].mode].readAcc.filter((a) => !look.acc.includes(a));
  return add.length ? { ...look, acc: [...look.acc, ...add] } : look;
}
let readWatch = 0;
function reading() {
  set({ reading: true });
  window.clearInterval(readWatch);
  let calm = 0;
  readWatch = window.setInterval(() => {
    calm = !snap.talking && !snap.bubble ? calm + 1 : 0;
    if (calm >= 2) {
      window.clearInterval(readWatch);
      set({ reading: false });
    }
  }, 700);
}

export function update(patch: Partial<Settings>) {
  if (patch.look) {
    const mode = PERSOS[patch.perso ?? snap.s.perso].mode;
    patch = { ...patch, looks: { ...snap.s.looks, ...patch.looks, [mode]: patch.look } };
  }
  const s = { ...snap.s, ...patch };
  storageSet(KEY, JSON.stringify(s));
  set({ s });
}

// ------------------------------------------------------------------ voice

const hasVoice = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
export const voiceAvailable = hasVoice;
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", () => undefined);
  } catch {
    /* the voices will load on the first use */
  }
}
let talkTimer = 0;
let hideTimer = 0;
let bubbleId = 0;

const FEMALE = /am[ée]lie|marie|julie|audrey|aur[ée]lie|c[ée]line|hortense|denise|eloise|brigitte|l[ée]a\b|sylvie|female|femme|virginie|thérèse|paulina|nathalie/i;
const MALE = /thomas|paul\b|henri|antoine|claude|r[ée]my|jean|male\b|homme|guillaume|nicolas|mathieu|louis|maxime|bernard|daniel/i;
const QUALITY = /natural|neural|premium|enhanced|google|online|siri/i;

/** The French voice that suits this character. With a connection, the nicest network voices first; without, the voices stored in the phone. */
function frenchVoice(): SpeechSynthesisVoice | undefined {
  try {
    const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("fr"));
    if (!all.length) return undefined;
    const p = PERSOS[snap.s.perso].voice;
    const online = navigator.onLine !== false;
    const score = (v: SpeechSynthesisVoice) => {
      let n = v.lang.toLowerCase() === "fr-fr" ? 1 : 0;
      if (online) n += (!v.localService ? 2 : 0) + (QUALITY.test(v.name) ? 3 : 0);
      else n += v.localService ? 5 : -5;
      return n;
    };
    const sorted = [...all].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
    const top = sorted.filter((v) => score(v) >= score(sorted[0]) - 1);
    const pool = top.length > 1 ? top : sorted;
    const wanted = p.gender === "f" ? FEMALE : p.gender === "m" ? MALE : null;
    const match = wanted ? pool.filter((v) => wanted.test(v.name)) : [];
    const list = match.length ? match : wanted ? pool.filter((v) => !(p.gender === "m" ? FEMALE : MALE).test(v.name)) : pool;
    const use = list.length ? list : pool;
    return use[p.slot % use.length];
  } catch {
    return undefined;
  }
}

/** True when the phone lists no French voice at all (the viewer inside the Claude app, for example). */
function noFrenchVoice(): boolean {
  try {
    const all = window.speechSynthesis.getVoices();
    return all.length === 0 || !all.some((v) => v.lang.toLowerCase().startsWith("fr"));
  } catch {
    return true;
  }
}

let babbleStop: (() => void) | null = null;
let audioEl: HTMLAudioElement | null = null;
let speakTimer = 0;
let wake = 0;

export function stopTalking() {
  window.clearTimeout(talkTimer);
  window.clearTimeout(speakTimer);
  wake += 1;
  babbleStop?.();
  babbleStop = null;
  if (audioEl) {
    try {
      audioEl.pause();
      audioEl.removeAttribute("src");
    } catch {
      /* nothing to stop */
    }
    audioEl = null;
  }
  if (isApp()) appeler("TextToSpeech", "stop").catch(() => undefined);
  try {
    if (hasVoice()) window.speechSynthesis.cancel();
  } catch {
    /* nothing to stop */
  }
  if (snap.talking) set({ talking: false });
}

function mouthFor(text: string) {
  window.clearTimeout(talkTimer);
  set({ talking: true });
  talkTimer = window.setTimeout(() => set({ talking: false }), Math.min(9000, 700 + text.length * 62));
}

/** Cuts a long text in pieces of about 170 characters, at the end of sentences. */
function pieces(text: string): string[] {
  const out: string[] = [];
  for (const sentence of text.match(/[^.!?]+[.!?]*/g) ?? [text]) {
    const last = out[out.length - 1];
    if (last && last.length + sentence.length < 170) out[out.length - 1] = last + sentence;
    else out.push(sentence);
  }
  return out.map((x) => x.trim()).filter(Boolean);
}

function mark(e: Engine, v: "ok" | "ko") {
  if (snap.eng[e] === v && (v === "ko" || snap.using === e)) return;
  set({ eng: { ...snap.eng, [e]: v }, using: v === "ok" ? e : snap.using });
}

/** One way of speaking. `done` when the text is finished, `fail` when this way does not work (the next one can take over). */
function runEngine(e: Engine, text: string, my: number, done: () => void, fail: () => void) {
  const p = PERSOS[snap.s.perso];
  const rate = Math.max(0.5, Math.min(2, p.rate * SPEEDS[snap.s.speed].factor));
  const alive = () => my === wake;
  if (e === "robot" || e === "babble") {
    const r = (e === "robot" ? robotSound : babbleSound)(text, p.pitch, rate, p.voice.formant, p.voice.vib);
    if (!r) {
      mark(e, "ko");
      return fail();
    }
    mark(e, "ok");
    babbleStop = r.stop;
    window.clearTimeout(talkTimer);
    set({ talking: true });
    talkTimer = window.setTimeout(() => {
      set({ talking: false });
      if (alive()) done();
    }, r.ms);
    return;
  }
  if (e === "piper") {
    if (!snap.s.piper || typeof Audio === "undefined") {
      mark(e, "ko");
      return fail();
    }
    const parts = pieces(text);
    const wavs = parts.map((x, k) => (k === 0 ? piperWav(x) : null) as Promise<Blob> | null);
    const get = (k: number) => (wavs[k] ??= piperWav(parts[k]));
    let i = 0;
    let started = false;
    const bad = () => {
      if (!alive()) return;
      if (started) {
        window.clearTimeout(talkTimer);
        set({ talking: false });
        return done();
      }
      mark(e, "ko");
      fail();
    };
    window.clearTimeout(talkTimer);
    // the first sentence can take a few seconds to make on an old phone
    talkTimer = window.setTimeout(() => {
      if (!started) bad();
    }, 12000);
    const playNext = () => {
      if (!alive()) return;
      if (i >= parts.length) {
        window.clearTimeout(talkTimer);
        set({ talking: false });
        return done();
      }
      get(i)
        .then((blob) => {
          if (!alive()) return;
          if (i + 1 < parts.length) void get(i + 1).catch(() => undefined);
          const url = URL.createObjectURL(blob);
          const a = new Audio(url);
          audioEl = a;
          a.preservesPitch = false;
          a.playbackRate = Math.max(0.6, Math.min(1.7, rate * (0.88 + 0.12 * p.pitch)));
          a.onplaying = () => {
            started = true;
            window.clearTimeout(talkTimer);
            mark(e, "ok");
            set({ talking: true });
          };
          a.onended = () => {
            URL.revokeObjectURL(url);
            i += 1;
            playNext();
          };
          a.onerror = bad;
          a.play().catch(bad);
        })
        .catch(bad);
    };
    playNext();
    return;
  }
  if (e === "native") {
    if (!isApp()) {
      mark(e, "ko");
      return fail();
    }
    window.clearTimeout(talkTimer);
    set({ talking: true });
    mark(e, "ok");
    appeler("TextToSpeech", "stop")
      .catch(() => undefined)
      .then(() => {
        if (!alive()) return;
        return appeler("TextToSpeech", "speak", { text, lang: "fr-FR", rate, pitch: p.pitch, volume: 1, category: "playback" });
      })
      .then(
        () => {
          if (!alive()) return;
          set({ talking: false });
          done();
        },
        () => {
          if (!alive()) return;
          set({ talking: false });
          mark(e, "ko");
          fail();
        },
      );
    return;
  }
  // the phone's own voice
  if (!hasVoice() || noFrenchVoice()) {
    mark(e, "ko");
    return fail();
  }
  const attempt = (pickVoice: boolean) => {
    speakTimer = window.setTimeout(() => {
      if (!alive()) return;
      try {
        let started = false;
        let over = false;
        const parts = pieces(text);
        const bad = () => {
          if (over || !alive()) return;
          over = true;
          try {
            window.speechSynthesis.cancel();
          } catch {
            /* ignore */
          }
          if (pickVoice) attempt(false);
          else {
            mark(e, "ko");
            fail();
          }
        };
        window.speechSynthesis.resume();
        parts.forEach((part, k) => {
          const u = new SpeechSynthesisUtterance(part);
          u.lang = "fr-FR";
          const v = pickVoice ? frenchVoice() : undefined;
          if (v) u.voice = v;
          u.pitch = p.pitch;
          u.rate = rate;
          u.volume = 1;
          u.onstart = () => {
            started = true;
            window.clearTimeout(talkTimer);
            mark(e, "ok");
            set({ talking: true });
          };
          u.onend = u.onerror = () => {
            if (!alive() || over) return;
            if (!started) return bad();
            if (k === parts.length - 1) {
              over = true;
              window.clearTimeout(talkTimer);
              set({ talking: false });
              done();
            }
          };
          window.speechSynthesis.speak(u);
        });
        window.clearTimeout(talkTimer);
        talkTimer = window.setTimeout(() => {
          if (!started) bad();
        }, pickVoice ? 2200 : 2600);
      } catch {
        mark(e, "ko");
        fail();
      }
    }, 90);
  };
  attempt(true);
}

const ALL: Engine[] = ["native", "phone", "piper", "robot", "babble"];

/** Inside a frame (the Claude preview): the phone voice and the online voice are usually blocked there,
 * so the robot voice, made by the app itself, comes first and is heard at once instead of after 9 seconds of silence. */
function framed(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** In automatic mode: the ways you said you heard first, then the best one still untested, down to the last resort. */
function order(): Engine[] {
  const h = snap.s.heard;
  const base: Engine[] = isApp() ? ["native", "piper", "robot", "babble"] : framed() ? ["piper", "robot", "phone", "babble"] : ALL;
  const yes = base.filter((e) => h[e] === true);
  const rest = base.filter((e) => h[e] !== true && h[e] !== false && snap.eng[e] !== "ko" && (e !== "piper" || snap.s.piper));
  const list = [...yes, ...rest];
  return list.length ? list : ["robot", "babble"];
}

/** Speaks a text and moves the mouth, in the way chosen in the settings; in automatic mode, the next way takes over when one fails. */
function voice(text: string, onEnd?: () => void) {
  stopTalking();
  if (!snap.s.auto) {
    mouthFor(text);
    return;
  }
  const list = snap.s.engine === "auto" ? order() : [snap.s.engine];
  const my = wake;
  let idx = 0;
  const next = () => {
    if (my !== wake) return;
    const e = list[idx];
    idx += 1;
    if (!e) {
      mouthFor(text);
      onEnd?.();
      return;
    }
    runEngine(e, text, my, () => onEnd?.(), next);
  };
  next();
}

/** Tries one way of speaking with a short sentence: `result` says whether it started (not whether you hear it: only you know). */
export function testEngine(e: Engine, result: (ok: boolean) => void) {
  stopTalking();
  const my = wake;
  set({ eng: { ...snap.eng, [e]: undefined } });
  runEngine(e, "Bonjour, tu m'entends ? Je suis ton ami du football !", my, () => undefined, () => result(false));
  // The way has started if it is marked ok shortly after.
  const check = (n: number) => {
    if (my !== wake) return;
    if (snap.eng[e] === "ok") return result(true);
    if (snap.eng[e] === "ko") return;
    if (n < 40) window.setTimeout(() => check(n + 1), 150);
    else result(false);
  };
  check(0);
}

/** Wakes the phone's voice at the first touch (some phones keep it asleep until then), and loads the list of voices. */
export function warmVoice() {
  if (!hasVoice()) return;
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    const wakeIt = () => {
      document.removeEventListener("pointerdown", wakeIt, true);
      try {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0;
        u.lang = "fr-FR";
        window.speechSynthesis.speak(u);
      } catch {
        /* nothing to wake */
      }
    };
    document.addEventListener("pointerdown", wakeIt, true);
  } catch {
    /* nothing to wake */
  }
}

// ------------------------------------------------------------------ bubble

export function hideBubble() {
  window.clearTimeout(hideTimer);
  stopTalking();
  set({ bubble: null });
}

/** Shows a bubble and speaks it. `top` shows it at the top of the screen (during a pack opening). */
export function say(text: string, opts: { top?: boolean; quiet?: boolean; keepQueue?: boolean } = {}) {
  if (!opts.keepQueue) queue = [];
  window.clearTimeout(hideTimer);
  bubbleId += 1;
  set({ bubble: { id: bubbleId, text, top: !!opts.top } });
  if (!opts.quiet) voice(text);
  const wait = Math.max(4200, text.length * 70);
  hideTimer = window.setTimeout(() => {
    if (snap.talking) hideTimer = window.setTimeout(hideBubble, 1500);
    else set({ bubble: null });
  }, wait);
}

export function play(anim: string, ms: number, vx = 0, vy = 0) {
  const id = snap.animId + 1;
  set({ anim, animId: id, vx, vy });
  window.setTimeout(() => {
    if (snap.animId === id) set({ anim: null });
  }, ms);
}

// ------------------------------------------------------------------ what it says

const P = () => PERSOS[snap.s.perso];
let queue: string[] = [];
const sentencesOf = (t: string) => (t.match(/[^.!?]+[.!?]+/g) ?? [t]).map((x) => x.trim()).filter(Boolean);
const chunk = (parts: string[]) =>
  parts.reduce<string[]>((acc, x) => {
    const last = acc[acc.length - 1];
    if (last && last.length < 110) acc[acc.length - 1] = `${last} ${x}`;
    else acc.push(x);
    return acc;
  }, []);
/** Says a text a few sentences at a time; a double tap on the character gives the next ones. */
function sayInParts(intro: string, text: string, extra: string[] = []) {
  const parts = sentencesOf(text);
  const first = parts.splice(0, 2).join(" ");
  say(`${intro}${first}`.trim());
  queue = [...chunk(parts), ...extra];
}
export function hasMore() {
  return queue.length > 0;
}
/** Double tap: goes on with what he was telling. */
export function continueSpeech() {
  const next = queue.shift();
  const rest = queue;
  if (next === undefined) return say(pick(P().done));
  say(P().mode === "excite" && rest.length ? next + pick(P().more) : next, { keepQueue: true });
  queue = rest;
}
/** Reads out the name of something the finger just touched (assistance mode). */
export function sayLabel(text: string) {
  if (!snap.s.auto) return;
  voice(text);
}


export function greet() {
  if (P().greet.length) say(pick(P().greet));
}
export function explain(page: string) {
  const text = PAGES[page] ?? PAGES.accueil;
  const p = P();
  reading();
  if (p.mode === "statue") return say(sentencesOf(text)[0]);
  if (p.mode === "joueur") return say(pick(p.open) + sentencesOf(text)[0]);
  if (p.mode === "excite") {
    say(pick(p.ask));
    queue = chunk(sentencesOf(text));
    return;
  }
  sayInParts(pick(p.open), text, p.mode === "pointu" ? [pick(p.extra)] : []);
}
type MatchLike = { title: string; competition: string; summary: string; story: string };
/** The excited one: asks first, tells only if the child says yes (a double tap). */
export function askToTell(matches: MatchLike[]) {
  if (!matches.length || P().mode !== "excite") return;
  const m = pick(matches);
  say(pick(P().ask));
  queue = chunk(sentencesOf(`${m.title}, ${m.competition}. ${m.summary} ${m.story}`.replace(/\s+/g, " ")).slice(0, 8));
}
export function tellStory(matches: MatchLike[]) {
  if (!matches.length) return say("Je n'ai pas d'histoire sous la main pour l'instant.");
  if (P().mode === "excite") return askToTell(matches);
  const m = pick(matches);
  reading();
  const sentences = m.story.match(/[^.!?]+[.!?]+/g) ?? [m.story];
  let tale = "";
  for (const s of sentences) {
    if ((tale + s).length > 330) break;
    tale += s;
  }
  say(`${pick(P().story)} ${m.title}, ${m.competition}. ${m.summary} ${tale.trim()}`.replace(/\s+/g, " "));
}
export function readPage() {
  const main = document.getElementById("contenu");
  const text = (main?.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 1600);
  if (!text) return say("Il n'y a rien à lire ici.");
  if (!snap.s.auto) return say("Ma voix est coupée. Remets-la dans les réglages.", { quiet: true });
  reading();
  window.clearTimeout(hideTimer);
  bubbleId += 1;
  set({ bubble: { id: bubbleId, text: "Je lis la page… (touche pour m'arrêter)", top: false } });
  voice(text, () => set({ bubble: null }));
}
export function sample() {
  say(P().sample);
}
export function onCard(info: { name: string; rarity: string; shiny: boolean }) {
  const kind: Kind = info.shiny ? "shiny" : (["base", "rare", "eclat", "legende", "moment"].includes(info.rarity) ? (info.rarity as Kind) : "base");
  const lines = P().card[kind];
  if (!lines.length) return;
  const high = kind !== "base" && kind !== "rare";
  const chance = P().mode === "poli" ? (high ? 1 : 0) : kind === "base" ? 0.35 : kind === "rare" ? 0.7 : 1;
  if (Math.random() > chance) return;
  const more = P().mode === "pointu" && kind !== "base" ? ` ${P().extra[1] ?? ""}` : "";
  say(pick(lines).replace("{n}", info.name) + more, { top: true });
  if (P().mode === "joueur") {
    // The more beautiful the card, the bigger his reaction: a small wave, arms up, a jump, then on his knees.
    if (kind === "base") play("wave", 2400);
    else if (kind === "rare") play("cheer", 2600);
    else if (kind === "eclat") play("jump", 2200);
    else play("pray", 5200);
    return;
  }
  if (kind !== "base" && kind !== "rare") play("cheer", 2600);
}
export function onShake() {
  play("shake", 1300);
  say(pick(P().shake));
}
export function onThrown(strong = false) {
  say(pick(P().thrown));
  set({ hurt: strong ? 2 : 1 });
  window.setTimeout(() => set({ hurt: 0 }), 9000);
}
export function onWardrobe() {
  say(pick(P().wardrobe));
}
export function setBusy(busy: boolean) {
  if (snap.busy === busy) return;
  set({ busy });
  if (busy) hideBubble();
}
