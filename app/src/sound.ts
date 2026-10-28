// The sounds of the album, all made on the fly (no sound file to load, works offline):
// mechanical "clicks" that differ by kind of button, a card swish, a paper tear,
// and a crowd that cheers and claps for the great cards.
// Phones only allow sound after a touch: the first one unlocks it. Everything goes through one
// master gain and a compressor, loud enough for a phone speaker without crackling.
import { storageGet, storageSet } from "./util";

const KEY = "footdex.son";
let audio: AudioContext | null = null;
let master: AudioNode | null = null;
let noise: AudioBuffer | null = null;
let enabled = storageGet(KEY) !== "off";
const listeners = new Set<() => void>();

export function soundOn(): boolean {
  return enabled;
}

export function onSoundChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** `voice`: the character's voice uses the sound too, even when the sound effects are turned off.
 * (Before, "reduce animations" on the phone also cut every sound, voice included: that was a bug.) */
function ctx(voice = false): AudioContext | null {
  if (!enabled && !voice) return null;
  try {
    // iPhone: without this, the silent switch also mutes the voice made by the app.
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== "playback") session.type = "playback";
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return null;
    if (!audio) {
      audio = new Context();
      const gain = audio.createGain();
      gain.gain.value = 2.6;
      const limiter = audio.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 12;
      gain.connect(limiter);
      limiter.connect(audio.destination);
      master = gain;
    }
    if (audio.state === "suspended") void audio.resume().catch(() => undefined);
    return audio;
  } catch {
    return null;
  }
}

function out(a: AudioContext): AudioNode {
  return master ?? a.destination;
}

function noiseOf(a: AudioContext): AudioBuffer {
  if (!noise) {
    noise = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** Called on the first touches: wakes the sound up (a silent blip is what iPhones need). */
export function unlockAudio() {
  if (audio && audio.state === "running") return;
  const a = ctx(true);
  if (!a) return;
  try {
    const source = a.createBufferSource();
    source.buffer = a.createBuffer(1, 1, 22050);
    source.connect(a.destination);
    source.start(0);
  } catch {
    /* nothing to wake up */
  }
}

// ------------------------------------------------------------------ building blocks

function note(freq: number, at: number, length: number, volume: number, type: OscillatorType = "triangle") {
  const a = ctx();
  if (!a) return;
  const start = a.currentTime + at;
  const tone = a.createOscillator();
  const gain = a.createGain();
  tone.type = type;
  tone.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  tone.connect(gain);
  gain.connect(out(a));
  tone.start(start);
  tone.stop(start + length + 0.02);
}

/** A short burst of filtered noise: the "tic" of a switch, a clap, a crackle. */
function burst(a: AudioContext, at: number, freq: number, q: number, volume: number, decay: number, type: BiquadFilterType = "bandpass") {
  const src = a.createBufferSource();
  src.buffer = noiseOf(a);
  const filter = a.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.0015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(out(a));
  src.start(at, Math.random() * 0.8, decay + 0.03);
}

/** A low "thock": the body of a key going down. */
function body(a: AudioContext, at: number, from: number, to: number, volume: number, decay: number) {
  const tone = a.createOscillator();
  const gain = a.createGain();
  tone.type = "sine";
  tone.frequency.setValueAtTime(from, at);
  tone.frequency.exponentialRampToValueAtTime(to, at + decay);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  tone.connect(gain);
  gain.connect(out(a));
  tone.start(at);
  tone.stop(at + decay + 0.02);
}

// ------------------------------------------------------------------ clicks, by kind of button

export type ClickKind = "menu" | "button" | "soft" | "back";

/** Football sounds for the buttons: a ball struck or tapped, a drum for the menu. */
export function click(kind: ClickKind = "button") {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + 0.002;
  if (kind === "menu") {
    // the tab bar: a deep drum, "boum" of the stands
    body(a, t, 150, 62, 0.46, 0.16);
    burst(a, t, 420, 0.8, 0.2, 0.05, "lowpass");
    burst(a, t, 2400, 1, 0.12, 0.012);
  } else if (kind === "soft") {
    // filters, chips, tabs inside a page: a light ball tap, "toc"
    body(a, t, 330, 210, 0.2, 0.05);
    burst(a, t, 1500, 1.1, 0.14, 0.014);
  } else if (kind === "back") {
    // back and close: a pass played back, soft "pof"
    body(a, t, 240, 120, 0.3, 0.09);
    burst(a, t, 900, 0.9, 0.13, 0.03, "lowpass");
  } else {
    // ordinary buttons and links: the ball struck by a boot, "poc"
    body(a, t, 210, 78, 0.44, 0.075);
    burst(a, t, 1200, 0.9, 0.34, 0.022, "lowpass");
    burst(a, t, 3600, 1.2, 0.16, 0.008);
  }
}

/** Kept for the old call sites: a light tick. */
export function tick() {
  click("soft");
}

// ------------------------------------------------------------------ packs and cards

/** Turns the sounds on or off; turning them on plays a short chime right away. */
export function setSound(next: boolean) {
  enabled = next;
  storageSet(KEY, next ? "on" : "off");
  for (const fn of listeners) fn();
  if (next) {
    unlockAudio();
    whistle(0, 0.32);
  }
}

/** Foil being torn: a crackling "rrrip". */
export function tear() {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime;
  for (let i = 0; i < 46; i++) {
    const at = t + i * 0.0075 + Math.random() * 0.004;
    const k = i / 46;
    burst(a, at, 1800 + k * 3200 + Math.random() * 600, 1.1, 0.06 + Math.random() * 0.12 * (1 - k * 0.5), 0.012 + Math.random() * 0.01);
  }
  burst(a, t, 900, 0.7, 0.05, 0.3, "highpass");
}

/** A card turning over: a swish, then a ring that gets brighter with the rarity. */
export function flip(rarity: string) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime;
  const src = a.createBufferSource();
  src.buffer = noiseOf(a);
  const filter = a.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.4;
  filter.frequency.setValueAtTime(800, t);
  filter.frequency.exponentialRampToValueAtTime(3600, t + 0.13);
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.16, t + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(out(a));
  src.start(t, Math.random() * 0.5, 0.2);
  if (rarity === "base") return note(880, 0.1, 0.12, 0.025, "sine");
  if (rarity === "rare") {
    note(660, 0.08, 0.14, 0.035);
    note(990, 0.15, 0.2, 0.035);
    return;
  }
  note(660, 0.08, 0.12, 0.035);
  note(880, 0.15, 0.14, 0.035);
  note(1320, 0.22, 0.3, 0.04, "sine");
}

/** A drum hit, for each clue of a big reveal. */
export function thump() {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime;
  body(a, t, 140, 42, 0.55, 0.4);
  burst(a, t, 260, 0.7, 0.18, 0.12, "lowpass");
}

/** A rising sweep while the lights come up. */
export function riser(seconds = 1.6) {
  const a = ctx();
  if (!a) return;
  const start = a.currentTime;
  const tone = a.createOscillator();
  const gain = a.createGain();
  tone.type = "triangle";
  tone.frequency.setValueAtTime(180, start);
  tone.frequency.exponentialRampToValueAtTime(900, start + seconds);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.02, start + seconds * 0.8);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  tone.connect(gain);
  gain.connect(out(a));
  tone.start(start);
  tone.stop(start + seconds + 0.05);
}

