import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { LuSearch, LuX } from "react-icons/lu";
import { albumCard, gameCard, type CardRef } from "../cards";
import { type Album, type Person, type Poste, loadPeople, posteOf, rayonOfPerson } from "../data";
import { useStore } from "../store";
import { Chips, Loading, More, PageTitle } from "../ui/bits";
import { Tile, cardRoute } from "../ui/cards";
import { fold, fmt } from "../util";

type Scope = "tous" | "album" | "ligue1" | "ligue2" | "monde" | "feminin" | "etoiles";
type Sort = "connus" | "note" | "nom" | "age" | "jeune";

const SCOPES: Array<[Scope, string]> = [
  ["tous", "Tous"], ["album", "Fiches de l'album"], ["ligue1", "Ligue 1"], ["ligue2", "Ligue 2"], ["monde", "Monde"], ["feminin", "Féminin"], ["etoiles", "Mes favoris"],
];
const POSTES: Array<[Poste | "tous", string]> = [["tous", "Tous les postes"], ["Gardien", "Gardiens"], ["Défenseur", "Défenseurs"], ["Milieu", "Milieux"], ["Attaquant", "Attaquants"]];
const SORTS: Array<[Sort, string]> = [["connus", "Les plus connus"], ["note", "Meilleure note"], ["nom", "Nom"], ["age", "Plus âgés"], ["jeune", "Plus jeunes"]];

type Entry = { card: CardRef; key: string; rayons: string[]; poste: Poste; name: string };

function readSaved(key: string, fallback: string): string {
  try {
    return sessionStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function Players({ album }: { album: Album }) {
  const state = useStore();
  const [q, setQ] = useState(() => readSaved("footdex.q", ""));
  const [scope, setScope] = useState<Scope>(() => readSaved("footdex.scope", "tous") as Scope);
  const [poste, setPoste] = useState<Poste | "tous">(() => readSaved("footdex.poste", "tous") as Poste | "tous");
  const [sort, setSort] = useState<Sort>(() => readSaved("footdex.sort", "connus") as Sort);
  const [shown, setShown] = useState(48);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const deferred = useDeferredValue(q);

  useEffect(() => {
    let alive = true;
    loadPeople()
      .then((p) => alive && setPeople(p.list))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => save("footdex.q", q), [q]);
  useEffect(() => save("footdex.scope", scope), [scope]);
  useEffect(() => save("footdex.poste", poste), [poste]);
  useEffect(() => save("footdex.sort", sort), [sort]);
  useEffect(() => setShown(48), [deferred, scope, poste, sort]);

  const albumEntries = useMemo<Entry[]>(
    () =>
      album.album.map((p) => ({
        card: albumCard(album, p),
        key: fold([p.display, p.short, p.club, p.country, p.position, p.place, ...p.clubs.map((c) => c.name)].join(" ")),
        rayons: p.rayons,
        poste: p.family,
        name: p.display,
      })),
    [album],
  );
  const gameEntries = useMemo<Entry[]>(
    () =>
      (people ?? [])
        .filter((p) => p.album.length === 0)
        .map((p) => ({ card: gameCard(p), key: p.key, rayons: [rayonOfPerson(p)], poste: posteOf(p.pos), name: p.name })),
    [people],
  );

  const results = useMemo(() => {
    const needle = fold(deferred.trim());
    const words = needle.split(/\s+/).filter(Boolean);
    const pool = scope === "album" ? albumEntries : [...albumEntries, ...gameEntries];
    const list = pool.filter((e) => {
      if (scope === "etoiles" && !state.fav.includes(e.card.id)) return false;
      if (scope !== "tous" && scope !== "album" && scope !== "etoiles" && !e.rayons.includes(scope)) return false;
      if (poste !== "tous" && e.poste !== poste) return false;
      return words.every((w) => e.key.includes(w));
    });
    const by: Record<Sort, (a: Entry, b: Entry) => number> = {
      connus: (a, b) => b.card.fame - a.card.fame || (b.card.rating ?? 0) - (a.card.rating ?? 0) || a.name.localeCompare(b.name, "fr"),
      note: (a, b) => (b.card.rating ?? -1) - (a.card.rating ?? -1) || a.name.localeCompare(b.name, "fr"),
      nom: (a, b) => a.card.short.localeCompare(b.card.short, "fr") || a.name.localeCompare(b.name, "fr"),
      age: (a, b) => (a.card.born || "9999").localeCompare(b.card.born || "9999"),
      jeune: (a, b) => (b.card.born || "0000").localeCompare(a.card.born || "0000"),
    };
    // Album fiches stay first when nothing is typed and the sort is "les plus connus".
    return list.sort(by[sort]);
  }, [albumEntries, gameEntries, deferred, scope, poste, sort, state.fav]);

  const total = album.album.length + (people ? gameEntries.length : 0);

  return (
    <div>
      <PageTitle kicker="Rayon joueurs" title="Tous les joueurs">
        <p>
          Les {fmt(album.album.length)} fiches de l'album et les {fmt(25229)} joueurs des fichiers du jeu EA Sports FC. Sur chaque fiche, le club est daté. Quand le club
          d'aujourd'hui n'a pas été revérifié, c'est écrit <abbr title="non communiqué">NC</abbr>.
        </p>
      </PageTitle>

      <div className="finder">
        <div className="search">
          <LuSearch aria-hidden="true" />
          <label htmlFor="q" className="sr">
            Nom, club ou pays
          </label>
          <input
            id="q"
            ref={input}
            value={q}
            onChange={(e: InputEvent) => setQ((e.target as HTMLInputElement).value)}
            placeholder="Nom, club ou pays : Haaland, Lens, Japon…"
            autoComplete="off"
            enterKeyHint="search"
          />
          {q ? (
            <button
              type="button"
              className="search__clear"
              aria-label="Effacer"
              onClick={() => {
                setQ("");
                input.current?.focus();
              }}
            >
              <LuX aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <Chips scroll label="Rayon" value={scope} options={SCOPES} onChange={setScope} />
        <div className="finder__row">
          <Chips scroll label="Poste" value={poste} options={POSTES} onChange={setPoste} />
          <label className="select">
            <span className="sr">Trier</span>
            <select id="tri" value={sort} onChange={(e: Event) => setSort((e.target as HTMLSelectElement).value as Sort)}>
              {SORTS.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="count" aria-live="polite">
        {fmt(results.length)} joueur{results.length > 1 ? "s" : ""}
        {!people && !failed ? " · chargement des 25 229 joueurs du jeu…" : ""}
        {failed ? " · les joueurs du jeu n'ont pas pu être chargés" : ""}
        {people && results.length !== total ? <span className="muted"> sur {fmt(total)}</span> : null}
      </p>

      {results.length === 0 ? (
        people ? (
          <p className="empty">Personne sous ce nom. Essaie un nom de famille, un club (« Lens ») ou un pays (« Japon »), ou enlève un filtre.</p>
        ) : (
          <Loading text="Chargement des joueurs…" />
        )
      ) : (
        <div className="tiles">
          {results.slice(0, shown).map((e) => (
            <Tile key={e.card.id} to={cardRoute(e.card)} card={e.card} owned={state.cards[e.card.id]?.[0]} starred={state.fav.includes(e.card.id)} />
          ))}
        </div>
      )}
      <More shown={shown} total={results.length} onMore={() => setShown((n) => n + 48)} />
    </div>
  );
}
