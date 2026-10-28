// The daily quiz: five questions built from the album's own data, the same for everyone on a given day.
import type { Album } from "./data";
import { hashString, seeded, shuffle } from "./util";

export type Question = { id: string; prompt: string; choices: string[]; answer: number; why: string };

export const DAILY_TOTAL = 5;
export const DAILY_PASS = 4;

type Maker = (album: Album, rand: () => number) => Question | null;

function pick<T>(items: T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)];
}

function choicesWith(correct: string, pool: string[], rand: () => number, count = 4): { choices: string[]; answer: number } | null {
  const others = shuffle([...new Set(pool.filter((x) => x && x !== correct))], rand).slice(0, count - 1);
  if (others.length < count - 1) return null;
  const choices = shuffle([correct, ...others], rand);
  return { choices, answer: choices.indexOf(correct) };
}

const clubQuestion: Maker = (album, rand) => {
  const rows = album.effectifs.players;
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.joueur, (counts.get(r.joueur) ?? 0) + 1);
  const row = pick(rows.filter((r) => counts.get(r.joueur) === 1), rand);
  const clubs = album.effectifs.clubs.filter((c) => c.ligue === row.ligue && c.joueurs > 0).map((c) => c.club);
  const set = choicesWith(row.club, clubs, rand);
  if (!set) return null;
  return {
    id: `club-${row.joueur}`,
    prompt: `D'après l'effectif du ${row.maj}, dans quel club de ${row.ligue} joue ${row.joueur} ?`,
    ...set,
    why: `${row.joueur} est dans l'effectif de ${row.club}${row.numero ? `, numéro ${row.numero}` : ""}. Source : ${row.source}, à jour au ${row.maj}.`,
  };
};

const numberQuestion: Maker = (album, rand) => {
  const counts = new Map<string, number>();
  for (const r of album.effectifs.players) counts.set(r.joueur, (counts.get(r.joueur) ?? 0) + 1);
  const rows = album.effectifs.players.filter((r) => /^\d+$/.test(r.numero) && counts.get(r.joueur) === 1);
  const row = pick(rows, rand);
  const n = Number(row.numero);
  const near = [n - 1, n + 1, n + 10, n - 10, n + 2, n + 7, n + 3].filter((x) => x > 0 && x < 100).map(String);
  const set = choicesWith(row.numero, near, rand);
  if (!set) return null;
  return {
    id: `num-${row.joueur}`,
    prompt: `Quel numéro porte ${row.joueur} à ${row.club} ?`,
    ...set,
    why: `Numéro ${row.numero}, d'après l'effectif du ${row.maj} (${row.source}).`,
  };
};

const stadiumQuestion: Maker = (album, rand) => {
  const clubs = album.effectifs.clubs;
  const club = pick(clubs, rand);
  const set = choicesWith(club.stade, clubs.map((c) => c.stade), rand);
  if (!set) return null;
  return {
    id: `stade-${club.club}`,
    prompt: `Dans quel stade joue ${club.club} ?`,
    ...set,
    why: `${club.club} joue au ${club.stade}, à ${club.ville}, ${club.capacite.toLocaleString("fr-FR")} places.`,
  };
};

const matchQuestion: Maker = (album, rand) => {
  const match = pick(album.matches, rand);
  const m = /^(\d+)\s*[–-]\s*(\d+)$/.exec(match.score.trim());
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const variants = [`${b}–${a}`, `${a + 1}–${b}`, `${a}–${b + 1}`, `${Math.max(0, a - 1)}–${b}`, `${a + 2}–${b}`, `${a}–${Math.max(0, b - 1)}`];
  const set = choicesWith(`${a}–${b}`, variants, rand);
  if (!set) return null;
  return {
    id: `match-${match.id}`,
    prompt: `${match.competition}, ${match.date} : ${match.home} contre ${match.away}. Quel est le score à la fin du match ?`,
    ...set,
    why: `${match.title}${match.detail ? ` (${match.detail})` : ""}. ${match.summary}`,
  };
};

const countryQuestion: Maker = (album, rand) => {
  const stars = album.album.filter((p) => p._src === "curated");
  const p = pick(stars, rand);
  const set = choicesWith(p.country, album.album.map((x) => x.country), rand);
  if (!set) return null;
  return {
    id: `pays-${p.id}`,
    prompt: `Pour quel pays joue (ou a joué) ${p.display} ?`,
    ...set,
    why: `${p.display} : ${p.country}. ${p.pitch}`,
  };
};

const wordQuestion: Maker = (album, rand) => {
  const entry = pick(album.lexique, rand);
  const first = entry.text.split(/(?<=\.)\s/)[0];
  const set = choicesWith(entry.word, album.lexique.map((l) => l.word), rand);
  if (!set) return null;
  return {
    id: `mot-${entry.id}`,
    prompt: `Quel mot du lexique veut dire : « ${first} »`,
    ...set,
    why: `${entry.word} : ${entry.text}`,
  };
};

const classicQuestion: Maker = (album, rand) => {
  const q = pick(album.quiz, rand);
  const order = shuffle(q.choices.map((_, i) => i), rand);
  return {
    id: q.id,
    prompt: q.prompt,
    choices: order.map((i) => q.choices[i]),
    answer: order.indexOf(q.answer),
    why: q.why,
  };
};

const MAKERS: Maker[] = [clubQuestion, numberQuestion, stadiumQuestion, matchQuestion, countryQuestion, wordQuestion, classicQuestion];

export function dailyQuiz(album: Album, day: string): Question[] {
  const rand = seeded(hashString(`footdex-${day}`));
  const out: Question[] = [];
  const ids = new Set<string>();
  for (const maker of shuffle(MAKERS, rand)) {
    for (let attempt = 0; attempt < 6 && out.length < DAILY_TOTAL; attempt++) {
      const q = maker(album, rand);
      if (q && !ids.has(q.id)) {
        ids.add(q.id);
        out.push(q);
        break;
      }
    }
    if (out.length >= DAILY_TOTAL) break;
  }
  return out;
}
