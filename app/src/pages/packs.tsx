import { useEffect, useMemo, useState } from "react";
import { LuCheck, LuGift, LuGraduationCap, LuPackageOpen, LuStar } from "react-icons/lu";
import {
  CARDS_PER_CHEMIN, CHEMINS, GIFT_LABEL, RARITIES, RARITY, SHINY_STARS, SLOT_ODDS, buildPools, byValue, cheminOf, drawGift, drawPack, needsPeople, openGroups,
  type GiftKind, type Pools, type Pulled, type Rarity,
} from "../cards";
import { type Album, type Person, loadPeople } from "../data";
import { type Gift, type PackKind, getState, packStatus, recordPack, useStore } from "../store";
import { Failure, Link, Loading } from "../ui/bits";
import { Chapters, PathMap, RewardList } from "../ui/chemin";
import { PackArt } from "../ui/pack";
import { Reveal, type Opening } from "../ui/reveal";
import { fmt, shortDate } from "../util";

export function usePeople(needed: boolean): { people: Person[] | null; failed: boolean } {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!needed || people) return;
    let alive = true;
    loadPeople()
      .then((p) => alive && setPeople(p.list))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [needed, people]);
  return { people, failed };
}

/** Every card that can come out on this path. The world groups wait for the people index. */
export function usePools(album: Album, chemin: number, alsoPeople = false): { pools: Pools; ready: boolean; failed: boolean; people: Person[] | null } {
  const need = needsPeople(openGroups(chemin)) || alsoPeople;
  const { people, failed } = usePeople(need);
  const pools = useMemo(() => buildPools(album, people), [album, people]);
  return { pools, ready: !needsPeople(openGroups(chemin)) || people !== null, failed, people };
}

let openingSeq = 0;

const KIND_TITLE: Record<PackKind, string> = {
  jour: "Paquet du jour",
  bonus: "Paquet bonus",
  cadeau: "Paquet cadeau",
  rare: "Carte Rare garantie",
  eclat: "Carte Éclat garantie",
  legende: "Carte Légende garantie",
  boutique: "Boutique",
};

/** Records the pack first (nothing is lost if the page closes), then hands the cards to the opening scene. */
export function startOpening(kind: PackKind, pulled: Pulled[], giftId?: string, title?: string): Opening | null {
  if (pulled.length === 0) return null;
  const chemin = cheminOf(getState().opened).index;
  const result = recordPack(kind, pulled, giftId);
  return { id: ++openingSeq, kind, title: title ?? KIND_TITLE[kind], pulled: [...pulled].sort(byValue), result, chemin };
}

/** The home page asks for the daily pack to open as soon as this page is ready. */
export const AUTO_OPEN = "footdex.ouvrir";

const ARRIVES: Partial<Record<Rarity, number>> = { moment: 4, legende: 5 };

function pct(n: number): string {
  return `${n >= 10 ? Math.round(n) : n.toFixed(1).replace(".", ",")} %`;
}

