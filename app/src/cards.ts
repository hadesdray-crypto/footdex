// Collectible cards: rarities, the path of chapters, pools and packs.
import { type Album, type Match, type Person, type Player, bornIsoOf, gameOverall, posFr, posteOf } from "./data";
import { random } from "./util";

export type Rarity = "base" | "rare" | "eclat" | "legende" | "moment";

export const RARITY: Record<Rarity, { label: string; text: string; color: string; rank: number; stars: number; price: number }> = {
  base: { label: "Base", text: "Un joueur de l'effectif.", color: "#c9d4ea", rank: 0, stars: 2, price: 50 },
  rare: { label: "Rare", text: "Un joueur solide, très bien noté.", color: "#ff5a76", rank: 1, stars: 5, price: 80 },
  eclat: { label: "Éclat", text: "Une star : les meilleures notes, ou une grande fiche de l'album.", color: "#ffcf4f", rank: 2, stars: 15, price: 150 },
  legende: { label: "Légende", text: "Une légende dont la carrière est finie.", color: "#f3e2b8", rank: 3, stars: 25, price: 250 },
  moment: { label: "Moment", text: "Un grand match raconté dans l'album.", color: "#8af3ff", rank: 3, stars: 25, price: 250 },
};
export const SHINY_STARS = 40;
export const SHINY_CHANCE = 1 / 60;
export const RARITIES: Rarity[] = ["base", "rare", "eclat", "legende", "moment"];

export type GroupId = "france" | "stars" | "jeunes" | "europe" | "monde" | "moments" | "legendes";

export const GROUPS: Record<GroupId, { name: string; text: string }> = {
  france: { name: "Ligue 1 et Ligue 2", text: "Les effectifs 2026-2027 des clubs français." },
  stars: { name: "Les stars", text: "Les grandes fiches de l'album encore en activité." },
  jeunes: { name: "Les jeunes talents", text: "Les joueurs du monde nés en 2004 ou après, dans les fichiers du jeu." },
  europe: { name: "Les grands championnats", text: "Angleterre, Espagne, Italie, Allemagne et France, dans les fichiers du jeu." },
  monde: { name: "Le monde entier", text: "Tous les autres joueurs des fichiers du jeu qui ont une photo." },
  moments: { name: "Les grands soirs", text: "Les matchs racontés dans l'album." },
  legendes: { name: "Les légendes", text: "Les grandes fiches des joueurs qui ont fini leur carrière." },
};

export const CARDS_PER_CHEMIN = 100;

/** `tone`: the two colours of the path's pack wrapper, light then deep. */
export type Chemin = { id: string; name: string; place: string; text: string; adds: GroupId[]; tone: [string, string] };

export const CHEMINS: Chemin[] = [
  { id: "quartier", name: "Le terrain du quartier", place: "Le premier ballon", text: "Les joueurs de Ligue 1 et de Ligue 2, et parfois une star.", adds: ["france", "stars"], tone: ["#2fd38a", "#0a3b2b"] },
  { id: "formation", name: "Le centre de formation", place: "Les espoirs", text: "Les jeunes talents du monde entrent dans les paquets.", adds: ["jeunes"], tone: ["#38c8e0", "#08323d"] },
  { id: "europe", name: "Les nuits européennes", place: "Sous les projecteurs", text: "Les joueurs des grands championnats européens arrivent.", adds: ["europe"], tone: ["#6f8bff", "#0d1a4d"] },
  { id: "monde", name: "Le tour du monde", place: "Tous les continents", text: "Tous les joueurs du monde peuvent sortir.", adds: ["monde"], tone: ["#ff9a4a", "#46190a"] },
  { id: "grands-soirs", name: "Les grands soirs", place: "Les finales", text: "Les cartes Moment des grands matchs arrivent.", adds: ["moments"], tone: ["#e070ff", "#2d0a42"] },
  { id: "pantheon", name: "Le Panthéon", place: "Les légendes", text: "Les légendes entrent dans les paquets.", adds: ["legendes"], tone: ["#f3dfa8", "#4a3714"] },
  { id: "champions", name: "Le chemin des champions", place: "Sans fin", text: "Toutes les cartes, et un niveau de plus tous les 100 cartes.", adds: [], tone: ["#ffd76a", "#17120a"] },
];

