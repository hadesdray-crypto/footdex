import { useEffect, useMemo, useState } from "react";
import { LuBookOpen, LuCheck, LuLayers, LuLock, LuPackageOpen, LuStar, LuStore } from "react-icons/lu";
import { BACKS, CHEMINS, GROUPS, RARITIES, RARITY, cardById, cheminOf, drawRarity, openGroups, shopRarities, type CardRef, type GroupId, type Rarity } from "../cards";
import { albumPages } from "../collection";
import type { Album } from "../data";
import { buyCard, chooseBack, useStore } from "../store";
import { Chips, Link, Loading, More, PageTitle } from "../ui/bits";
import { CardViewer, Carte } from "../ui/cards";
import { Reveal, type Opening } from "../ui/reveal";
import { cx, fmt } from "../util";
import { Livre } from "./livre";
import { usePools } from "./packs";

type Tab = "cartes" | "livre" | "album" | "boutique";
type Sort = "recentes" | "rarete" | "connus" | "note" | "age" | "jeune" | "nom";
type Filter = "toutes" | Rarity | "brillantes";

const SORTS: Array<[Sort, string]> = [
  ["recentes", "Dernières reçues"], ["rarete", "Plus rares"], ["connus", "Les plus connus"], ["note", "Meilleure note"], ["age", "Plus âgés"], ["jeune", "Plus jeunes"], ["nom", "Nom"],
];
const TAB_KEY = "footdex.classeur";
const PAGE_KEY = "footdex.albumpage";