export function Packs({ album }: { album: Album }) {
  const state = useStore();
  const status = packStatus(state);
  const ch = cheminOf(state.opened);
  const chemin = CHEMINS[ch.index];
  const hasGame = Object.keys(state.cards).some((id) => id.startsWith("g:"));
  const { pools, ready, failed, people } = usePools(album, ch.index, hasGame);
  const [opening, setOpening] = useState<Opening | null>(null);

  function openPack(kind: "jour" | "bonus") {
    const s = getState();
    const st = packStatus(s);
    if (kind === "jour" ? !st.free : !st.bonus) return;
    const next = startOpening(kind, drawPack(pools, cheminOf(s.opened).index, s.cards));
    if (next) setOpening(next);
  }

  function openGift(gift?: Gift) {
    const s = getState();
    const g = gift ?? s.gifts[0];
    if (!g) return;
    if (!ready) {
      // The players of the new path are still loading: the gift opens as soon as they are there.
      try {
        sessionStorage.setItem(AUTO_OPEN, "cadeau");
      } catch {
        /* ignore */
      }
      return;
    }
    const next = startOpening(g.kind, drawGift(pools, cheminOf(s.opened).index, g.kind, s.cards), g.id);
    if (next) setOpening(next);
  }

  useEffect(() => {
    if (!ready) return;
    let wanted: string | null = null;
    try {
      wanted = sessionStorage.getItem(AUTO_OPEN);
      sessionStorage.removeItem(AUTO_OPEN);
    } catch {
      /* ignore */
    }
    if (wanted === "jour") openPack("jour");
    else if (wanted === "cadeau") openGift();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const groups = openGroups(ch.index);
  const counts = useMemo(() => {
    const out: Record<Rarity, number> = { base: 0, rare: 0, eclat: 0, legende: 0, moment: 0 };
    for (const g of groups) for (const c of pools[g]) out[c.rarity] += 1;
    return out;
  }, [pools, groups]);
  const odds = (slot: "normal" | "last", r: Rarity) => {
    const avail = RARITIES.filter((x) => counts[x] > 0);
    const total = avail.reduce((n, x) => n + SLOT_ODDS[slot][x], 0);
    return counts[r] > 0 && total > 0 ? (SLOT_ODDS[slot][r] / total) * 100 : 0;
  };
  const poolSize = groups.reduce((n, g) => n + pools[g].length, 0);

  return (
    <div className="packs">
      <section className="packhero" style={{ "--p1": chemin.tone[0], "--p2": chemin.tone[1] }}>
        <div className="packhero__text">
          <p className="eyebrow">
            Chemin {ch.index + 1} sur {CHEMINS.length} · {chemin.place}
            {ch.index === CHEMINS.length - 1 ? ` · niveau ${ch.level}` : ""}
          </p>
          <h1 className="display">{chemin.name}</h1>
          <p className="lede">{chemin.text}</p>
          <p className="packhero__count">
            <strong>{fmt(ch.step)}</strong> / {CARDS_PER_CHEMIN} cartes sur ce chemin · {fmt(state.opened)} cartes ouvertes en tout
          </p>
        </div>
        <div className="packhero__pack">
          <PackArt kind="jour" chemin={ch.index} className="paquet--float" />
        </div>
        <div className="packhero__actions">
          {!ready ? failed ? <Failure text="Les joueurs du monde n'ont pas pu être chargés. Vérifie la connexion." /> : <Loading text="Préparation des cartes du chemin…" /> : null}
          <button type="button" className="btn btn--gold btn--big btn--glow" disabled={!status.free || !ready} onClick={() => openPack("jour")}>
            <LuPackageOpen aria-hidden="true" />
            {status.free ? "Ouvrir le paquet du jour" : "Paquet du jour ouvert"}
          </button>
          {status.bonus ? (
            <button type="button" className="btn btn--pitch btn--big" disabled={!ready} onClick={() => openPack("bonus")}>
              <LuGift aria-hidden="true" /> Ouvrir le paquet bonus
            </button>
          ) : status.bonusLocked ? (
            <Link to={{ page: "defi" }} className="btn btn--soft btn--big">
              <LuGraduationCap aria-hidden="true" /> Gagner un bonus au défi
            </Link>
          ) : (
            <p className="packhero__done">
              <LuCheck aria-hidden="true" /> Paquet bonus déjà ouvert aujourd'hui.
            </p>
          )}
          {!status.free && !status.bonus ? <p className="packhero__done">Les paquets reviennent demain.</p> : null}
        </div>
      </section>

      {state.gifts.length > 0 ? (
        <section className="gifts" aria-label="Tes cadeaux">
          <h2 className="section-title">
            <LuGift aria-hidden="true" /> Tes cadeaux
          </h2>
          <ul className="gifts__list">
            {state.gifts.map((g) => (
              <li key={g.id} className={`gift gift--${g.kind}`}>
                <PackArt kind={g.kind} chemin={ch.index} className="gift__art" />
                <span className="gift__text">
                  <strong>{GIFT_LABEL[g.kind as GiftKind]}</strong>
                  <small>{g.from}</small>
                </span>
                <button type="button" className="btn btn--gold" disabled={!ready} onClick={() => openGift(g)}>
                  Ouvrir
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel pathpanel" aria-label="Ton chemin">
        <div className="pathpanel__head">
          <h2 className="section-title">Ton chemin</h2>
          <p className="note">Chaque carte ouverte fait avancer le ballon. Une récompense tous les 20 cartes ; à 100 cartes, un nouveau chemin s'ouvre, avec d'autres joueurs dans les paquets.</p>
        </div>
        <div className="pathpanel__grid">
          <PathMap opened={state.opened} />
          <RewardList opened={state.opened} />
        </div>
      </section>

      <section className="block" aria-label="Les sept chemins">
        <h2 className="section-title">Les {CHEMINS.length} chemins</h2>
        <Chapters opened={state.opened} />
      </section>

      <section className="panel odds">
        <h2 className="section-title">Ce qu'il y a dans un paquet</h2>
        <p className="note">
          5 cartes différentes, tirées parmi les {ready ? fmt(poolSize) : "…"} cartes de ce chemin. La 5<sup>e</sup> est toujours au moins Rare. Une carte déjà reçue est un doublon : elle
          rapporte des étoiles, à dépenser dans la boutique du classeur.
        </p>
        <div className="tablewrap">
          <table className="oddstable">
            <thead>
              <tr>
                <th scope="col">Rareté</th>
                <th scope="col">Cartes 1 à 4</th>
                <th scope="col">Carte 5</th>
                <th scope="col">Doublon</th>
              </tr>
            </thead>
            <tbody>
              {RARITIES.map((r) => (
                <tr key={r}>
                  <th scope="row">
                    <span className={`dot dot--${r}`} aria-hidden="true" /> {RARITY[r].label}
                    <small>{counts[r] > 0 ? `${fmt(counts[r])} cartes` : `arrive au chemin ${(ARRIVES[r] ?? 0) + 1}`}</small>
                  </th>
                  <td>{counts[r] > 0 ? pct(odds("normal", r)) : "–"}</td>
                  <td>{counts[r] > 0 ? (odds("last", r) > 0 ? pct(odds("last", r)) : "–") : "–"}</td>
                  <td className="oddstable__stars">
                    +{RARITY[r].stars}
                    <LuStar aria-label="étoiles" />
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row">
                  <span className="dot dot--shiny" aria-hidden="true" /> Brillante
                  <small>n'importe quelle carte</small>
                </th>
                <td colSpan={2}>1 carte sur 60</td>
                <td className="oddstable__stars">
                  +{SHINY_STARS}
                  <LuStar aria-label="étoiles" /> en plus
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {state.log.length > 0 ? (
        <section className="history">
          <h2 className="section-title">Tes derniers paquets</h2>
          <ol>
            {state.log.slice(0, 8).map((entry, i) => (
              <li key={`${entry.day}-${i}`}>
                <span className="history__day">
                  {shortDate(entry.day)} · {KIND_TITLE[entry.kind] ?? entry.kind}
                </span>
                <span className="history__cards">{entry.cards.map((id) => nameOf(album, people, id)).join(", ")}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {opening ? <Reveal key={opening.id} opening={opening} onClose={() => setOpening(null)} onGift={() => openGift()} /> : null}
    </div>
  );
}

export function nameOf(album: Album, people: Person[] | null, id: string): string {
  const [kind, target] = [id.slice(0, 1), id.slice(2)];
  if (kind === "a") return album.byId.get(target)?.short ?? target;
  if (kind === "m") return album.matchById.get(target)?.title ?? target;
  const p = people?.find((x) => x.id === Number(target));
  return p?.name ?? `joueur n° ${target}`;
}

