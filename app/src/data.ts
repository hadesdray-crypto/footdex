// Loading and decoding of the data files written by tools/build-data.py.
import { fold, frenchDateToIso } from "./util";

export type Rayon = "ligue1" | "ligue2" | "monde" | "feminin";
export type Poste = "Gardien" | "Défenseur" | "Milieu" | "Attaquant";
export type Rarity = "talent" | "cadre" | "icone" | "legende";

export type Nugget = { title: string; text: string };
export type Player = {
  id: string;
  display: string;
  short: string;
  number: number | null;
  shirt: string;
  born: string;
  died?: string;
  place: string;
  country: string;
  code: string;
  position: string;
  family: Poste;
  height?: string;
  foot?: string;
  rayons: Rayon[];
  era: string;
  rarity: Rarity;
  kit: string;
  ink: string;
  club: string;
  clubs: { name: string; years: string }[];
  pitch: string;
  story: string;
  stats: { label: string; value: string }[];
  honours: string[];
  anecdotes: Nugget[];
  videoQuery: string;
  sources: string[];
  now?: string;
  _src: "curated" | "roster" | "saison2026";
};

export type Match = {
  id: string;
  title: string;
  competition: string;
  date: string;
  stadium: string;
  home: string;
  away: string;
  score: string;
  detail?: string;
  summary: string;
  story: string;
  facts: string[];
  nugget: Nugget;
  videoQuery: string;
  sources: string[];
};

export type Club = {
  id: string;
  name: string;
  short: string;
  city: string;
  founded: string;
  stadium: string;
  capacity?: string;
  kit: string;
  ink: string;
  pitch: string;
  story: string;
  honours: string[];
  sources: string[];
};

export type Coupe = {
  id: string;
  title: string;
  kicker: string;
  pitch: string;
  tournament: string | null;
  finals: { when: string; score: string; text: string; source: string }[];
};

export type QuizQuestion = { id: string; prompt: string; choices: string[]; answer: number; why: string };
export type GameCardSide = {
  overall: number | null;
  positions: string;
  club: string;
  nation: string;
  height: string;
  foot: string;
  pace?: number | null;
  shooting?: number | null;
  passing?: number | null;
  dribbling?: number | null;
  defending?: number | null;
  physic?: number | null;
};
export type GameCard = { id?: number; old?: GameCardSide; new?: GameCardSide };
export type SquadPlayer = {
  ligue: "Ligue 1" | "Ligue 2";
  club: string;
  numero: string;
  joueur: string;
  poste: string;
  nationalite: string;
  maj: string;
  source: string;
  remarque: string;
};
export type SquadClub = {
  ligue: "Ligue 1" | "Ligue 2";
  club: string;
  ville: string;
  stade: string;
  capacite: number;
  joueurs: number;
  maj: string;
  source: string;
  statut: string;
  page: string;
};
export type CertitudeRow = { title: string; rate: string; sure: string; sources: string; doubt: string };

export type Core = {
  edition: { id: string; label: string; title: string };
  labels: { rayon: Record<string, string>; rarity: Record<Rarity, string> };
  album: Player[];
  gameCards: Record<string, GameCard>;
  playerFacts: Record<string, { born?: string | null; height?: string | null; foot?: string | null }>;
  changements: Record<string, string>;
  portraits2026: unknown;
  portraits: Record<string, { src: string; credit: string }>;
  matches: Match[];
  clubs: Club[];
  coupes: Coupe[];
  lexique: { id: string; word: string; text: string }[];
  quiz: QuizQuestion[];
  updates: { day: string; items: { player: string; change: string; source: string }[] };
  saison: {
    grounds: { club: string; city: string; stadium: string; capacity: string; league: string }[];
    nextFixtures: { date: string; home: string; away: string }[];
  };
  effectifs: { compiled: string; clubs: SquadClub[]; players: SquadPlayer[] };
  notes2026: (string | null)[];
  xlsxTotals: (string | number)[][];
  certitude: CertitudeRow[];
  rayonsOld: { to: string; title: string; text: string }[];
  manifest: {
    sources: { name: string; what: string; note: string }[];
    disclaimer: string;
    built: string;
    [key: string]: unknown;
  };
  extraScores: { league: string; season: string; date: string; home: string; away: string; hg: string; ag: string }[];
};

