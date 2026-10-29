// The character's memory (look, character, voice speed, place on screen), its voice and its bubble.
import { useSyncExternalStore } from "react";
import { babble as babbleSound, robot as robotSound } from "../sound";
import { piperWav } from "../piper";
import { appeler, moduleDisponible } from "../natif";
import { storageGet, storageSet } from "../util";
import { AFTER_2000, IDOLS, IDOL_LINES, LORE, LORE_HINTS, OLD_STORIES, OUPS, OUPS_BACK, PAGES, PERSOS, pick, type Kind, type Mode } from "./lines";
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
/** The kind of voice, for every character: a boy's voice by default (Footdex is Raphaël's). */
export type VoiceType = "garcon" | "homme" | "grave" | "perso";
export const VOICE_TYPES: { id: VoiceType; label: string; pitch: number }[] = [
  { id: "garcon", label: "Garçon", pitch: 1.28 },
  { id: "homme", label: "Homme", pitch: 0.95 },
  { id: "grave", label: "Grave", pitch: 0.78 },
  { id: "perso", label: "Celle du personnage", pitch: 0 },
];
/** The voice of one character: which way of speaking, which exact voice, how high. */
/** A funny way of speaking, on top of the voice: higher, slower, a robot, gibberish, stuttering… */
export type Fun = "" | "souris" | "geant" | "escargot" | "fusee" | "robot" | "charabia" | "begaie" | "echo" | "grrr";
export const FUNS: { id: Fun; label: string; icon: string }[] = [
  { id: "", label: "Normale", icon: "🙂" },
  { id: "souris", label: "Souris", icon: "🐭" },
  { id: "geant", label: "Géant", icon: "🦣" },
  { id: "escargot", label: "Escargot", icon: "🐌" },
  { id: "fusee", label: "Fusée", icon: "🚀" },
  { id: "robot", label: "Robot", icon: "🤖" },
  { id: "charabia", label: "Charabia", icon: "🗯️" },
  { id: "begaie", label: "Il bé-bégaie", icon: "😬" },
  { id: "echo", label: "Écho", icon: "🏔️" },
  { id: "grrr", label: "Grrr", icon: "😾" },
];
export type PVoice = { engine: "auto" | Engine; native: number; phone: string; pitch: number; fun?: Fun };
/** Who has a voice: the six characters, and the two visitors of the pitch. */
export type VoiceKey = Mode | "medecin" | "arbitre";

/** Friends on the screen next to the character: the other characters, and the Doctor. */
export type Buddy = Mode | "medecin";
export const BUDDIES: Buddy[] = ["statue", "excite", "poli", "joueur", "pointu", "zombie", "medecin"];
/** The Doctor as a character of his own (front view). */
export const DOCTOR_LOOK: Look = { body: 2, skin: 3, hair: 3, hairColor: 4, outfit: 10, acc: ["glasses", "stetho"] };

/** What each character may do (changed by the parents), and how the Doctor and the Referee behave. */
export type PersoInter = { talk: 0 | 1 | 2 | 3; wander: boolean; throwable: boolean };
export type Inter = { per: Partial<Record<Mode, PersoInter>>; injuries: boolean; refVisits: boolean; refMood: 0 | 1 | 2; docFast: boolean };
export const INTER_DEFAULT: Inter = { per: {}, injuries: true, refVisits: true, refMood: 1, docFast: false };
export const interOf = (mode: Mode): PersoInter => ({ talk: 2, wander: true, throwable: true, ...(snap.s.inter.per[mode] ?? {}) });
export const inter = () => snap.s.inter;
export function setInterOf(mode: Mode, patch: Partial<PersoInter>) {
  update({ inter: { ...snap.s.inter, per: { ...snap.s.inter.per, [mode]: { ...interOf(mode), ...patch } } } });
}
export function setInter(patch: Partial<Inter>) {
  update({ inter: { ...snap.s.inter, ...patch } });
}
/** A boy's voice by default, each character a little different (Footdex is Raphaël's). */
export const DEFAULT_PITCH: Record<VoiceKey, number> = { statue: 0.74, excite: 1.22, poli: 1.05, joueur: 1.3, pointu: 1.12, zombie: 0.72, medecin: 0.92, arbitre: 0.78 };
export function voiceOf(mode: VoiceKey): PVoice {
  const v = snap.s.pvoice[mode];
  return { engine: v?.engine ?? "auto", native: typeof v?.native === "number" ? v.native : -1, phone: v?.phone ?? "", pitch: typeof v?.pitch === "number" ? Math.max(0.6, Math.min(1.6, v.pitch)) : DEFAULT_PITCH[mode], fun: FUNS.some((f) => f.id === v?.fun) ? v?.fun : "" };
}
/** Sets the voice of one character (only what changes). */
export function setVoiceOf(mode: VoiceKey, patch: Partial<PVoice>) {
  update({ pvoice: { ...snap.s.pvoice, [mode]: { ...voiceOf(mode), ...patch } } });
}
/** For a moment, a voice to try (in the voice picker): used by the next sentence instead of the chosen one. */
let trying: PVoice | null = null;
export type Settings = { look: Look; perso: number; speed: number; auto: boolean; engine: "auto" | Engine; heard: Partial<Record<Engine, boolean>>; piper: boolean; nativeVoice: number; voiceType: VoiceType; pvoice: Partial<Record<VoiceKey, PVoice>>; inter: Inter; bubbles: boolean; buddies: Buddy[]; buddyPos: Record<string, { fx: number; fy: number }>; looks: Record<string, Look>; rest: boolean; narrate: boolean; fx: number; fy: number; day: string };
export type Bubble = { id: number; text: string; top: boolean } | null;
type Snap = { reading: boolean; s: Settings; eng: Partial<Record<Engine, "ok" | "ko">>; using: Engine | null; bubble: Bubble; talking: boolean; busy: boolean; anim: string | null; animId: number; vx: number; vy: number; hurt: number };