export type Reward =
  | { type: "stars"; amount: number }
  | { type: "gift"; gift: GiftKind }
  | { type: "back"; back: string };
export type GiftKind = "cadeau" | "rare" | "eclat" | "legende";

export const GIFT_LABEL: Record<GiftKind, string> = {
  cadeau: "Paquet cadeau de 5 cartes",
  rare: "Carte Rare garantie",
  eclat: "Carte Éclat garantie",
  legende: "Carte Légende garantie",
};

/** Rewards met every 20 cards along each path. */
export function milestoneRewards(step: number, chemin: number): Reward[] {
  switch (step) {
    case 20: return [{ type: "stars", amount: 20 }];
    case 40: return [{ type: "gift", gift: "cadeau" }];
    case 60: return [{ type: "gift", gift: "rare" }];
    case 80: return [{ type: "back", back: `dos-${Math.min(chemin, CHEMINS.length - 1) + 1}` }, { type: "stars", amount: 30 }];
    case 100: return [{ type: "gift", gift: chemin === 0 ? "eclat" : "legende" }];
    default: return [];
  }
}

export const MILESTONES = [20, 40, 60, 80, 100];

export function cheminOf(opened: number): { index: number; step: number; level: number } {
  const raw = Math.floor(opened / CARDS_PER_CHEMIN);
  const index = Math.min(raw, CHEMINS.length - 1);
  return { index, step: opened - raw * CARDS_PER_CHEMIN, level: raw - index + 1 };
}

export const BACKS: { id: string; name: string }[] = [
  { id: "dos-0", name: "Le dos classique" },
  { id: "dos-1", name: "Le terrain" },
  { id: "dos-2", name: "Le centre" },
  { id: "dos-3", name: "Les projecteurs" },
  { id: "dos-4", name: "Le globe" },
  { id: "dos-5", name: "La finale" },
  { id: "dos-6", name: "Le Panthéon" },
  { id: "dos-7", name: "Le champion" },
];

export const CARDS_PER_PACK = 5;

export type Visual =
  | { type: "portrait"; src: string }
  | { type: "face"; id: number; chunk: number }
  | { type: "match"; src: string | null; video: string | null; home: string; away: string; score: string }
  | { type: "none" };

export type CardRef = {
  id: string;
  kind: "album" | "game" | "moment";
  target: string;
  rarity: Rarity;
  group: GroupId;
  name: string;
  short: string;
  sub: string;
  pos: string;
  club: string;
  nation: string;
  number: number | null;
  rating: number | null;
  serial: string;
  visual: Visual;
  /** Small picture for lists, when the album has one. */
  thumb?: string;
  kit?: string;
  ink?: string;
  fame: number;
  born: string;
  line: string;
  /** Three clues shown one by one before a big card is revealed. */
  clues: [string, string, string];
};

const MATCH_MEDIA = new Set(["finale-1998", "main-de-dieu", "psg-2025", "euro-2000"]);

export function matchPoster(id: string): string | null {
  return MATCH_MEDIA.has(id) ? `media/${id}.webp` : null;
}
export function matchVideo(id: string): string | null {
  return MATCH_MEDIA.has(id) ? `media/${id}.mp4` : null;
}

function eraClosed(era: string): boolean {
  return /–\s*\d{4}\s*$/.test(era);
}

const POS_SHORT: Record<string, string> = { Gardien: "GAR", Défenseur: "DÉF", Milieu: "MIL", Attaquant: "ATT" };

