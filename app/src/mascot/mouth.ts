// The mouth follows the sound. Each word is cut into syllables: the mouth opens wide on « a », less on « i »,
// closes between syllables and on the pauses of the punctuation. It starts exactly when the voice really starts
// (the engines tell us) and stops exactly when it stops. For a recorded noise, the mouth follows the real loudness.
let who = "main";
let text = "";
let rate = 1;
let active = false;
let raf = 0;
let t0 = 0;
let level: (() => number) | null = null;
type Seg = { open: number; ms: number };
let plan: Seg[] = [];
let total = 1;

const VOWEL: Record<string, number> = { a: 1, à: 1, â: 1, o: 0.85, ô: 0.85, œ: 0.8, e: 0.55, é: 0.5, è: 0.6, ê: 0.6, ë: 0.5, i: 0.4, î: 0.4, ï: 0.4, y: 0.4, u: 0.55, ù: 0.55, û: 0.55, ü: 0.5 };

function build(t: string, r: number): Seg[] {
  const out: Seg[] = [];
  const k = 1 / Math.max(0.5, r);
  const s = t.toLowerCase();
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c in VOWEL) {
      let amp = VOWEL[c];
      let j = i + 1;
      while (j < s.length && s[j] in VOWEL) { amp = Math.max(amp, VOWEL[s[j]] * 0.9); j += 1; }
      if (s.slice(i, j) === "ou") amp = 0.75;
      out.push({ open: amp, ms: 105 * k }, { open: 0.05, ms: 70 * k });
      i = j;
    } else if (c === "," || c === ";" || c === ":") { out.push({ open: 0, ms: 170 * k }); i += 1; }
    else if (c === "." || c === "!" || c === "?" || c === "…") { out.push({ open: 0, ms: 300 * k }); i += 1; while (i < s.length && /[.!?…]/.test(s[i])) i += 1; }
    else if (c === " ") { out.push({ open: 0.03, ms: 25 * k }); i += 1; }
    else { i += 1; } // consonants: the mouth stays closed a moment (the gap after the vowel)
  }
  if (!out.length) out.push({ open: 0.5, ms: 400 });
  return out;
}

function amp(now: number): number {
  if (level) return level();
  let t = (now - t0) % total;
  for (const s of plan) {
    if (t < s.ms) return s.open * Math.sin(Math.PI * Math.max(0.12, t / s.ms));
    t -= s.ms;
  }
  return 0;
}

function frame(now: number) {
  if (!active) return;
  const a = amp(now);
  document.querySelectorAll<HTMLElement>(`[data-who="${who}"] .mfw.talk`).forEach((el) => {
    el.classList.add("live");
    el.style.setProperty("--mo", String(Math.max(0.06, Math.min(1, a)).toFixed(2)));
  });
  raf = requestAnimationFrame(frame);
}

/** What will be said, and by whom ("main" = the big character, or a friend's name). */
export function mouthPlan(w: string, t: string, r: number) {
  who = w;
  text = t;
  rate = r;
  plan = build(t, r);
  total = plan.reduce((n, s) => n + s.ms, 0) || 1;
}
/** The sound really starts now. */
export function mouthOn(lv?: (() => number) | null) {
  level = lv ?? null;
  t0 = performance.now();
  if (active) return;
  active = true;
  raf = requestAnimationFrame(frame);
}
/** The sound is over: the mouth closes at once. */
export function mouthOff() {
  active = false;
  level = null;
  cancelAnimationFrame(raf);
  document.querySelectorAll<HTMLElement>(".mfw.live").forEach((el) => {
    el.classList.remove("live");
    el.style.removeProperty("--mo");
  });
}
export const mouthText = () => text;
export const mouthRate = () => rate;

// the real loudness of a recorded noise
const nodes = new WeakMap<HTMLAudioElement, AnalyserNode>();
let ctx: AudioContext | null = null;
export function loudness(a: HTMLAudioElement): (() => number) | null {
  try {
    ctx = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    let an = nodes.get(a);
    if (!an) {
      const src = ctx.createMediaElementSource(a);
      an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      an.connect(ctx.destination);
      nodes.set(a, an);
    }
    const data = new Uint8Array(an.fftSize);
    const node = an;
    void ctx.resume();
    return () => {
      node.getByteTimeDomainData(data);
      let s = 0;
      for (let i = 0; i < data.length; i += 1) { const v = (data[i] - 128) / 128; s += v * v; }
      return Math.min(1, Math.sqrt(s / data.length) * 4.2);
    };
  } catch {
    return null;
  }
}