function readSession(key: string, fallback: string): string {
  try {
    return sessionStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
function writeSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Opens the binder on a given tab (the star counter of the top bar leads to the shop). */
export function openBinderTab(tab: Tab) {
  writeSession(TAB_KEY, tab);
}

let seq = 1000;

export function Binder({ album }: { album: Album }) {
  const state = useStore();
  const [tab, setTab] = useState<Tab>(() => readSession(TAB_KEY, "cartes") as Tab);
  const ch = cheminOf(state.opened);
  const hasGame = Object.keys(state.cards).some((id) => id.startsWith("g:"));
  const { pools, ready, people } = usePools(album, ch.index, hasGame);
  const byId = useMemo(() => cardById(pools), [pools]);
  const [viewing, setViewing] = useState<CardRef | null>(null);
  const [opening, setOpening] = useState<Opening | null>(null);
  useEffect(() => writeSession(TAB_KEY, tab), [tab]);

  const unique = Object.keys(state.cards).length;
  const copies = Object.values(state.cards).reduce((n, o) => n + o[0], 0);
  const shinies = Object.values(state.cards).reduce((n, o) => n + (o[3] > 0 ? 1 : 0), 0);

  function buy(r: Rarity) {
    const pulled = drawRarity(pools, ch.index, r, state.cards);
    const result = buyCard(pulled, RARITY[r].price);
    if (!result) return;
    setOpening({ id: ++seq, kind: "boutique", title: `Boutique · Carte ${RARITY[r].label}`, pulled, result, chemin: ch.index });
  }

  return (
    <div className="binder">
      <PageTitle kicker="Collection" title="Ton classeur">
        <p>Tes cartes, l'album à compléter page par page, et la boutique où dépenser tes étoiles.</p>
      </PageTitle>

      <dl className="statstrip">
        <div>
          <dt>Cartes différentes</dt>
          <dd>{fmt(unique)}</dd>
        </div>
        <div>
          <dt>Doublons</dt>
          <dd>{fmt(copies - unique)}</dd>
        </div>
        <div>
          <dt>Brillantes</dt>
          <dd>{fmt(shinies)}</dd>
        </div>
        <div>
          <dt>Étoiles</dt>
          <dd className="statstrip__stars">
            <LuStar aria-hidden="true" /> {fmt(state.stars)}
          </dd>
        </div>
      </dl>

      <div className="segmented" role="tablist" aria-label="Classeur">
        {(
          [
            ["cartes", "Mes cartes", LuLayers],
            ["livre", "Le livre", LuBookOpen],
            ["album", "L'album", LuBookOpen],
            ["boutique", "Boutique", LuStore],
          ] as const
        ).map(([id, label, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={cx("segmented__tab", tab === id && "segmented__tab--on")} onClick={() => setTab(id)}>
            <Icon aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {tab === "cartes" ? <MyCards byId={byId} waiting={hasGame && !people} onView={setViewing} pools={pools} chemin={ch.index} /> : null}
      {tab === "livre" ? <Livre byId={byId} /> : null}
      {tab === "album" ? <AlbumTab album={album} pools={pools} onView={setViewing} /> : null}
      {tab === "boutique" ? <Shop pools={pools} chemin={ch.index} ready={ready} onBuy={buy} /> : null}

      {viewing ? <CardViewer card={viewing} onClose={() => setViewing(null)} /> : null}
      {opening ? <Reveal key={opening.id} opening={opening} onClose={() => setOpening(null)} /> : null}
    </div>
  );
}

function MyCards({ byId, waiting, onView, pools, chemin }: { byId: Map<string, CardRef>; waiting: boolean; onView: (c: CardRef) => void; pools: ReturnType<typeof usePools>["pools"]; chemin: number }) {
  const state = useStore();
  const [sort, setSort] = useState<Sort>("recentes");
  const [filter, setFilter] = useState<Filter>("toutes");
  const [doubles, setDoubles] = useState(false);
  const [shown, setShown] = useState(40);
  const ownedIds = Object.keys(state.cards);

  const mine = useMemo(() => {
    const list = ownedIds.map((id) => byId.get(id)).filter((c): c is CardRef => !!c);
    const own = (c: CardRef) => state.cards[c.id];
    const filtered = list.filter(
      (c) =>
        (filter === "toutes" || (filter === "brillantes" ? own(c)[3] > 0 : c.rarity === filter)) && (!doubles || own(c)[0] > 1),
    );
    const order = (c: CardRef) => own(c)?.[2] ?? 0;
    const cmp: Record<Sort, (a: CardRef, b: CardRef) => number> = {
      recentes: (a, b) => order(b) - order(a),
      rarete: (a, b) => RARITY[b.rarity].rank - RARITY[a.rarity].rank || (own(b)[3] > 0 ? 1 : 0) - (own(a)[3] > 0 ? 1 : 0) || (b.rating ?? 0) - (a.rating ?? 0),
      connus: (a, b) => b.fame - a.fame || order(b) - order(a),
      note: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || order(b) - order(a),
      age: (a, b) => (a.born || "9999").localeCompare(b.born || "9999"),
      jeune: (a, b) => (b.born || "0000").localeCompare(a.born || "0000"),
      nom: (a, b) => a.short.localeCompare(b.short, "fr"),
    };
    return filtered.sort(cmp[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byId, state.cards, sort, filter, doubles]);

  if (ownedIds.length === 0) {
    return (
      <div className="emptybinder">
        <p>Ton classeur est vide pour l'instant. Chaque paquet y range 5 cartes.</p>
        <Link to={{ page: "paquets" }} className="btn btn--gold btn--big btn--glow">
          <LuPackageOpen aria-hidden="true" /> Ouvrir mon premier paquet
        </Link>
      </div>
    );
  }

  const shownGroups = (Object.keys(GROUPS) as GroupId[]).filter((g) => openGroups(chemin).includes(g) || pools[g].some((c) => state.cards[c.id]));
  return (
    <>
      <ul className="groupbars">
        {shownGroups.map((g) => {
          const size = pools[g].length;
          const got = pools[g].filter((c) => state.cards[c.id]).length;
          const known = size > 0;
          return (
            <li key={g}>
              <span className="groupbars__name">{GROUPS[g].name}</span>
              <span className="groupbars__count">{known ? `${fmt(got)} / ${fmt(size)}` : "…"}</span>
              <span className="groupbars__track" aria-hidden="true">
                <span style={{ width: known && size ? `${Math.max(got ? 1.5 : 0, (got / size) * 100)}%` : "0%" }} />
              </span>
            </li>
          );
        })}
      </ul>

      <div className="finder">
        <Chips
          scroll
          label="Rareté"
          value={filter}
          options={[["toutes", "Toutes"], ...RARITIES.map((r) => [r, RARITY[r].label] as [Filter, string]), ["brillantes", "Brillantes"]]}
          onChange={(v) => {
            setFilter(v);
            setShown(40);
          }}
        />
        <div className="finder__row">
          <label className="select">
            <span className="sr">Trier</span>
            <select id="tri-classeur" value={sort} onChange={(e: Event) => setSort((e.target as HTMLSelectElement).value as Sort)}>
              {SORTS.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="toggle">
            <input id="doublons" type="checkbox" checked={doubles} onChange={(e: Event) => setDoubles((e.target as HTMLInputElement).checked)} />
            <span>Doublons seulement</span>
          </label>
        </div>
      </div>

      {waiting ? <Loading text="Préparation de tes cartes du monde…" /> : null}
      <p className="count">
        {fmt(mine.length)} carte{mine.length > 1 ? "s" : ""}
      </p>
      <div className="binder__grid">
        {mine.slice(0, shown).map((card) => {
          const own = state.cards[card.id];
          return (
            <div key={card.id} className="binder__slot">
              <Carte card={card} count={own?.[0]} shiny={(own?.[3] ?? 0) > 0} size="sm" tilt={false} onClick={() => onView(card)} label={`${card.name}, carte ${RARITY[card.rarity].label}`} />
            </div>
          );
        })}
      </div>
      <More shown={shown} total={mine.length} step={40} onMore={() => setShown((n) => n + 40)} />
    </>
  );
}

function AlbumTab({ album, pools, onView }: { album: Album; pools: ReturnType<typeof usePools>["pools"]; onView: (c: CardRef) => void }) {
  const state = useStore();
  const pages = useMemo(() => albumPages(album, pools), [album, pools]);
  const [pageId, setPageId] = useState(() => readSession(PAGE_KEY, pages[0]?.id ?? ""));
  const page = pages.find((p) => p.id === pageId) ?? pages[0];
  const total = pages.reduce((n, p) => n + p.cards.length, 0);
  const got = pages.reduce((n, p) => n + p.cards.filter((c) => state.cards[c.id]).length, 0);
  const full = pages.filter((p) => p.cards.every((c) => state.cards[c.id])).length;
  if (!page) return null;
  const pageGot = page.cards.filter((c) => state.cards[c.id]).length;
  return (
    <>
      <p className="albumsum">
        <strong>{fmt(got)}</strong> / {fmt(total)} cartes collées dans l'album · {full} page{full > 1 ? "s" : ""} complète{full > 1 ? "s" : ""} sur {pages.length}
      </p>
      <div className="clubstrip" role="group" aria-label="Pages de l'album">
        {pages.map((p) => {
          const n = p.cards.filter((c) => state.cards[c.id]).length;
          const done = n === p.cards.length && n > 0;
          return (
            <button
              key={p.id}
              type="button"
              className={cx("clubbadge", p.id === page.id && "clubbadge--on", done && "clubbadge--done")}
              style={{ "--kit": p.kit, "--ink": p.ink, "--pct": `${(n / Math.max(1, p.cards.length)) * 100}%` }}
              aria-pressed={p.id === page.id}
              onClick={() => {
                setPageId(p.id);
                writeSession(PAGE_KEY, p.id);
              }}
            >
              <span className="clubbadge__ring">
                <span className="clubbadge__crest">{p.short}</span>
              </span>
              <span className="clubbadge__name">{p.title}</span>
              <span className="clubbadge__count">
                {n}/{p.cards.length}
              </span>
            </button>
          );
        })}
      </div>

      <section className="albumpage" style={{ "--kit": page.kit, "--ink": page.ink }}>
        <header className="albumpage__head">
          <span className="albumpage__crest" aria-hidden="true">
            {page.short}
          </span>
          <div>
            <p className="eyebrow">{page.kicker}</p>
            <h2 className="albumpage__title">{page.title}</h2>
          </div>
          <p className={cx("albumpage__count", pageGot === page.cards.length && "albumpage__count--done")}>
            {pageGot === page.cards.length ? (
              <>
                <LuCheck aria-hidden="true" /> Page complète
              </>
            ) : (
              `${pageGot} / ${page.cards.length}`
            )}
          </p>
        </header>
        <div className="slots">
          {page.cards.map((c) => {
            const own = state.cards[c.id];
            return own ? (
              <div key={c.id} className="slot slot--got">
                <Carte card={c} count={own[0]} shiny={own[3] > 0} size="sm" tilt={false} onClick={() => onView(c)} label={`${c.name}, carte ${RARITY[c.rarity].label}`} />
              </div>
            ) : (
              <div key={c.id} className={cx("slot slot--empty", `slot--${c.rarity}`)}>
                <span className="slot__num">{c.number ?? (c.kind === "moment" ? c.pos : "?")}</span>
                <span className="slot__name">{c.short}</span>
                <span className="slot__pos">{c.kind === "moment" ? c.sub : `${c.pos} · ${RARITY[c.rarity].label}`}</span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Shop({ pools, chemin, ready, onBuy }: { pools: ReturnType<typeof usePools>["pools"]; chemin: number; ready: boolean; onBuy: (r: Rarity) => void }) {
  const state = useStore();
  const sellable = useMemo(() => shopRarities(pools, chemin), [pools, chemin]);
  const ARRIVES: Partial<Record<Rarity, number>> = { moment: 4, legende: 5 };
  return (
    <>
      <section className="shop">
        <div className="shop__balance">
          <LuStar aria-hidden="true" />
          <strong>{fmt(state.stars)}</strong>
          <span>étoiles</span>
        </div>
        <p className="note">
          Les étoiles viennent des doublons (Base +2, Rare +5, Éclat +15, Légende et Moment +25, Brillante +40 en plus) et des récompenses du chemin. Une carte achetée est toujours une carte
          que tu n'as pas encore, quand il en reste.
        </p>
        <div className="offers">
          {RARITIES.map((r) => {
            const open = sellable.has(r);
            const price = RARITY[r].price;
            const missing = Math.max(0, price - state.stars);
            return (
              <article key={r} className={cx("offer", `offer--${r}`, !open && "offer--locked")} style={{ "--rc": RARITY[r].color }}>
                <span className="offer__gem" aria-hidden="true" />
                <h3 className="offer__name">Carte {RARITY[r].label}</h3>
                <p className="offer__text">{RARITY[r].text}</p>
                {open ? (
                  <button type="button" className="btn btn--gold" disabled={!ready || missing > 0} onClick={() => onBuy(r)}>
                    <LuStar aria-hidden="true" /> {fmt(price)}
                  </button>
                ) : (
                  <p className="offer__lock">
                    <LuLock aria-hidden="true" /> Arrive au chemin {(ARRIVES[r] ?? 0) + 1}
                  </p>
                )}
                {open && missing > 0 ? <p className="offer__need">Encore {fmt(missing)} étoiles</p> : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel backs" aria-label="Dos de cartes">
        <h2 className="section-title">Tes dos de cartes</h2>
        <p className="note">Un nouveau dos se gagne à 80 cartes sur chaque chemin. Le dos choisi est celui de tes cartes face cachée.</p>
        <ul className="backs__grid">
          {BACKS.map((b, i) => {
            const unlocked = state.backs.includes(b.id);
            const on = state.back === b.id;
            return (
              <li key={b.id} className={cx("backitem", on && "backitem--on", !unlocked && "backitem--locked")}>
                <span className={cx("back", `back--${b.id}`)} aria-hidden="true">
                  <span className="carte__monogram">F</span>
                  <span className="carte__backword">FOOTDEX</span>
                </span>
                <span className="backitem__name">{b.name}</span>
                {unlocked ? (
                  <button type="button" className={cx("btn btn--small", on ? "btn--gold" : "btn--soft")} aria-pressed={on} onClick={() => chooseBack(b.id)}>
                    {on ? "Choisi" : "Choisir"}
                  </button>
                ) : (
                  <span className="backitem__lock">
                    <LuLock aria-hidden="true" /> {i === 0 ? "" : `80 cartes du chemin ${Math.min(i, CHEMINS.length)}`}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