export function albumRarity(album: Album, p: Player): Rarity {
  const ovr = gameOverall(album, p) ?? 0;
  if (p._src === "curated") {
    if (eraClosed(p.era)) return "legende";
    if (p.rarity === "legende" || ovr >= 88) return "eclat";
    return "rare";
  }
  if (ovr >= 85) return "eclat";
  if (ovr >= 77) return "rare";
  return "base";
}

export function gameRarity(ovr: number): Rarity {
  if (ovr >= 86) return "eclat";
  if (ovr >= 78) return "rare";
  return "base";
}

const FAME: Record<string, number> = { legende: 600, icone: 500, cadre: 400, talent: 0 };

export function albumCard(album: Album, p: Player): CardRef {
  const rarity = albumRarity(album, p);
  const ovr = gameOverall(album, p);
  const portrait = album.portraits[p.id];
  const face = album.faceOf.get(p.id);
  let visual: Visual = { type: "none" };
  if (portrait) visual = { type: "portrait", src: `img${portrait.src}` };
  else if (face) visual = { type: "face", id: face.id, chunk: face.chunk };
  const dex = album.dex.get(p.id) ?? 0;
  return {
    id: `a:${p.id}`,
    kind: "album",
    target: p.id,
    rarity,
    group: p._src === "curated" ? (rarity === "legende" ? "legendes" : "stars") : "france",
    name: p.display,
    short: p.short,
    sub: `${p.position} · ${p.club}`,
    pos: POS_SHORT[p.family] ?? p.family.slice(0, 3).toUpperCase(),
    club: p.club,
    nation: p.code,
    number: p.number,
    rating: ovr,
    serial: `n° ${String(dex).padStart(4, "0")} / ${album.album.length.toLocaleString("fr-FR")}`,
    visual,
    thumb: album.smallPortraits.has(p.id) ? `img/players/sm/${p.id}.webp` : undefined,
    kit: p.kit,
    ink: p.ink,
    fame: (FAME[p.rarity] ?? 0) + (ovr ?? 0),
    born: bornIsoOf(p),
    line: p._src === "curated" ? p.era : `Saison ${p.era}`,
    clues: [p.country, p.position, p.club],
  };
}

const TOP_LEAGUES = new Set(["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1"]);

export function gameGroup(person: Person): GroupId {
  if (person.born && person.born >= "2004-01-01") return "jeunes";
  if (TOP_LEAGUES.has(person.league)) return "europe";
  return "monde";
}

export function gameCard(person: Person): CardRef {
  const year = person.clubYear === 2026 ? "club vérifié, 2026" : person.clubYear === 2025 ? "jeu, sept. 2025" : "jeu, sept. 2023";
  const poste = posteOf(person.pos);
  return {
    id: `g:${person.id}`,
    kind: "game",
    target: String(person.id),
    rarity: gameRarity(person.ovr),
    group: gameGroup(person),
    name: person.name,
    short: lastName(person.name),
    sub: `${posFr(person.pos) || "?"} · ${person.club}`,
    pos: POS_SHORT[poste],
    club: person.club,
    nation: person.nation,
    number: null,
    rating: person.ovr || null,
    serial: `Jeu n° ${person.id}`,
    visual: person.face ? { type: "face", id: person.id, chunk: person.chunk } : { type: "none" },
    fame: person.rep * 100 + person.ovr,
    born: person.born,
    line: `${person.club} (${year})`,
    clues: [person.nation, posFr(person.pos) || poste, person.club],
  };
}

export function momentCard(m: Match, index: number, total: number): CardRef {
  const year = m.date.match(/\d{4}$/)?.[0] ?? "";
  return {
    id: `m:${m.id}`,
    kind: "moment",
    target: m.id,
    rarity: "moment",
    group: "moments",
    name: m.title,
    short: m.title.replace(/(\d+)-(\d+)/, "$1‑$2"),
    sub: m.competition,
    pos: year,
    club: m.stadium,
    nation: year,
    number: null,
    rating: null,
    serial: `Moment ${index + 1} / ${total}`,
    visual: { type: "match", src: matchPoster(m.id), video: matchVideo(m.id), home: m.home, away: m.away, score: m.score },
    fame: 700,
    born: "",
    line: `${m.date} · ${m.stadium}`,
    clues: [m.competition, m.date, m.stadium],
  };
}