/** Everything the album knows, with lookups built once. */
export type Album = Core & {
  byId: Map<string, Player>;
  dex: Map<string, number>;
  squadByName: Map<string, SquadPlayer[]>;
  clubOfSquad: Map<string, SquadClub>;
  eaOf: Map<string, number>;
  faceOf: Map<string, { id: number; chunk: number }>;
  matchById: Map<string, Match>;
  /** Links of the old pipeline set aside: the fiche was tied to another player with the same first name. */
  cardDoubts: Record<string, { id?: string; new?: string }>;
  smallPortraits: Set<string>;
};

const cache = new Map<string, Promise<unknown>>();

export function fetchJson<T>(path: string): Promise<T> {
  let pending = cache.get(path) as Promise<T> | undefined;
  if (!pending) {
    pending = fetch(path).then((res) => {
      if (!res.ok) throw new Error(`${path} : ${res.status}`);
      return res.json() as Promise<T>;
    });
    pending.catch(() => cache.delete(path));
    cache.set(path, pending);
  }
  return pending;
}

let albumPromise: Promise<Album> | null = null;

export function loadAlbum(): Promise<Album> {
  if (!albumPromise) {
    albumPromise = Promise.all([
      fetchJson<Core>("data/core.json"),
      fetchJson<Record<string, [number, number]>>("data/album-faces.json"),
      fetchJson<Record<string, { id?: string; new?: string }>>("data/card-doubts.json"),
      fetchJson<string[]>("data/portraits-small.json"),
    ]).then(([core, faces, cardDoubts, small]) => {
      const byId = new Map(core.album.map((p) => [p.id, p] as const));
      const dex = new Map(core.album.map((p, i) => [p.id, i + 1] as const));
      const squadByName = new Map<string, SquadPlayer[]>();
      for (const row of core.effectifs.players) {
        const key = fold(row.joueur.trim());
        const list = squadByName.get(key) ?? [];
        list.push(row);
        squadByName.set(key, list);
      }
      const clubOfSquad = new Map(core.effectifs.clubs.map((c) => [c.club, c] as const));
      const eaOf = new Map<string, number>();
      for (const p of core.album) {
        const card = core.gameCards[p.display];
        if (card?.id && !cardDoubts[p.display]?.id) eaOf.set(p.id, card.id);
      }
      const matchById = new Map(core.matches.map((m) => [m.id, m] as const));
      const faceOf = new Map(Object.entries(faces).map(([aid, [id, chunk]]) => [aid, { id, chunk }] as const));
      return { ...core, byId, dex, squadByName, clubOfSquad, eaOf, faceOf, matchById, cardDoubts, smallPortraits: new Set(small) };
    });
    albumPromise.catch(() => {
      albumPromise = null;
    });
  }
  return albumPromise;
}

