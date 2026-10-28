import { LuExternalLink } from "react-icons/lu";
import { matchPoster, matchVideo, momentCard } from "../cards";
import type { Album } from "../data";
import { useStore } from "../store";
import { BackLink, Link, PageTitle, Section } from "../ui/bits";
import { youtubeSearch } from "../util";

export function Matchs({ album }: { album: Album }) {
  const state = useStore();
  return (
    <div>
      <PageTitle kicker="Les grands soirs" title="Les matchs racontés">
        <p>
          {album.matches.length} matchs, avec le score, le récit et le détail qui reste. Chacun est aussi une carte Moment : elles entrent dans les paquets au chemin 5, « Les grands soirs ».
        </p>
      </PageTitle>
      <ul className="matchgrid">
        {album.matches.map((m, i) => {
          const poster = matchPoster(m.id);
          const owned = state.cards[momentCard(m, i, album.matches.length).id];
          return (
            <li key={m.id}>
              <Link to={{ page: "match", id: m.id }} className="matchcard">
                <span className="matchcard__art">
                  {poster ? <img src={poster} alt="" loading="lazy" /> : <Board home={m.home} away={m.away} score={m.score} />}
                </span>
                <span className="matchcard__body">
                  <span className="matchcard__kicker">
                    {m.competition} · {m.date}
                  </span>
                  <span className="matchcard__title">{m.title}</span>
                  <span className="matchcard__summary">{m.summary}</span>
                  {owned ? <span className="matchcard__owned">Carte Moment dans ton classeur</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Board({ home, away, score }: { home: string; away: string; score: string }) {
  const [a, b] = score.split(/[–-]/).map((x) => x.trim());
  return (
    <span className="matchcard__board" aria-hidden="true">
      <span>{home}</span>
      <strong>{a}</strong>
      <span>{away}</span>
      <strong>{b}</strong>
    </span>
  );
}

export function MatchPage({ album, id }: { album: Album; id: string }) {
  const m = album.matchById.get(id);
  if (!m) {
    return (
      <div>
        <BackLink to={{ page: "matchs" }} label="Les matchs" />
        <p className="empty">Ce match n'est pas dans cette édition.</p>
      </div>
    );
  }
  const video = matchVideo(m.id);
  const poster = matchPoster(m.id);
  return (
    <div className="matchpage">
      <BackLink to={{ page: "matchs" }} label="Les matchs" />
      <header className="matchhero">
        {video ? (
          <video className="matchhero__video" src={video} poster={poster ?? undefined} controls playsInline preload="none" aria-label={`Illustration animée : ${m.title}`} />
        ) : null}
        <div className="matchhero__board">
          <p className="eyebrow">
            {m.competition} · {m.date}
          </p>
          <p className="matchhero__teams">
            <span>{m.home}</span>
            <strong>{m.score}</strong>
            <span>{m.away}</span>
          </p>
          {m.detail ? <p className="matchhero__detail">{m.detail}</p> : null}
          <p className="matchhero__stadium">{m.stadium}</p>
        </div>
      </header>
      <h1 className="matchpage__title">{m.title}</h1>
      <p className="lede">{m.summary}</p>
      <Section title="Le récit">
        <p className="prose">{m.story}</p>
      </Section>
      {m.facts.length > 0 ? (
        <Section title="Ce qui est sûr">
          <ul className="list">
            {m.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </Section>
      ) : null}
      <section className="nugget">
        <p className="eyebrow">Le détail qui reste</p>
        <h2>{m.nugget.title}</h2>
        <p>{m.nugget.text}</p>
      </section>
      <div className="fiche__actions">
        <a className="btn btn--pitch" href={youtubeSearch(`${m.videoQuery} match complet`)} target="_blank" rel="noreferrer">
          Chercher le match sur YouTube <LuExternalLink aria-hidden="true" />
        </a>
      </div>
      <footer className="credits">
        {video ? <p>Illustration animée créée pour l'album (pas une image du vrai match).</p> : null}
        <p>Sources : {m.sources.join(" · ")}.</p>
      </footer>
    </div>
  );
}