function lastName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return name;
  const last = words[words.length - 1];
  return last.length <= 3 && words.length > 1 ? words.slice(-2).join(" ") : last;
}

export type Pools = Record<GroupId, CardRef[]>;

/** Every card that exists, by group. The world groups need the people index. */
export function buildPools(album: Album, people: Person[] | null): Pools {
  const pools: Pools = { france: [], stars: [], jeunes: [], europe: [], monde: [], moments: [], legendes: [] };
  for (const p of album.album) {
    const card = albumCard(album, p);
    pools[card.group].push(card);
  }
  album.matches.forEach((m, i) => pools.moments.push(momentCard(m, i, album.matches.length)));
  if (people) {
    for (const person of people) {
      if (person.album.length > 0 || !person.face) continue;
      const card = gameCard(person);
      pools[card.group].push(card);
    }
  }
  return pools;
}

export function cardById(pools: Pools): Map<string, CardRef> {
  const map = new Map<string, CardRef>();
  for (const list of Object.values(pools)) for (const c of list) map.set(c.id, c);
  return map;
}

/** Groups open on a given path index (each path adds its groups to the earlier ones). */
export function openGroups(chemin: number): GroupId[] {
  return CHEMINS.slice(0, Math.min(chemin, CHEMINS.length - 1) + 1).flatMap((c) => c.adds);
}

export function needsPeople(groups: GroupId[]): boolean {
  return groups.some((g) => g === "jeunes" || g === "europe" || g === "monde");
}

export type Pulled = { card: CardRef; shiny: boolean };

export const SLOT_ODDS: Record<"normal" | "last", Record<Rarity, number>> = {
  normal: { base: 72, rare: 22, eclat: 4.4, legende: 0.8, moment: 0.8 },
  last: { base: 0, rare: 68, eclat: 24, legende: 4, moment: 4 },
};

/**
 * How often each group is picked once the rarity is drawn. The French clubs fill most packs at the
 * start ("parfois une star"); the groups brought by the newest path count twice, so they show up.
 */
const GROUP_WEIGHT: Record<GroupId, number> = { france: 6, stars: 1, jeunes: 3, europe: 4, monde: 3, moments: 1, legendes: 1 };

type Draw = { pools: Pools; groups: GroupId[]; boost: Set<GroupId>; owned: Record<string, unknown>; taken: Set<string> };

function drawContext(pools: Pools, chemin: number, owned: Record<string, unknown>, extra: GroupId[] = []): Draw {
  const groups = [...new Set([...openGroups(chemin), ...extra])];
  const index = Math.min(chemin, CHEMINS.length - 1);
  const boost = new Set<GroupId>(index > 0 ? CHEMINS[index].adds : []);
  return { pools, groups, boost, owned, taken: new Set() };
}

