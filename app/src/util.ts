// Small helpers shared by every page.

export function fold(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const MONTHS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8,
  septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};
const SHORT_MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const LONG_MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** "20 décembre 1998" -> "1998-12-20". Empty string when the text is not a full date. */
export function frenchDateToIso(text: string | undefined | null): string {
  if (!text) return "";
  const parts = fold(text.replace("1er", "1")).split(/\s+/);
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  const month = MONTHS[m];
  if (!month || !/^\d{1,2}$/.test(d) || !/^\d{4}$/.test(y)) return "";
  return `${y}-${String(month).padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** "2026-10-18" -> "18 oct. 2026" */
export function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${SHORT_MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** "2026-10-18" -> "18 octobre 2026" */
export function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3]) === 1 ? "1er" : Number(m[3])} ${LONG_MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** French number, with a plain no-break space between thousands (every font has that one). */
export function fmt(n: number): string {
  return n.toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0");
}

export function plural(n: number, one: string, many: string): string {
  return `${fmt(n)} ${n > 1 ? many : one}`;
}

/** Age in whole years at `today`, from an ISO birth date. */
export function ageFrom(iso: string, today = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  let age = today.getFullYear() - Number(m[1]);
  const before = today.getMonth() + 1 < Number(m[2]) || (today.getMonth() + 1 === Number(m[2]) && today.getDate() < Number(m[3]));
  if (before) age -= 1;
  return age;
}

/** Local calendar day, "YYYY-MM-DD". Packs and the daily quiz follow it. */
export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysSinceEpoch(date = new Date()): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/** Days since 1970 -> "YYYY-MM-DD". */
export function isoFromDays(days: number): string {
  return new Date(days * 86_400_000).toISOString().slice(0, 10);
}

export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic generator, used for "of the day" picks and the daily quiz. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Real randomness for packs. */
export function random(): number {
  try {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / 4294967296;
  } catch {
    return Math.random();
  }
}

export function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(" ");
}

export function youtubeSearch(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** Initials for players without a picture. */
export function initials(name: string): string {
  const words = name.replace(/[^\p{L}\s'-]/gu, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private window or blocked storage: the page keeps working without it */
  }
}
