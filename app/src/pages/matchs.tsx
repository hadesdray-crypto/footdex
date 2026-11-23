import { useEffect, useRef, useState } from "react";
import { LuPlay, LuSquare, LuVolume2 } from "react-icons/lu";
import { momentCard } from "../cards";
import { AILLEURS, PHOTOS, VIDEO_MATCH } from "../videos";
import { regarder } from "../ui/lecteur";
import { MOMENTS } from "../moments";
import { say } from "../mascot/state";
import { cx } from "../util";
import type { Album } from "../data";
import { useStore } from "../store";
import { BackLink, Link, PageTitle, Section } from "../ui/bits";

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
          const poster = PHOTOS[m.id]?.src ?? null;
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
  const photo = PHOTOS[m.id];
  const film = VIDEO_MATCH[m.id];
  useEffect(() => {
    // the friends on the screen are fans: they celebrate this match
    const t = window.setTimeout(() => window.dispatchEvent(new CustomEvent("footdex:party", { detail: { title: m.title, year: m.date.slice(0, 4) } })), 1800);
    return () => window.clearTimeout(t);
  }, [m.id]);
  return (
    <div className="matchpage">
      <BackLink to={{ page: "matchs" }} label="Les matchs" />
      <header className="matchhero">
        {photo ? (
          <figure className="matchhero__photo">
            <img src={photo.src} alt={photo.quoi} />
            <figcaption>{photo.quoi}{photo.duMatch ? "" : " (pas une photo du match)"} · {photo.auteur}, {photo.licence}</figcaption>
          </figure>
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
      <GrandsMoments id={m.id} titre={m.title} />
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
        {film ? (
          <button type="button" className="btn btn--gold btn--big" onClick={() => regarder(film)}>
            <LuPlay aria-hidden="true" /> {film.genre === "complet" ? "Regarder le match complet" : film.genre === "resume" ? "Regarder le résumé" : "Regarder la vidéo"}
          </button>
        ) : AILLEURS[m.id] ? (
          <p className="note">{AILLEURS[m.id]}</p>
        ) : null}
      </div>
      <footer className="credits">
        {photo ? <p>Photo : « {photo.fichier} », {photo.auteur}, {photo.licence}, Wikimedia Commons.</p> : null}
        {film ? <p>Vidéo officielle : {film.chaine}.</p> : null}
        <p>Sources : {m.sources.join(" · ")}.</p>
      </footer>
    </div>
  );
}

/** Les grands moments du match, dans l'ordre. « Écouter » : Philippe les raconte un par un, et le moment raconté s'allume. */
function GrandsMoments({ id, titre }: { id: string; titre: string }) {
  const liste = MOMENTS[id] ?? [];
  const [en, setEn] = useState(-1);
  const timers = useRef<number[]>([]);
  const stop = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setEn(-1);
  };
  useEffect(() => stop, [id]);
  // le moment raconté reste à l'écran
  useEffect(() => {
    if (en >= 0) document.querySelector(".moment.is-on")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [en]);
  if (!liste.length) return null;

  function ecouter() {
    if (en >= 0) return stop();
    let t = 0;
    const lignes = [{ texte: `Les grands moments de ${titre}.` }, ...liste];
    lignes.forEach((m, i) => {
      const phrase = "min" in m && m.min ? `${m.min.replace(/e$/, "e minute")} : ${m.texte}` : m.texte;
      timers.current.push(window.setTimeout(() => { setEn(i - 1); say(phrase); }, t));
      t += Math.max(2600, phrase.length * 70) + 500;
    });
    timers.current.push(window.setTimeout(() => setEn(-1), t));
  }

  return (
    <section className="moments">
      <div className="moments__head">
        <h2>Les grands moments</h2>
        <button type="button" className={cx("btn", en >= 0 ? "btn--soft" : "btn--gold")} onClick={ecouter}>
          {en >= 0 ? <><LuSquare aria-hidden="true" /> Arrêter</> : <><LuVolume2 aria-hidden="true" /> Écouter le récit</>}
        </button>
      </div>
      <ol className="moments__liste">
        {liste.map((m, i) => (
          <li key={i} className={cx("moment", m.fort && "moment--fort", en === i && "is-on", en > i && "is-vu")}>
            <span className="moment__min">{m.min ?? "•"}</span>
            <p>{m.texte}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