function loadSettings(): Settings {
  const d: Settings = { look: DEFAULT_LOOK, perso: 0, speed: 1, auto: true, engine: "auto", heard: {}, piper: false, nativeVoice: -1, voiceType: "garcon", pvoice: {}, inter: INTER_DEFAULT, bubbles: true, buddies: [], buddyPos: {}, looks: {}, rest: false, narrate: false, fx: 1, fy: 1, day: "" };
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
      pvoice: raw.pvoice && typeof raw.pvoice === "object" ? (raw.pvoice as Partial<Record<VoiceKey, PVoice>>) : {},
      inter: raw.inter && typeof raw.inter === "object" ? { ...INTER_DEFAULT, ...raw.inter, per: raw.inter.per && typeof raw.inter.per === "object" ? raw.inter.per : {} } : INTER_DEFAULT,
      voiceType: raw.voiceType === "perso" || raw.voiceType === "homme" || raw.voiceType === "grave" ? raw.voiceType : "garcon",
      nativeVoice: typeof raw.nativeVoice === "number" && raw.nativeVoice >= 0 ? Math.floor(raw.nativeVoice) : -1,
      narrate: raw.narrate === true,
      bubbles: raw.bubbles !== false,
      buddies: Array.isArray(raw.buddies) ? (raw.buddies.filter((b) => BUDDIES.includes(b as Buddy)) as Buddy[]).slice(0, 2) : [],
      buddyPos: raw.buddyPos && typeof raw.buddyPos === "object" ? raw.buddyPos : {},
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
/** While a visitor (doctor, referee) speaks, the character's mouth stays still: it is not him talking. */
let visitorTalking = false;
let nextIsVisitor = false;
function set(patch: Partial<Snap>) {
  if (visitorTalking && patch.talking) patch = { ...patch, talking: false };
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
  // the Papi never goes anywhere without his cane
  const base = snap.s.look;
  const look = PERSOS[snap.s.perso].mode === "statue" && !base.acc.includes("cane") ? { ...base, acc: [...base.acc, "cane"] } : base;
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
const FUN_K: Record<string, { pitch: number; rate: number }> = {
  "": { pitch: 1, rate: 1 },
  souris: { pitch: 1.45, rate: 1.15 },
  geant: { pitch: 0.62, rate: 0.82 },
  escargot: { pitch: 0.95, rate: 0.6 },
  fusee: { pitch: 1.1, rate: 1.7 },
  robot: { pitch: 0.8, rate: 0.9 },
  charabia: { pitch: 1.1, rate: 1.1 },
  begaie: { pitch: 1, rate: 1 },
  echo: { pitch: 1, rate: 0.95 },
  grrr: { pitch: 0.85, rate: 0.95 },
};
/** The funny voices that play with the words themselves. */
function funText(text: string, fun?: Fun): string {
  if (fun === "begaie") {
    let n = 0;
    return text.replace(/\b([bcdfgjklmnpqrstvz])([a-zàâéèêëîïôûù]+)/gi, (w, c: string, rest: string) => (w.length > 3 && (n += 1) % 3 === 1 ? `${c}-${c}-${c}${rest}` : w));
  }
  if (fun === "echo") return text.replace(/([a-zàâéèêëîïôûù]{3,})(\s?[.!?])/gi, "$1… $1… $1$2");
  if (fun === "grrr") return text.replace(/([.!?])(\s|$)/g, (m, a: string, b: string) => (Math.random() < 0.5 ? `${a} Grrr…${b}` : m));
  return text;
}

function runEngine(e: Engine, text: string, my: number, done: () => void, fail: () => void, given?: PVoice) {
  const p = PERSOS[snap.s.perso];
  const rate = Math.max(0.5, Math.min(2, p.rate * SPEEDS[snap.s.speed].factor));
  // A real voice (Android's, the phone's) gets ugly when pushed too high or too fast: only a gentle nudge per character.
  const pv = given ?? voiceOf(p.mode);
  // the pitch chosen for this character (🐭 high … 🐻 low)
  const fk = FUN_K[pv.fun ?? ""] ?? FUN_K[""];
  const softPitch = Math.max(0.5, Math.min(2, pv.pitch * fk.pitch));
  const softRate = Math.max(0.5, Math.min(2, Math.max(0.6, Math.min(1.5, 1 + (p.rate - 1) * 0.45)) * SPEEDS[snap.s.speed].factor * fk.rate));
  const alive = () => my === wake;
  if (e === "robot" || e === "babble") {
    const r = (e === "robot" ? robotSound : babbleSound)(text, pv.pitch * 0.9, softRate, p.voice.formant, p.voice.vib);
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
    // no second « stop » here (stopTalking has just done it): the voice starts at once
    const opts: Record<string, unknown> = { text, lang: "fr-FR", rate: softRate, pitch: softPitch, volume: 1, category: "playback" };
    if (pv.native >= 0) opts.voice = pv.native;
    else if (snap.s.nativeVoice >= 0) opts.voice = snap.s.nativeVoice;
    appeler("TextToSpeech", "speak", opts)
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
          const chosen = pv.phone ? window.speechSynthesis.getVoices().find((x) => x.name === pv.phone) : undefined;
          const v = chosen ?? (pickVoice ? frenchVoice() : undefined);
          if (v) u.voice = v;
          u.pitch = softPitch;
          u.rate = softRate;
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
    }, pickVoice ? 0 : 60);
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
  // the character's own way of speaking first (if one was chosen), then the usual order as a back-up
  const pv = trying ?? voiceOf(PERSOS[snap.s.perso].mode);
  visitorTalking = nextIsVisitor;
  nextIsVisitor = false;
  trying = null;
  const base = snap.s.engine === "auto" ? order() : [snap.s.engine];
  const forced: "auto" | Engine = pv.fun === "robot" ? "robot" : pv.fun === "charabia" ? "babble" : pv.engine;
  const list = forced !== "auto" ? [forced, ...base.filter((e) => e !== forced)] : base;
  text = funText(text, pv.fun);
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
    runEngine(e, text, my, () => onEnd?.(), next, pv);
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
  // the phone's voice (in the app) is woken up with a silent word, so that the first real sentence starts at once
  if (isApp()) {
    const wakeNative = () => {
      document.removeEventListener("pointerdown", wakeNative, true);
      appeler("TextToSpeech", "speak", { text: " ", lang: "fr-FR", volume: 0, rate: 1, pitch: 1, category: "playback" }).catch(() => undefined);
    };
    document.addEventListener("pointerdown", wakeNative, true);
  }
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
  // now and then, very quietly, a word about Raphaël (the others know, but do not talk about it much)
  if (P().mode !== "statue" && Math.random() < 0.12) return say(pick(LORE_HINTS));
  if (P().greet.length) say(pick(P().greet));
}

/** The Papi's monologue: the story of the world, told piece by piece, each one after the previous one is said. */
let loreRun = 0;
export function tellLore() {
  const my = (loreRun += 1);
  reading();
  emit("lore");
  storageSet("footdex.lore.jour", new Date().toISOString().slice(0, 10));
  const step = (i: number) => {
    if (my !== loreRun || i >= LORE.length) return;
    const text = LORE[i].t;
    const act = LORE[i].act;
    if (act) play(act, Math.max(4000, text.length * 110));
    queue = [];
    window.clearTimeout(hideTimer);
    bubbleId += 1;
    const id = bubbleId;
    set({ bubble: { id, text, top: false } });
    let next = false;
    const go = () => {
      if (next || my !== loreRun || snap.bubble?.id !== id) return; // touched / something else said: he stops
      next = true;
      window.setTimeout(() => step(i + 1), 900);
    };
    if (snap.s.auto) voice(text, go);
    // without a voice (or if it ends without telling us), the text stays long enough to be read
    hideTimer = window.setTimeout(go, Math.max(4500, text.length * (snap.s.auto ? 100 : 75)));
    if (i === LORE.length - 1) window.setTimeout(() => { if (my === loreRun && snap.bubble?.id === id) set({ bubble: null }); }, Math.max(6000, text.length * 80));
  };
  step(0);
}
/** Has the Papi told it today? */
export const oupsLines = () => ({ go: pick(OUPS), back: pick(OUPS_BACK) });
export const after2000 = () => pick(AFTER_2000);
export const loreToldToday = () => storageGet("footdex.lore.jour") === new Date().toISOString().slice(0, 10);
export function explain(page: string) {
  const text = PAGES[page] ?? PAGES.accueil;
  const p = P();
  reading();
  // the Papi explains slowly… and the pages about today's football are not for him
  if (p.mode === "statue") return sayInParts("Hm. ", text, ["saison", "scores", "joueurs", "matchs", "paquets"].includes(page) ? [pick(AFTER_2000)] : []);
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
  // the Papi, sometimes, prefers the story of the world
  if (P().mode === "statue") {
    if (!loreToldToday() || Math.random() < 0.25) return tellLore();
    reading();
    return sayInParts(`${pick(P().story)} `, pick(OLD_STORIES));
  }
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
const fold = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** One of the Jongleur's idols? (by name: « Kylian Mbappé », « Zinédine Zidane »…) */
export function isIdol(name: string): boolean {
  const n = fold(name).split(/[^a-z]+/);
  return IDOLS.some((i) => n.includes(i));
}
/** The Jongleur meets one of his idols: on his knees, hearts and stars over his head. */
function idol(name: string) {
  say(pick(IDOL_LINES).replace("{n}", name), { top: true });
  play("pray", 5600);
}
const idolSeen = new Set<string>();
/** A player's page is open: if it is one of his idols, the Jongleur cannot hold back (once per player and per day). */
export function onFiche(name: string) {
  if (P().mode !== "joueur" || !isIdol(name) || idolSeen.has(name) || snap.s.rest) return;
  idolSeen.add(name);
  idol(name);
}
export function onCard(info: { name: string; rarity: string; shiny: boolean }) {
  if (P().mode === "joueur" && isIdol(info.name)) return idol(info.name);
  const kind: Kind = info.shiny ? "shiny" : (["base", "rare", "eclat", "legende", "moment"].includes(info.rarity) ? (info.rarity as Kind) : "base");
  const lines = P().card[kind];
  if (!lines.length) return;
  const high = kind !== "base" && kind !== "rare";
  const chance = P().mode === "poli" ? (high ? 1 : 0) : kind === "base" ? 0.35 : kind === "rare" ? 0.7 : 1;
  if (Math.random() > chance) return;
  const more = P().mode === "pointu" && kind !== "base" ? ` ${P().extra[1] ?? ""}` : "";
  say(pick(lines).replace("{n}", info.name) + more, { top: true });
  if (P().mode === "joueur") {
    // The more beautiful the card, the bigger his reaction: a small wave, arms up, a jump…
    // and on his knees, with hearts and stars over his head, only for his idols.
    if (isIdol(info.name)) return idol(info.name);
    if (kind === "base") play("wave", 2400);
    else if (kind === "rare") play("cheer", 2600);
    else play("jump", 2400);
    return;
  }
  if (kind !== "base" && kind !== "rare") play("cheer", 2600);
}
export function onShake() {
  play("shake", 1300);
  say(pick(P().shake));
}
/** A short cry, right when something happens (he is thrown, he falls): no waiting. */
export function shout(lines: string[]) {
  say(pick(lines));
}
export function onThrown(strong = false) {
  say(pick(P().thrown));
  emit("thrown");
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

/** The French voices installed on the phone (Android app only): to choose the nicest one. */
export async function androidVoices(): Promise<{ index: number; name: string; local: boolean }[]> {
  if (!isApp()) return [];
  try {
    const r = await appeler<{ voices: { name?: string; lang?: string; voiceURI?: string; localService?: boolean }[] }>("TextToSpeech", "getSupportedVoices");
    return (r?.voices ?? [])
      .map((v, index) => ({ index, name: v.name || v.voiceURI || `Voix ${index + 1}`, lang: v.lang || "", local: v.localService !== false }))
      .filter((v) => /^fr/i.test(v.lang) || /fr[-_]/i.test(v.name))
      .map(({ index, name, local }) => ({ index, name, local }));
  } catch {
    return [];
  }
}
/** Opens Android's screen to install better voices (Google's French voice, for example). */
export function installAndroidVoices() {
  appeler("TextToSpeech", "openInstall").catch(() => undefined);
}

/** Plays a sentence with a voice, without keeping it (the voice picker's « écouter »). */
export function tryVoice(v: PVoice, text?: string) {
  trying = v;
  const t = text ?? P().sample;
  say(t.length > 4 ? t : "Salut ! C'est moi, avec cette voix-là !");
}

/** One choice in the voice picker. */
export type VoiceOption = { key: string; label: string; stars: 1 | 2 | 3; tag: string; v: Pick<PVoice, "engine" | "native" | "phone"> };

/** Every voice this phone can give, best first (⭐⭐⭐ the most fluid). Simple names for a child: « Voix 1 », « Voix 2 »… */
export async function voiceCatalog(): Promise<VoiceOption[]> {
  const out: Omit<VoiceOption, "label">[] = [];
  if (isApp()) {
    let list: { index: number; name: string; local: boolean }[] = [];
    try {
      const r = await appeler<{ voices: { name?: string; lang?: string; voiceURI?: string; localService?: boolean }[] }>("TextToSpeech", "getSupportedVoices");
      list = (r?.voices ?? [])
        .map((v, index) => ({ index, name: `${v.name || ""} ${v.voiceURI || ""}`, lang: v.lang || "", local: v.localService !== false }))
        .filter((v) => /^fr/i.test(v.lang) || /fr[-_]/i.test(v.name));
    } catch {
      list = [];
    }
    for (const v of list) {
      const net = /network/i.test(v.name) || !v.local;
      const google = /x-[a-z]{3}-(local|network)|google/i.test(v.name);
      const samsung = /smt|samsung/i.test(v.name);
      const stars: 1 | 2 | 3 = google || net ? 3 : samsung ? 2 : 2;
      out.push({ key: `n${v.index}`, stars, tag: net ? "Avec Internet" : "Sans Internet", v: { engine: "native", native: v.index, phone: "" } });
    }
    if (!list.length) out.push({ key: "n-1", stars: 2, tag: "Sans Internet", v: { engine: "native", native: -1, phone: "" } });
  } else if (hasVoice()) {
    const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("fr"));
    for (const v of all) {
      const good = /google|natural|neural|premium|enhanced|online/i.test(v.name) || !v.localService;
      out.push({ key: `p${v.name}`, stars: good ? 3 : 2, tag: v.localService ? "Sans Internet" : "Avec Internet", v: { engine: "phone", native: -1, phone: v.name } });
    }
  }
  if (snap.s.piper) out.push({ key: "piper", stars: 3, tag: "Belle voix · sans Internet", v: { engine: "piper", native: -1, phone: "" } });
  out.sort((a, b) => b.stars - a.stars);
  const named = out.map((o, i) => ({ ...o, label: o.key === "piper" ? "Belle voix" : `Voix ${i + 1}` }));
  named.push({ key: "robot", label: "Voix robot", stars: 1, tag: "Marche partout", v: { engine: "robot", native: -1, phone: "" } });
  named.push({ key: "babble", label: "Bruits rigolos", stars: 1, tag: "Sans mots", v: { engine: "babble", native: -1, phone: "" } });
  return named;
}
export const optionKey = (v: PVoice) => (v.engine === "native" ? `n${v.native}` : v.engine === "phone" ? `p${v.phone}` : v.engine === "auto" ? "" : v.engine);

/** A visitor's line (doctor, referee): the same speaking chain, with his own pitch; the character's mouth does not move. */
/** A friend on the screen says something, with his own voice (the character's mouth stays still). */
export function speakAs(text: string, who: VoiceKey) {
  if (!snap.s.auto) return;
  trying = voiceOf(who);
  nextIsVisitor = true;
  voice(text);
}
/** Something happened to the character: the friends on the screen react. */
export function emit(ev: "thrown" | "doctor-in" | "doctor-out" | "card" | "lore") {
  window.dispatchEvent(new CustomEvent("footdex:terrain", { detail: ev }));
}
export function visitorSpeak(text: string, who: "medecin" | "arbitre") {
  if (!snap.s.auto) return;
  // his own voice if one was chosen for him; otherwise the character's voice (the one that works on this phone) with his own pitch
  const his = snap.s.pvoice[who];
  const mine = voiceOf(PERSOS[snap.s.perso].mode);
  trying = his ? voiceOf(who) : { ...mine, pitch: DEFAULT_PITCH[who], fun: "" };
  nextIsVisitor = true;
  voice(text);
}