/** The referee's whistle: a high pea whistle, shaken fast. */
export function whistle(after = 0, length = 0.45) {
  const a = ctx();
  if (!a) return;
  const start = a.currentTime + after;
  const tone = a.createOscillator();
  const trill = a.createOscillator();
  const depth = a.createGain();
  const gain = a.createGain();
  tone.type = "sine";
  tone.frequency.setValueAtTime(2750, start);
  tone.frequency.linearRampToValueAtTime(3050, start + length * 0.25);
  trill.frequency.value = 38;
  depth.gain.value = 130;
  trill.connect(depth);
  depth.connect(tone.frequency);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.1, start + 0.02);
  gain.gain.setValueAtTime(0.1, start + length * 0.75);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  tone.connect(gain);
  gain.connect(out(a));
  tone.start(start);
  trill.start(start);
  tone.stop(start + length + 0.03);
  trill.stop(start + length + 0.03);
}

/** One hit of a stands drum. */
function tom(after: number, pitch = 150, volume = 0.4) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + after;
  body(a, t, pitch, pitch * 0.4, volume, 0.17);
  burst(a, t, 500, 0.8, volume * 0.35, 0.06, "lowpass");
}

/** A brass stab (stadium horns) for the big card, over a drum roll: "bom bom bom-bom bom". */
export function fanfare(rarity: string) {
  const roots: Record<string, number[]> = {
    eclat: [262, 330, 392, 523],
    legende: [196, 247, 294, 392],
    moment: [294, 370, 440, 587],
    shiny: [330, 415, 494, 659],
  };
  const notes = roots[rarity] ?? roots.eclat;
  whistle(0, 0.3);
  [0.34, 0.52, 0.7, 0.82, 0.98].forEach((at, i) => tom(at, i % 2 ? 130 : 165, 0.34));
  // brass: sawtooth notes, short and bright, played together
  notes.forEach((f, i) => {
    note(f, 0.34, 0.28, 0.026, "sawtooth");
    note(f, 0.98, 0.7, 0.03, "sawtooth");
    if (i === 0) note(f / 2, 0.98, 0.7, 0.04, "triangle");
  });
  notes.forEach((f) => note(f * 2, 0.98, 0.9, 0.01, "sine"));
}