function pickFrom<T>(items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

function pickWeighted<T>(items: Array<[T, number]>): T | null {
  const total = items.reduce((n, [, w]) => n + w, 0);
  if (items.length === 0 || total <= 0) return null;
  let roll = random() * total;
  for (const [item, w] of items) {
    roll -= w;
    if (roll <= 0) return item;
  }
  return items[items.length - 1][0];
}

function availableRarities(d: Draw): Set<Rarity> {
  const out = new Set<Rarity>();
  for (const g of d.groups) for (const c of d.pools[g]) if (!d.taken.has(c.id)) out.add(c.rarity);
  return out;
}

function rollRarity(odds: Record<Rarity, number>, available: Set<Rarity>, floor: Rarity | null): Rarity | null {
  const allowed = RARITIES.filter((r) => available.has(r) && (!floor || RARITY[r].rank >= RARITY[floor].rank));
  if (allowed.length === 0) return null;
  return pickWeighted(allowed.map((r) => [r, odds[r]] as [Rarity, number])) ?? pickFrom(allowed);
}

/** One card of a given rarity: a group by weight, then a card, preferring cards the child does not have yet. */
function cardOf(d: Draw, rarity: Rarity, preferNew: number): CardRef | null {
  const groups = d.groups
    .filter((g) => d.pools[g].some((c) => c.rarity === rarity && !d.taken.has(c.id)))
    .map((g) => [g, GROUP_WEIGHT[g] * (d.boost.has(g) ? 2 : 1)] as [GroupId, number]);
  const group = pickWeighted(groups);
  if (!group) return null;
  const candidates = d.pools[group].filter((c) => c.rarity === rarity && !d.taken.has(c.id));
  const fresh = candidates.filter((c) => !d.owned[c.id]);
  return pickFrom(fresh.length > 0 && random() < preferNew ? fresh : candidates);
}

function drawOne(d: Draw, odds: Record<Rarity, number>, floor: Rarity | null): CardRef | null {
  const rarity = rollRarity(odds, availableRarities(d), floor);
  return rarity ? cardOf(d, rarity, 0.6) : null;
}

/** A pack of 5 different cards from the groups open on this path. The 5th is at least Rare when the groups have one. */
export function drawPack(pools: Pools, chemin: number, owned: Record<string, unknown>): Pulled[] {
  const d = drawContext(pools, chemin, owned);
  const out: Pulled[] = [];
  for (let slot = 0; slot < CARDS_PER_PACK; slot++) {
    const last = slot === CARDS_PER_PACK - 1;
    const card = drawOne(d, last ? SLOT_ODDS.last : SLOT_ODDS.normal, null) ?? drawOne(d, SLOT_ODDS.normal, null);
    if (!card) break;
    d.taken.add(card.id);
    out.push({ card, shiny: random() < SHINY_CHANCE });
  }
  return out;
}

/** A single guaranteed card for a reward. A Légende comes from the legends even before their path opens. */
export function drawGift(pools: Pools, chemin: number, kind: GiftKind, owned: Record<string, unknown>): Pulled[] {
  if (kind === "cadeau") return drawPack(pools, chemin, owned);
  const d = drawContext(pools, chemin, owned, kind === "legende" ? ["legendes"] : []);
  const floor: Rarity = kind === "legende" ? "legende" : kind === "eclat" ? "eclat" : "rare";
  const odds = { ...SLOT_ODDS.last, legende: kind === "legende" ? 100 : SLOT_ODDS.last.legende, moment: kind === "legende" ? 0 : SLOT_ODDS.last.moment };
  const card = drawOne(d, odds, floor) ?? drawOne(d, SLOT_ODDS.last, "rare");
  return card ? [{ card, shiny: random() < SHINY_CHANCE * 2 }] : [];
}

/** Rarities the shop can sell on this path: only those the open groups have. */
export function shopRarities(pools: Pools, chemin: number): Set<Rarity> {
  return availableRarities(drawContext(pools, chemin, {}));
}

/** A card bought with stars: the rarity chosen, a card the child does not have whenever there is one. */
export function drawRarity(pools: Pools, chemin: number, rarity: Rarity, owned: Record<string, unknown>): Pulled[] {
  const card = cardOf(drawContext(pools, chemin, owned), rarity, 1);
  return card ? [{ card, shiny: random() < SHINY_CHANCE }] : [];
}

/** Reveal order: the best card comes last. */
export function byValue(a: Pulled, b: Pulled): number {
  return RARITY[a.card.rarity].rank - RARITY[b.card.rarity].rank || Number(a.shiny) - Number(b.shiny) || (a.card.rating ?? 0) - (b.card.rating ?? 0);
}

export function isBig(p: Pulled): boolean {
  return p.shiny || RARITY[p.card.rarity].rank >= 2;
}
