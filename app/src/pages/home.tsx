import { useMemo, useState } from "react";
import { LuArrowRight, LuBookOpen, LuCalendarDays, LuFilm, LuGift, LuGraduationCap, LuLibrary, LuMessageSquareQuote, LuPackageOpen, LuQuote, LuSearch, LuStar, LuTrophy, LuUsers, LuGlobe, LuGem, LuPlay } from "react-icons/lu";
import { CARDS_PER_CHEMIN, CHEMINS, RARITY, albumCard, cheminOf, milestoneRewards, momentCard, type CardRef } from "../cards";
import type { Album } from "../data";
import { go } from "../router";
import { packStatus, useStore } from "../store";
import { Door, Link } from "../ui/bits";
import { Carte, cardRoute } from "../ui/cards";
import { PathBar, rewardText } from "../ui/chemin";
import { dayKey, fmt, hashString } from "../util";
import { AUTO_OPEN } from "./packs";
import { Installer } from "../maj/Installer";

function openPackFromHome(kind: "jour" | "cadeau") {
  try {
    sessionStorage.setItem(AUTO_OPEN, kind);
  } catch {
    /* ignore */
  }
  go({ page: "paquets" });
}

export function Home({ album }: { album: Album }) {
  const state = useStore();
  const status = packStatus(state);
  const today = dayKey();
  const stars = album.album.filter((p) => p._src === "curated");
  const featured = stars[hashString(`fiche-${today}`) % stars.length];
  const nuggets = [
    ...album.album.flatMap((p) => p.anecdotes.map((a) => ({ ...a, kicker: p.display, to: { page: "fiche" as const, id: p.id } }))),
    ...album.matches.map((m) => ({ ...m.nugget, kicker: m.competition, to: { page: "match" as const, id: m.id } })),
  ];
  const nugget = nuggets[hashString(`anecdote-${today}`) % nuggets.length];
  const owned = Object.keys(state.cards).length;
  const [q, setQ] = useState("");
  const featuredCard = albumCard(album, featured);
  const ch = cheminOf(state.opened);
  const nextAt = Math.ceil((ch.step + 1) / 20) * 20;
  const nextReward = milestoneRewards(nextAt, ch.index);

  // The two best cards of the child that can be drawn without the world index; famous stars otherwise.
  const showcase = useMemo(() => {
    const mine: CardRef[] = [];
    for (const id of Object.keys(state.cards)) {
      if (id.startsWith("a:")) {
        const p = album.byId.get(id.slice(2));
        if (p) mine.push(albumCard(album, p));
      } else if (id.startsWith("m:")) {
        const i = album.matches.findIndex((m) => m.id === id.slice(2));
        if (i >= 0) mine.push(momentCard(album.matches[i], i, album.matches.length));
      }
    }
    mine.sort((a, b) => RARITY[b.rarity].rank - RARITY[a.rarity].rank || (b.rating ?? 0) - (a.rating ?? 0) || b.fame - a.fame);
    const fill = stars
      .filter((p) => p.id !== featured.id)
      .map((p) => albumCard(album, p))
      .sort((a, b) => b.fame - a.fame);
    const picks = mine.filter((c) => c.id !== featuredCard.id).slice(0, 2);
    const pool = fill.filter((c) => !picks.some((p) => p.id === c.id));
    const k = hashString(today) % Math.max(1, pool.length);
    while (picks.length < 2 && pool.length) picks.push(pool.splice(k % pool.length, 1)[0]);
    return picks;
  }, [album, state.cards, featured, featuredCard.id, stars, today]);

  const shinyOf = (c: CardRef) => (state.cards[c.id]?.[3] ?? 0) > 0;

  return (
    <div className="home">
      <Installer />
      <section className="hero" aria-label="Footdex">
        <div className="hero__text">
          <p className="hero__for">Pour Raphaël</p>
          <h1 className="hero__title">Aimer le football, c'est le vivre à fond.</h1>
          <p className="hero__lede">
            La plus grande base de données sur les joueurs connus à ce jour. Des <Link to={{ page: "histoires" }}>anecdotes</Link>, des{" "}
            <Link to={{ page: "videos" }}>vidéos</Link>. Tout est accessible. Il suffit de chercher, tu trouveras. Bonne histoire de foot.
          </p>
          <form
            className="search search--hero"
            role="search"
            onSubmit={(e: SubmitEvent) => {
              e.preventDefault();
              try {
                sessionStorage.setItem("footdex.q", q);
              } catch {
                /* ignore */
              }
              go({ page: "joueurs" });
            }}
          >
            <LuSearch aria-hidden="true" />
            <label htmlFor="cover-q" className="sr">
              Chercher un joueur, un club, un pays
            </label>
            <input id="cover-q" value={q} onInput={(e: InputEvent) => setQ((e.target as HTMLInputElement).value)} placeholder="Mbappé, Marseille, Brésil…" autoComplete="off" />
            <button type="submit" className="btn btn--gold">
              Chercher
            </button>
          </form>
        </div>
        <div className="hero__cards" aria-label="Cartes à la une">
          <div className="hero__card hero__card--left">
            <Carte card={showcase[0]} shiny={shinyOf(showcase[0])} onClick={() => go(cardRoute(showcase[0]))} label={`${showcase[0].name}, ouvrir la fiche`} />
          </div>
          <div className="hero__card hero__card--right">
            <Carte card={showcase[1]} shiny={shinyOf(showcase[1])} onClick={() => go(cardRoute(showcase[1]))} label={`${showcase[1].name}, ouvrir la fiche`} />
          </div>
          <div className="hero__card hero__card--center">
            <Carte card={featuredCard} shiny={shinyOf(featuredCard)} onClick={() => go(cardRoute(featuredCard))} label={`La fiche du jour : ${featuredCard.name}`} />
            <span className="hero__tag">La fiche du jour</span>
          </div>
        </div>
      </section>

      <section className="chemincard" style={{ "--p1": CHEMINS[ch.index].tone[0], "--p2": CHEMINS[ch.index].tone[1] }} aria-label="Ton chemin">
        <div className="chemincard__head">
          <div>
            <p className="eyebrow">
              Chemin {ch.index + 1} sur {CHEMINS.length}
              {ch.index === CHEMINS.length - 1 ? ` · niveau ${ch.level}` : ""}
            </p>
            <h2 className="chemincard__name">{CHEMINS[ch.index].name}</h2>
          </div>
          <Link to={{ page: "paquets" }} className="chemincard__more">
            Voir le chemin <LuArrowRight aria-hidden="true" />
          </Link>
        </div>
        <PathBar from={ch.step} to={ch.step} chemin={ch.index} />
        <p className="chemincard__meta">
          <strong>{fmt(ch.step)}</strong> / {CARDS_PER_CHEMIN} cartes · prochaine récompense dans {nextAt - ch.step} carte{nextAt - ch.step > 1 ? "s" : ""} : {nextReward.map(rewardText).join(" et ")}
        </p>
        <div className="chemincard__actions">
          {status.free ? (
            <button type="button" className="btn btn--gold btn--big btn--glow" onClick={() => openPackFromHome("jour")}>
              <LuPackageOpen aria-hidden="true" /> Ouvrir le paquet du jour
            </button>
          ) : status.bonus ? (
            <Link to={{ page: "paquets" }} className="btn btn--pitch btn--big">
              <LuGift aria-hidden="true" /> Ton paquet bonus t'attend
            </Link>
          ) : (
            <p className="chemincard__done">Paquet du jour ouvert. Le prochain arrive demain.</p>
          )}
          {state.gifts.length > 0 ? (
            <button type="button" className="btn btn--soft btn--big" onClick={() => openPackFromHome("cadeau")}>
              <LuGift aria-hidden="true" /> {state.gifts.length} cadeau{state.gifts.length > 1 ? "x" : ""} à ouvrir
            </button>
          ) : null}
        </div>
      </section>

      <dl className="statstrip statstrip--home">
        <div>
          <dt>Cartes</dt>
          <dd>{fmt(owned)}</dd>
        </div>
        <div>
          <dt>Étoiles</dt>
          <dd className="statstrip__stars">
            <LuStar aria-hidden="true" /> {fmt(state.stars)}
          </dd>
        </div>
        <div>
          <dt>Paquets ouverts</dt>
          <dd>{fmt(state.packs)}</dd>
        </div>
        <div>
          <dt>Cartes ouvertes</dt>
          <dd>{fmt(state.opened)}</dd>
        </div>
      </dl>

      <Link to={{ page: "defi" }} className="quizcall">
        <span className="quizcall__icon">{status.bonusLocked ? <LuGraduationCap aria-hidden="true" /> : <LuGift aria-hidden="true" />}</span>
        <span className="quizcall__text">
          <span className="quizcall__kicker">Défi du jour</span>
          <span className="quizcall__title">
            {state.quiz?.day === today
              ? state.quiz.passed
                ? `Réussi, ${state.quiz.score}/${state.quiz.total}. Paquet bonus gagné.`
                : `${state.quiz.score}/${state.quiz.total}. Retente ta chance demain.`
              : "5 questions. 4 bonnes réponses = un 2e paquet."}
          </span>
        </span>
        <LuArrowRight className="quizcall__arrow" aria-hidden="true" />
      </Link>

      <section className="daily">
        <article className="daily__nugget">
          <p className="eyebrow">
            <LuQuote aria-hidden="true" /> Anecdote du jour · {nugget.kicker}
          </p>
          <h2>{nugget.title}</h2>
          <p>{nugget.text}</p>
          <Link to={nugget.to} className="btn btn--soft">
            Lire la fiche <LuArrowRight aria-hidden="true" />
          </Link>
        </article>
        <article className="daily__fiche">
          <p className="eyebrow">La fiche du jour</p>
          <h2>{featured.display}</h2>
          <p className="muted">
            {featured.position} · {featured.club}
          </p>
          <p>{featured.pitch}</p>
          <Link to={{ page: "fiche", id: featured.id }} className="btn btn--soft">
            Ouvrir la fiche <LuArrowRight aria-hidden="true" />
          </Link>
        </article>
      </section>

      <section aria-label="Les rayons" className="doors">
        <Door to={{ page: "joueurs" }} kicker="Tout l'album" title="Les joueurs" figure={`${fmt(album.album.length)} fiches · 25 229 du jeu`} tone="pitch" icon={LuUsers} />
        <Door to={{ page: "classeur" }} kicker="Ta collection" title="Le classeur" figure={`${fmt(owned)} carte${owned > 1 ? "s" : ""}`} tone="gold" icon={LuLibrary} />
        <Door to={{ page: "jeux" }} kicker="On joue ensemble" title="Les jeux" figure="10 jeux avec le personnage" tone="gold" icon={LuPlay} />
        <Door to={{ page: "coffre" }} kicker="Le trésor" title="Le coffre" figure="Secrets et cartes spéciales" tone="gold" icon={LuGem} />
        <Door to={{ page: "carte" }} kicker="Tour du monde" title="La carte" figure="Stades et grands soirs" tone="pitch" icon={LuGlobe} />
        <Door to={{ page: "matchs" }} kicker="Les grands soirs" title="Les matchs" figure={`${album.matches.length} matchs racontés`} icon={LuTrophy} />
        <Door to={{ page: "scores" }} kicker="Depuis 1872" title="Les scores" figure="72 787 résultats" icon={LuCalendarDays} />
        <Door to={{ page: "histoires" }} kicker="Ça se raconte" title="Les histoires" figure={`${fmt(nuggets.length)} anecdotes`} icon={LuMessageSquareQuote} />
        <Door to={{ page: "videos" }} kicker="Images" title="Les vidéos" figure="4 matchs animés" icon={LuFilm} />
        <Door to={{ page: "coupes" }} kicker={`${album.coupes.length} rayons`} title="Les coupes" icon={LuTrophy} />
        <Door to={{ page: "saison" }} kicker="2026-2027" title="La saison" figure={`${album.effectifs.clubs.length} clubs · ${fmt(album.effectifs.players.length)} joueurs`} icon={LuBookOpen} />
      </section>

      <section className="almanach" aria-label="L'album en chiffres">
        <picture className="almanach__cover">
          <source media="(max-width: 700px)" srcSet="img/une-800.webp" />
          <img src="img/une.webp" alt="FOOTDEX, l'almanach du football" width={1600} height={900} loading="lazy" />
        </picture>
        <div className="scoreboard">
          <div>
            <strong>49 945</strong>
            <span>matchs entre pays, depuis 1872</span>
          </div>
          <div>
            <strong>22 842</strong>
            <span>matchs de Ligue 1 et de Ligue 2</span>
          </div>
          <div>
            <strong>25 229</strong>
            <span>joueurs des fichiers du jeu, dont 15 954 avec photo</span>
          </div>
          <div>
            <strong>{fmt(album.album.length)}</strong>
            <span>fiches de l'album</span>
          </div>
        </div>
      </section>
      <p className="home__edition">
        Édition du {album.edition.label}. <Link to={{ page: "sources" }}>Sources et certitude</Link>
      </p>
    </div>
  );
}