/**
 * The stadium reacts: a "waouh" from a crowd of voices sliding up from "ou" to "a",
 * then a wave of applause. `power` makes it bigger (1 for a great card, 1.5 for a shiny one).
 */
export function crowd(power = 1) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime;
  const p = Math.max(0.5, Math.min(1.6, power));

  // "Waouh": many voices, slightly out of tune, through two vowel filters.
  const voice = a.createGain();
  voice.gain.setValueAtTime(0.0001, t);
  voice.gain.exponentialRampToValueAtTime(0.11 * p, t + 0.32);
  voice.gain.setValueAtTime(0.11 * p, t + 0.85);
  voice.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
  const f1 = a.createBiquadFilter();
  f1.type = "bandpass";
  f1.Q.value = 3.5;
  f1.frequency.setValueAtTime(330, t);
  f1.frequency.linearRampToValueAtTime(740, t + 0.55);
  const f2 = a.createBiquadFilter();
  f2.type = "bandpass";
  f2.Q.value = 4.5;
  f2.frequency.setValueAtTime(820, t);
  f2.frequency.linearRampToValueAtTime(1180, t + 0.55);
  const mix = a.createGain();
  mix.connect(f1);
  mix.connect(f2);
  f1.connect(voice);
  f2.connect(voice);
  voice.connect(out(a));
  const voices = Math.round(14 * p);
  for (let i = 0; i < voices; i++) {
    const base = i % 3 === 0 ? 210 + Math.random() * 90 : 105 + Math.random() * 70;
    const start = t + Math.random() * 0.12;
    const tone = a.createOscillator();
    tone.type = "sawtooth";
    tone.frequency.setValueAtTime(base * 0.82, start);
    tone.frequency.exponentialRampToValueAtTime(base * 1.28, start + 0.45);
    tone.frequency.exponentialRampToValueAtTime(base * 1.02, start + 1.7);
    const wobble = a.createOscillator();
    wobble.frequency.value = 4 + Math.random() * 3;
    const depth = a.createGain();
    depth.gain.value = base * 0.025;
    wobble.connect(depth);
    depth.connect(tone.frequency);
    const level = a.createGain();
    level.gain.value = 0.35 + Math.random() * 0.45;
    tone.connect(level);
    level.connect(mix);
    tone.start(start);
    wobble.start(start);
    tone.stop(t + 2);
    wobble.stop(t + 2);
  }
  // breath of the crowd
  const air = a.createBufferSource();
  air.buffer = noiseOf(a);
  const airFilter = a.createBiquadFilter();
  airFilter.type = "bandpass";
  airFilter.frequency.value = 1300;
  airFilter.Q.value = 0.6;
  const airGain = a.createGain();
  airGain.gain.setValueAtTime(0.0001, t);
  airGain.gain.exponentialRampToValueAtTime(0.05 * p, t + 0.35);
  airGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  air.connect(airFilter);
  airFilter.connect(airGain);
  airGain.connect(out(a));
  air.start(t, 0, 2.3);

  // Applause: many short claps, thick at first, then thinning out.
  const claps = Math.round(150 * p);
  for (let i = 0; i < claps; i++) {
    const at = t + 0.25 + 2.7 * Math.pow(Math.random(), 1.7);
    burst(a, at, 900 + Math.random() * 1700, 1.1, 0.035 + Math.random() * 0.06, 0.05 + Math.random() * 0.05);
  }
}

/** A short whoosh when a card leaves. */
export function whoosh() {
  const a = ctx();
  if (!a) return;
  burst(a, a.currentTime, 1400, 0.8, 0.07, 0.14);
}

/** The sound of stars coming in. */
export function coins(count = 3) {
  for (let i = 0; i < Math.min(count, 6); i++) note(1320 + i * 90, i * 0.06, 0.12, 0.018, "sine");
}

/** The ball that opens in two: it arrives with a thump, bounces, cracks open, sparkles. */
export function ballOpen() {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime;
  burst(a, t, 500, 0.8, 0.07, 0.3, "bandpass");
  body(a, t + 0.26, 220, 70, 0.55, 0.16);
  burst(a, t + 0.26, 1800, 1.2, 0.12, 0.05);
  body(a, t + 0.4, 190, 80, 0.3, 0.12);
  note(330, 0.44, 0.1, 0.04, "triangle");
  burst(a, t + 0.62, 3000, 2, 0.16, 0.05, "highpass");
  body(a, t + 0.62, 150, 45, 0.5, 0.22);
  burst(a, t + 0.66, 1100, 0.7, 0.09, 0.34);
  note(784, 0.72, 0.16, 0.035, "sine");
  note(1047, 0.8, 0.16, 0.035, "sine");
  note(1319, 0.88, 0.26, 0.04, "sine");
}

