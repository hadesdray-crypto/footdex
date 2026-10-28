// The album as pages, like a sticker album: the stars, the legends, the great nights, then one page per club.
import type { CardRef, Pools } from "./cards";
import type { Album, Poste } from "./data";
import { fold } from "./util";

export type AlbumPage = {
  id: string;
  title: string;
  kicker: string;
  short: string;
  kit: string;
  ink: string;
  cards: CardRef[];
};

const POSTE_ORDER: Record<Poste, number> = { Gardien: 0, Défenseur: 1, Milieu: 2, Attaquant: 3 };
/** Club names of the squads that do not contain the short name of the club. */
const ALIAS: Record<string, string> = { "stade rennais": "Rennes" };

/** Letters for the round badge of a club page: "PSG", "OL", "ASSÉ", "LOSC", "DFCO"… */
function crest(name: string): string {
  const words = name
    .replace(/[^\p{L}\s-]/gu, "")
    .split(/[\s-]+/)
    .filter((w) => w && !/^(de|du|des|la|les)$/.test(w));
  const caps = (w: string) => w === w.toUpperCase();
  const long = words.find((w) => w.length >= 4 && caps(w));
  if (long) return long;
  const letters = words.map((w) => (caps(w) ? w : w[0].toUpperCase())).join("");
  return letters.length >= 2 ? letters.slice(0, 4) : name.slice(0, 3).toUpperCase();
}

export function albumPages(album: Album, pools: Pools): AlbumPage[] {
  const clubs = album.effectifs.clubs;
  const keyOf = (name: string): string => {
    const f = fold(name);
    if (ALIAS[f]) return ALIAS[f];
    const hit = clubs
      .filter((c) => f.includes(fold(c.club)))
      .sort((a, b) => b.club.length - a.club.length)[0];
    return hit ? hit.club : name;
  };
  const byClub = new Map<string, CardRef[]>();
  for (const card of pools.france) {
    const p = album.byId.get(card.target);
    const key = keyOf(p?.club ?? card.club);
    const list = byClub.get(key) ?? [];
    list.push(card);
    byClub.set(key, list);
  }
  const order = (c: CardRef) => {
    const p = album.byId.get(c.target);
    return [p ? POSTE_ORDER[p.family] ?? 9 : 9, c.number ?? 999] as const;
  };
  const pages: AlbumPage[] = [];
  const special: Array<[string, string, string, string, CardRef[], string, string]> = [
    ["stars", "Les stars", "STARS", "Grandes fiches en activité", pools.stars, "#2a2208", "#ffd76a"],
    ["legendes", "Les légendes", "LÉG", "Carrières terminées", pools.legendes, "#2b2416", "#f3e2b8"],
    ["moments", "Les grands soirs", "SOIRS", "Matchs racontés", pools.moments, "#0c1a44", "#8af3ff"],
  ];
  for (const [id, title, short, kicker, cards, kit, ink] of special) {
    pages.push({ id, title, kicker, short, kit, ink, cards: [...cards].sort((a, b) => b.fame - a.fame) });
  }
  const leagueOf = new Map(clubs.map((c) => [c.club, c.ligue] as const));
  const rank = (name: string) => (leagueOf.get(name) === "Ligue 1" ? 0 : leagueOf.get(name) === "Ligue 2" ? 1 : 2);
  const names = [...byClub.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "fr"));
  for (const name of names) {
    const cards = byClub.get(name)!.sort((a, b) => {
      const [pa, na] = order(a);
      const [pb, nb] = order(b);
      return pa - pb || na - nb || a.short.localeCompare(b.short, "fr");
    });
    const first = album.byId.get(cards[0].target);
    pages.push({
      id: `club-${fold(name).replace(/[^a-z0-9]+/g, "-")}`,
      title: name,
      kicker: leagueOf.get(name) ?? "Saison 2026-2027",
      short: crest(first?.club ?? name),
      kit: first?.kit ?? "#1d2a44",
      ink: first?.ink ?? "#ffffff",
      cards,
    });
  }
  return pages;
}