/** Same matching rule as the old app: a squad line belongs to a fiche when the folded names are equal. */
export function squadLines(album: Album, names: string[]): SquadPlayer[] {
  const seen = new Set<string>();
  const out: SquadPlayer[] = [];
  for (const name of names) {
    for (const row of album.squadByName.get(fold(name.trim())) ?? []) {
      const key = `${row.club}-${row.joueur}-${row.numero}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(row);
      }
    }
  }
  return out;
}

/** The game card sides that really belong to this fiche. */
export function gameSides(album: Album, p: Player): { id: number | null; old: GameCardSide | null; new: GameCardSide | null } {
  const card = album.gameCards[p.display];
  const doubt = album.cardDoubts[p.display] ?? {};
  return {
    id: card?.id && !doubt.id ? card.id : null,
    old: card?.old && !doubt.id ? card.old : null,
    new: card?.new && !doubt.new ? card.new : null,
  };
}

export function gameOverall(album: Album, p: Player): number | null {
  const sides = gameSides(album, p);
  return sides.new?.overall ?? sides.old?.overall ?? null;
}

// ------------------------------------------------------------------ people (EA files)

export type Person = {
  id: number;
  name: string;
  pos: string;
  ovr: number;
  club: string;
  clubYear: number;
  nation: string;
  chunk: number;
  face: boolean;
  rep: number;
  born: string;
  album: string[];
  ovr24: number | null;
  ovr26: number | null;
  pot: number | null;
  chunk26: number;
  league: string;
  key: string;
};

type PeopleFile = { cols: string[]; chunks: number; chunks26: number; rows: unknown[][] };
let peoplePromise: Promise<{ list: Person[]; byId: Map<number, Person> }> | null = null;

export function loadPeople() {
  if (!peoplePromise) {
    peoplePromise = fetchJson<PeopleFile>("data/people.json").then((file) => {
      const at = (name: string) => file.cols.indexOf(name);
      const c = {
        id: at("id"), name: at("name"), pos: at("pos"), ovr: at("ovr"), club: at("club"), clubYear: at("clubYear"),
        nation: at("nation"), chunk: at("chunk"), face: at("face"), rep: at("rep"), born: at("born"), album: at("album"),
        ovr24: at("ovr24"), ovr26: at("ovr26"), pot: at("pot"), chunk26: at("chunk26"), league: at("league"),
      };
      const list: Person[] = file.rows.map((r) => {
        const name = r[c.name] as string;
        const club = r[c.club] as string;
        const nation = r[c.nation] as string;
        return {
          id: r[c.id] as number,
          name,
          pos: r[c.pos] as string,
          ovr: (r[c.ovr] as number) ?? 0,
          club,
          clubYear: r[c.clubYear] as number,
          nation,
          chunk: r[c.chunk] as number,
          face: r[c.face] === 1,
          rep: (r[c.rep] as number) ?? 0,
          born: r[c.born] as string,
          album: r[c.album] as string[],
          ovr24: r[c.ovr24] as number | null,
          ovr26: r[c.ovr26] as number | null,
          pot: r[c.pot] as number | null,
          chunk26: r[c.chunk26] as number,
          league: r[c.league] as string,
          key: fold(`${name} ${club} ${nation}`),
        };
      });
      return { list, byId: new Map(list.map((p) => [p.id, p] as const)) };
    });
    peoplePromise.catch(() => {
      peoplePromise = null;
    });
  }
  return peoplePromise;
}

/** Football positions in the EA files ("ST, LW") reduced to the four album families. */
export function posteOf(positions: string): Poste {
  const first = (positions.split(/[,\s]+/).find(Boolean) ?? "").toUpperCase();
  if (first === "GK") return "Gardien";
  if (["CB", "LB", "RB", "LWB", "RWB", "SW"].includes(first)) return "Défenseur";
  if (["CDM", "CM", "CAM", "LM", "RM"].includes(first)) return "Milieu";
  return "Attaquant";
}

const POS_FR: Record<string, string> = {
  GK: "Gardien", CB: "Défenseur central", LB: "Latéral gauche", RB: "Latéral droit", LWB: "Piston gauche", RWB: "Piston droit", SW: "Libéro",
  CDM: "Milieu défensif", CM: "Milieu", CAM: "Milieu offensif", LM: "Milieu gauche", RM: "Milieu droit",
  LW: "Ailier gauche", RW: "Ailier droit", CF: "Attaquant", ST: "Avant-centre", LF: "Attaquant gauche", RF: "Attaquant droit",
};

/** "ST, LW" -> "Avant-centre". The codes themselves stay on the fiche. */
export function posFr(positions: string): string {
  const first = (positions.split(/[,\s]+/).find(Boolean) ?? "").toUpperCase();
  return POS_FR[first] ?? first;
}

export function posListFr(positions: string): string {
  return positions
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((c) => `${c} (${(POS_FR[c.toUpperCase()] ?? c).toLowerCase()})`)
    .join(", ");
}

export function rayonOfPerson(p: Person): Rayon {
  if (p.league === "Ligue 1") return "ligue1";
  if (p.league === "Ligue 2") return "ligue2";
  return "monde";
}

// ------------------------------------------------------------------ faces

const faceChunks = new Map<number, Promise<Record<string, string>>>();

export function loadFaceChunk(chunk: number): Promise<Record<string, string>> {
  let pending = faceChunks.get(chunk);
  if (!pending) {
    pending = fetchJson<Record<string, string>>(`data/faces-${chunk}.json`);
    faceChunks.set(chunk, pending);
    pending.catch(() => faceChunks.delete(chunk));
  }
  return pending;
}

const faceUrls = new Map<number, string>();

export function knownFace(id: number): string | undefined {
  return faceUrls.get(id);
}

export async function faceUrl(id: number, chunk: number): Promise<string | null> {
  const known = faceUrls.get(id);
  if (known) return known;
  if (chunk < 0) return null;
  const faces = await loadFaceChunk(chunk);
  const b64 = faces[String(id)];
  if (!b64) return null;
  const url = `data:image/webp;base64,${b64}`;
  faceUrls.set(id, url);
  return url;
}

// ------------------------------------------------------------------ FC24 / FC26 rows

export type Fc24 = {
  id: number;
  name: string;
  name_fold: string;
  born: string;
  height: string;
  weight: string;
  foot: string;
  positions: string;
  overall: number;
  potential: number;
  wage: string;
  value: string;
  nation: string;
  club: string;
  league: string;
  number: string;
  attrs: {
    weak_foot: number | null;
    skill_moves: number | null;
    reputation: number | null;
    work_rate: string;
    body_type: string;
    release_clause: string;
    club_position: string;
    club_joined: string;
    contract_until: string;
    nation_position: string;
    nation_number: string;
    play_styles: string;
    skills: Record<string, number | null>;
  };
};
export type Fc26 = {
  id: number;
  name: string;
  name_fold: string;
  positions: string;
  overall: number;
  potential: number;
  club: string;
  nation: string;
  pace: number | null;
  shooting: number | null;
  passing: number | null;
  dribbling: number | null;
  defending: number | null;
  physic: number | null;
  foot: string;
  height: string;
};

type Fc24File = { cols: string[]; attrKeys: string[]; skillKeys: string[]; rows: unknown[][] };
const fc24Chunks = new Map<number, Promise<Map<number, Fc24>>>();

export function loadFc24(chunk: number): Promise<Map<number, Fc24>> {
  let pending = fc24Chunks.get(chunk);
  if (!pending) {
    pending = fetchJson<Fc24File>(`data/fc24-${chunk}.json`).then((file) => {
      const out = new Map<number, Fc24>();
      const plainKeys = file.attrKeys.filter((k) => k !== "skills");
      for (const row of file.rows) {
        const rec: Record<string, unknown> = {};
        file.cols.forEach((col, i) => (rec[col] = row[i]));
        if (rec.name_fold == null) rec.name_fold = fold(rec.name as string);
        const values = rec.attrs as unknown[];
        const attrs: Record<string, unknown> = {};
        plainKeys.forEach((k, i) => (attrs[k] = values[i]));
        const skills: Record<string, number | null> = {};
        file.skillKeys.forEach((k, i) => (skills[k] = (values[values.length - 1] as (number | null)[])[i]));
        attrs.skills = skills;
        rec.attrs = attrs;
        out.set(rec.id as number, rec as unknown as Fc24);
      }
      return out;
    });
    fc24Chunks.set(chunk, pending);
    pending.catch(() => fc24Chunks.delete(chunk));
  }
  return pending;
}

const fc26Chunks = new Map<number, Promise<Map<number, Fc26>>>();

export function loadFc26(chunk: number): Promise<Map<number, Fc26>> {
  let pending = fc26Chunks.get(chunk);
  if (!pending) {
    pending = fetchJson<{ cols: string[]; rows: unknown[][] }>(`data/fc26-${chunk}.json`).then((file) => {
      const out = new Map<number, Fc26>();
      for (const row of file.rows) {
        const rec: Record<string, unknown> = {};
        file.cols.forEach((col, i) => (rec[col] = row[i]));
        if (rec.name_fold == null) rec.name_fold = fold(rec.name as string);
        out.set(rec.id as number, rec as unknown as Fc26);
      }
      return out;
    });
    fc26Chunks.set(chunk, pending);
    pending.catch(() => fc26Chunks.delete(chunk));
  }
  return pending;
}

// ------------------------------------------------------------------ Wikipedia, verified clubs

export type WikiPlayer = {
  id: number;
  name: string;
  name_fold: string;
  club: string;
  club_fold: string;
  league: string;
  number: string | null;
  pos: string;
  code: string;
  as_of: string | null;
  source: string;
  portrait: string | null;
};
export type Reel = { club: string; pos: string; num: string; source: string; asOf: string };
export type FifaHistory = {
  player_id: number;
  short_name: string;
  long_name: string;
  primary_position: string;
  secondary_positions: string[];
  overall: number;
  potential: number;
  age: number;
  dob: string;
  height_cm: number;
  weight_kg: number;
  nationality: string;
  club: string;
  league: string;
  preferred_foot: string;
  weak_foot: number;
  skill_moves: number;
  face_url: string;
  attributes: Record<string, number>;
  history: Record<string, { overall: number; club: string; position: string }>;
};
export type ReelDoubt = { listed: string[]; club: string; num: string; source: string };
export type Wiki = {
  reelDoubts: Record<string, ReelDoubt>;
  players: WikiPlayer[];
  squads: { id: string; league: string; name: string; wiki: string; asOf: string; kit: string; ink: string; players: { name: string; number: string; pos: string; code: string }[] }[];
  reel: Record<string, Reel>;
  fifaHistory: FifaHistory[];
};

let wikiPromise: Promise<Wiki> | null = null;

export function loadWiki(): Promise<Wiki> {
  if (!wikiPromise) {
    wikiPromise = Promise.all([
      fetchJson<Omit<Wiki, "reelDoubts">>("data/wiki.json"),
      fetchJson<Record<string, ReelDoubt>>("data/reel-doubts.json"),
    ]).then(([wiki, reelDoubts]) => ({ ...wiki, reelDoubts }));
    wikiPromise.catch(() => {
      wikiPromise = null;
    });
  }
  return wikiPromise;
}

// ------------------------------------------------------------------ scores

export type LigueMatch = {
  id: number;
  season: string;
  league: string;
  date: string;
  home: string;
  away: string;
  hg: number;
  ag: number;
  htg: number | null;
  atg: number | null;
  hs: number | null;
  away_shots: number | null;
  hst: number | null;
  ast: number | null;
  hc: number | null;
  ac: number | null;
  hy: number | null;
  ay: number | null;
  hr: number | null;
  ar: number | null;
  key: string;
};

type LiguesFile = { cols: string[]; teams: string[]; seasons: string[]; leagues: string[]; teamFold: Record<string, string>; rows: unknown[][] };
let liguesPromise: Promise<{ rows: LigueMatch[]; seasons: string[]; teams: string[] }> | null = null;

export function loadLigues() {
  if (!liguesPromise) {
    liguesPromise = fetchJson<LiguesFile>("data/ligues.json").then((file) => {
      const rows = file.rows.map((r) => {
        const rec: Record<string, unknown> = {};
        file.cols.forEach((col, i) => (rec[col] = r[i]));
        rec.season = file.seasons[rec.season as number];
        rec.league = file.leagues[rec.league as number];
        rec.home = file.teams[rec.home as number];
        rec.away = file.teams[rec.away as number];
        const hf = file.teamFold[rec.home as string] ?? fold(rec.home as string);
        const af = file.teamFold[rec.away as string] ?? fold(rec.away as string);
        rec.key = `${hf} ${af}`;
        return rec as unknown as LigueMatch;
      });
      return { rows, seasons: file.seasons.slice().sort(), teams: file.teams.slice().sort((a, b) => a.localeCompare(b, "fr")) };
    });
    liguesPromise.catch(() => {
      liguesPromise = null;
    });
  }
  return liguesPromise;
}

export type PaysMatch = {
  id: number;
  date: string;
  home: string;
  away: string;
  hg: number;
  ag: number;
  tournament: string;
  tournamentFr: string;
  worldCup: boolean;
  city: string;
  scorers: string;
  shootout: string | null;
  key: string;
};
export type PaysMeta = {
  cols: string[];
  teams: string[];
  teamFold: Record<string, string>;
  tournaments: [string, string][];
  cities: string[];
  periods: { from: string; to: string; file: string; count: number }[];
};

export function loadPaysMeta(): Promise<PaysMeta> {
  return fetchJson<PaysMeta>("data/pays-meta.json");
}

const paysChunks = new Map<string, Promise<PaysMatch[]>>();

export function loadPays(file: string): Promise<PaysMatch[]> {
  let pending = paysChunks.get(file);
  if (!pending) {
    pending = Promise.all([loadPaysMeta(), fetchJson<{ rows: unknown[][] }>(`data/${file}`)]).then(([meta, data]) =>
      data.rows.map((r) => {
        const rec: Record<string, unknown> = {};
        meta.cols.forEach((col, i) => (rec[col] = r[i]));
        const home = meta.teams[rec.home as number];
        const away = meta.teams[rec.away as number];
        const [t, tFr] = meta.tournaments[rec.tournament as number];
        const scorers = rec.scorers as string;
        return {
          id: rec.id as number,
          date: rec.date as string,
          home,
          away,
          hg: rec.hg as number,
          ag: rec.ag as number,
          tournament: t,
          tournamentFr: tFr,
          worldCup: rec.world_cup === 1,
          city: meta.cities[rec.city as number],
          scorers,
          shootout: rec.shootout as string | null,
          key: `${meta.teamFold[home] ?? fold(home)} ${meta.teamFold[away] ?? fold(away)} ${(rec.scorers_fold as string | null) ?? fold(scorers)}`,
        };
      }),
    );
    paysChunks.set(file, pending);
    pending.catch(() => paysChunks.delete(file));
  }
  return pending;
}

export function bornIsoOf(p: Player): string {
  return frenchDateToIso(p.born);
}