const VOWELS: [number, number][] = [[700, 1200], [520, 1800], [320, 2300], [500, 900], [350, 700], [600, 1500]];

/** A funny cartoon voice (no words): syllables that follow the rhythm of the text. It works even when the phone has no voice. */
import { speakFr } from "./frtts";

/** The robot voice: it really says the written words, with no internet and no voice installed in the phone. */
export function robot(text: string, pitch: number, rate: number, formant = 1, vib = 0): { ms: number; stop: () => void } | null {
  const a = ctx(true);
  if (!a) return null;
  try {
    return speakFr(a, out(a), text, { f0: 130 * pitch, rate, formant, vib: vib * 0.8 });
  } catch {
    return null;
  }
}

export function babble(text: string, pitch: number, rate: number, formant = 1, vib = 0): { ms: number; stop: () => void } | null {
  const a = ctx(true);
  if (!a) return null;
  const nodes: OscillatorNode[] = [];
  let t = a.currentTime + 0.05;
  const base = a.currentTime;
  const f0 = 175 * pitch;
  const r = Math.max(0.5, rate);
  const words = text.replace(/\s+/g, " ").trim().split(" ").slice(0, 90);
  for (const w of words) {
    const letters = w.replace(/[^\p{L}]/gu, "");
    const syl = Math.max(1, Math.min(4, Math.round(letters.length / 3)));
    for (let i = 0; i < syl; i += 1) {
      const len = (0.1 + Math.random() * 0.05) / r;
      const [f1, f2] = VOWELS[Math.floor(Math.random() * VOWELS.length)];
      const osc = a.createOscillator();
      osc.type = "sawtooth";
      const pf = f0 * (0.92 + Math.random() * 0.22);
      osc.frequency.setValueAtTime(pf, t);
      osc.frequency.linearRampToValueAtTime(pf * (0.9 + Math.random() * 0.25), t + len);
      const b1 = a.createBiquadFilter();
      b1.type = "bandpass";
      b1.frequency.value = f1 * formant;
      b1.Q.value = 5;
      const b2 = a.createBiquadFilter();
      b2.type = "bandpass";
      b2.frequency.value = f2 * formant;
      b2.Q.value = 6;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      if (vib > 0) {
        const lfo = a.createOscillator();
        const depth = a.createGain();
        lfo.frequency.value = 5.5;
        depth.gain.value = vib;
        lfo.connect(depth);
        depth.connect(osc.frequency);
        lfo.start(t);
        lfo.stop(t + len + 0.02);
      }
      osc.connect(b1);
      osc.connect(b2);
      b1.connect(g);
      b2.connect(g);
      g.connect(out(a));
      osc.start(t);
      osc.stop(t + len + 0.02);
      nodes.push(osc);
      t += len + 0.035 / r;
    }
    t += (/[.!?]$/.test(w) ? 0.28 : /[,;:]$/.test(w) ? 0.16 : 0.07) / r;
  }
  return {
    ms: Math.max(600, (t - base) * 1000),
    stop: () => nodes.forEach((n) => {
      try {
        n.stop();
      } catch {
        /* already finished */
      }
    }),
  };
}

// ------------------------------------------------------------------ the footballer's ball (real-sounding, no beep)
// A leather ball has no pitch: its sound is a short thud of air (filtered noise) with a low body that drops fast.

/** The boot strikes the ball: a dry "poc", stronger with `power` (0 to 1). */
export function ballKick(power = 0.6) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + 0.001;
  const v = 0.12 + 0.4 * power;
  burst(a, t, 900 + 700 * power, 0.7, v, 0.03 + 0.03 * power, "lowpass");
  burst(a, t, 2600, 0.9, v * 0.35, 0.012);
  body(a, t, 140 + 60 * power, 55, v * 0.9, 0.06 + 0.05 * power);
}
/** The ball lands on the grass: a soft muffled "toum", quieter when it falls from lower. */
export function ballBounce(power = 0.5) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + 0.001;
  const v = 0.05 + 0.25 * power;
  burst(a, t, 420 + 300 * power, 0.6, v, 0.05, "lowpass");
  body(a, t, 95 + 40 * power, 48, v * 0.8, 0.07);
}
/** The sole or the inside of the foot cushions the ball: a short brushed "fff-tap". */
export function ballTrap(power = 0.4) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + 0.001;
  burst(a, t, 1400, 0.5, 0.06 + 0.12 * power, 0.04, "bandpass");
  body(a, t + 0.005, 110, 60, 0.1 + 0.2 * power, 0.05);
}
