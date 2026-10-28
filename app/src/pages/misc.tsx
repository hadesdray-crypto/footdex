import { useMemo, useState } from "react";
import { LuGem, LuGlobe, LuBookMarked, LuCalendarDays, LuExternalLink, LuFilm, LuGraduationCap, LuMessageSquareQuote, LuPlay, LuShieldCheck, LuShirt, LuTrophy, LuZap } from "react-icons/lu";
import { albumCard, matchPoster, matchVideo } from "../cards";
import { type Album, loadPeople, loadWiki } from "../data";
import { BackLink, Chips, Door, Facts, Link, Loading, PageTitle, Section, useLoad } from "../ui/bits";
import { Tile } from "../ui/cards";
import { fmt, fold, longDate, shortDate, youtubeSearch } from "../util";

// ------------------------------------------------------------------ coupes

export function Coupes({ album }: { album: Album }) {
  return (
    <div>
      <PageTitle kicker={`${album.coupes.length} rayons`} title="Les coupes">
        <p>Les coupes et les trophées, avec les dernières finales et la source de chaque ligne.</p>
      </PageTitle>
      <div className="doors doors--list">
        {album.coupes.map((c) => (
          <Door key={c.id} to={{ page: "coupe", id: c.id }} kicker={c.kicker} title={c.title} figure={`${c.finals.length} finale${c.finals.length > 1 ? "s" : ""}`} icon={LuTrophy} />
        ))}
      </div>
    </div>
  );
}

export function CoupePage({ album, id }: { album: Album; id: string }) {
  const c = album.coupes.find((x) => x.id === id);
  if (!c) return <p className="empty">Cette coupe n'est pas dans cette édition.</p>;
  return (
    <div>
      <BackLink to={{ page: "coupes" }} label="Les coupes" />
      <PageTitle kicker={c.kicker} title={c.title}>
        <p>{c.pitch}</p>
      </PageTitle>
      <ol className="finals">
        {c.finals.map((f) => (
          <li key={`${f.when}-${f.score}`} className="final">
            <p className="eyebrow">{f.when}</p>
            <p className="final__score">{f.score}</p>
            <p>{f.text}</p>
            <p className="muted">Source : {f.source}</p>
          </li>
        ))}
      </ol>
      {c.tournament ? <p className="note">Tous les matchs de ce tournoi sont aussi dans les scores entre pays (« {c.tournament} »).</p> : null}
    </div>
  );
}

// ------------------------------------------------------------------ clubs

export function Clubs({ album }: { album: Album }) {
  return (
    <div>
      <PageTitle kicker="Huit maisons" title="Les clubs">
        <p>Huit clubs racontés pour se repérer. Les 36 clubs de Ligue 1 et de Ligue 2, avec leurs effectifs, sont dans la saison 2026-2027.</p>
      </PageTitle>
      <div className="clubgrid">
        {album.clubs.map((c) => (
          <Link key={c.id} to={{ page: "club", id: c.id }} className="clubcard">
            <span className="clubcard__crest" style={{ background: c.kit, color: c.ink }} aria-hidden="true">
              {c.short}
            </span>
            <span className="clubcard__name">{c.name}</span>
            <span className="clubcard__meta">
              {c.city} · fondé en {c.founded}
            </span>
          </Link>
        ))}
      </div>
      <Link to={{ page: "saison" }} className="btn btn--ghost">
        Les 36 clubs de la saison 2026-2027
      </Link>
    </div>
  );
}

export function ClubPage({ album, id }: { album: Album; id: string }) {
  const c = album.clubs.find((x) => x.id === id);
  if (!c) return <p className="empty">Ce club n'est pas dans cette édition.</p>;
  const players = album.album.filter((p) => p._src === "curated" && p.clubs.some((s) => fold(s.name).includes(fold(c.short)) || fold(s.name).includes(fold(c.name))));
  return (
    <div>
      <BackLink to={{ page: "clubs" }} label="Les clubs" />
      <header className="clubhero" style={{ background: c.kit, color: c.ink }}>
        <p className="eyebrow">{c.city}</p>
        <h1>{c.name}</h1>
        <p>{c.pitch}</p>
      </header>
      <Section title="En bref">
        <Facts
          items={[
            ["Ville", c.city],
            ["Fondé en", c.founded],
            ["Stade", c.stadium],
            ["Places", c.capacity],
          ]}
        />
      </Section>
      <Section title="L'histoire">
        <p className="prose">{c.story}</p>
      </Section>
      {c.honours.length > 0 ? (
        <Section title="Palmarès">
          <ul className="honours">
            {c.honours.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </Section>
      ) : null}
      {players.length > 0 ? (
        <Section title="Ils y ont joué">
          <div className="tiles">
            {players.map((p) => (
              <Tile key={p.id} to={{ page: "fiche", id: p.id }} card={albumCard(album, p)} />
            ))}
          </div>
        </Section>
      ) : null}
      <footer className="credits">
        <p>Sources : {c.sources.join(" · ")}.</p>
      </footer>
    </div>
  );
}

// ------------------------------------------------------------------ saison 2026-2027

export function Saison({ album }: { album: Album }) {
  const clubs = album.effectifs.clubs;
  const [club, setClub] = useState(() => {
    try {
      return sessionStorage.getItem("footdex.club") || clubs[0].club;
    } catch {
      return clubs[0].club;
    }
  });
  const [league, setLeague] = useState<"Ligue 1" | "Ligue 2">(() => (clubs.find((c) => c.club === club)?.ligue ?? "Ligue 1"));
  const info = clubs.find((c) => c.club === club) ?? clubs[0];
  const rows = album.effectifs.players.filter((p) => p.club === info.club);
  const fiches = useMemo(() => {
    const out = new Map<string, string>();
    for (const p of album.album) {
      if (p._src === "curated") continue;
      out.set(fold(p.display), p.id);
    }
    return out;
  }, [album]);
  const choose = (name: string) => {
    setClub(name);
    try {
      sessionStorage.setItem("footdex.club", name);
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <PageTitle kicker={`Compilée le ${album.effectifs.compiled}`} title="La saison 2026-2027">
        <p>
          {clubs.length} clubs, {fmt(album.effectifs.players.length)} joueurs, chacun avec sa date et sa source. Les effectifs valent jusqu'au mercato d'hiver.
        </p>
      </PageTitle>

      <Chips
        label="Championnat"
        value={league}
        onChange={(v) => {
          setLeague(v);
          const first = clubs.find((c) => c.ligue === v);
          if (first && info.ligue !== v) choose(first.club);
        }}
        options={[["Ligue 1", "Ligue 1"], ["Ligue 2", "Ligue 2"]]}
      />
      <div className="clubpicker" role="group" aria-label="Clubs">
        {clubs
          .filter((c) => c.ligue === league)
          .map((c) => (
            <button key={c.club} type="button" className={c.club === info.club ? "chip chip--on" : "chip"} onClick={() => choose(c.club)} aria-pressed={c.club === info.club}>
              {c.club}
              {c.joueurs === 0 ? " *" : ""}
            </button>
          ))}
      </div>
      <p className="note">* Effectif à compléter : pas de liste à jour trouvée.</p>

      <Section title={info.club} kicker={info.ligue}>
        <Facts
          items={[
            ["Ville", info.ville],
            ["Stade", info.stade],
            ["Places", info.capacite.toLocaleString("fr-FR")],
            ["Joueurs listés", String(info.joueurs)],
            ["Effectif à jour au", info.maj],
            ["Source", info.source],
            ["Statut", info.statut],
          ]}
        />
        <p className="muted">
          Page source :{" "}
          <a href={info.page} target="_blank" rel="noreferrer">
            {info.page.replace(/^https?:\/\//, "")} <LuExternalLink aria-hidden="true" />
          </a>
        </p>
        {rows.length === 0 ? (
          <p className="note">Pas d'effectif à jour trouvé pour ce club : les seules listes dataient d'avant le mercato d'été 2026. Elles n'ont pas été mises, pour éviter des erreurs.</p>
        ) : (
          <div className="tablewrap">
            <table className="standings standings--squad">
              <thead>
                <tr>
                  <th scope="col">N°</th>
                  <th scope="col">Joueur</th>
                  <th scope="col">Poste</th>
                  <th scope="col">Nationalité</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const fid = fiches.get(fold(r.joueur));
                  return (
                    <tr key={`${r.joueur}-${i}`}>
                      <td>{r.numero || "–"}</td>
                      <th scope="row">
                        {fid ? <Link to={{ page: "fiche", id: fid }}>{r.joueur}</Link> : r.joueur}
                        {r.remarque ? <span className="cellnote">{r.remarque}</span> : null}
                      </th>
                      <td>{r.poste}</td>
                      <td>{r.nationalite}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Les prochains matchs de Ligue 1">
        <ul className="fixtures">
          {album.saison.nextFixtures.map((f) => (
            <li key={`${f.date}-${f.home}`}>
              <span className="fixtures__date">{shortDate(f.date)}</span>
              <span>
                {f.home} – {f.away}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Les derniers scores ajoutés" kicker="Du 16 au 18 octobre 2026">
        <ul className="fixtures">
          {album.extraScores.map((s) => (
            <li key={`${s.date}-${s.home}`}>
              <span className="fixtures__date">
                {shortDate(s.date)} · {s.league}
              </span>
              <span>
                {s.home} {s.hg}–{s.ag} {s.away}
              </span>
            </li>
          ))}
        </ul>
        <p className="muted">Même score sur trois sites : football.fr, footballdatabase et mon-match.</p>
      </Section>

      <Section title="Ce qui a changé depuis septembre">
        <ul className="list">
          {Object.entries(album.changements).map(([id, text]) => (
            <li key={id}>
              <Link to={{ page: "fiche", id }}>{album.byId.get(id)?.display ?? id}</Link> : {text}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="À lire avec le fichier" kicker="Fichier Excel du 19 octobre 2026">
        <div className="notes">
          {album.notes2026.map((line, i) => (line ? <p key={i}>{line}</p> : <hr key={i} />))}
        </div>
        <p className="muted">{album.xlsxTotals.map((r) => r.join(" : ")).join(" · ")}</p>
      </Section>
    </div>
  );
}

// ------------------------------------------------------------------ lexique, histoires, vidéos

export function Lexique({ album }: { album: Album }) {
  return (
    <div>
      <PageTitle kicker="Les mots du foot" title="Le lexique">
        <p>But en or, VAR, hors-jeu : les mots qu'on entend à la télé, en clair.</p>
      </PageTitle>
      <dl className="lexique">
        {album.lexique.map((l) => (
          <div key={l.id} className="lexique__item">
            <dt>{l.word}</dt>
            <dd>{l.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Histoires({ album }: { album: Album }) {
  const [kind, setKind] = useState<"tous" | "joueurs" | "matchs">("tous");
  const items = [
    ...album.album.flatMap((p) => p.anecdotes.map((a, i) => ({ ...a, id: `${p.id}-${i}`, kicker: p.display, to: { page: "fiche" as const, id: p.id }, kind: "joueurs" as const }))),
    ...album.matches.map((m) => ({ ...m.nugget, id: m.id, kicker: m.competition, to: { page: "match" as const, id: m.id }, kind: "matchs" as const })),
  ].filter((x) => kind === "tous" || x.kind === kind);
  return (
    <div>
      <PageTitle kicker="Ça se raconte" title="Les histoires">
        <p>Les anecdotes de l'album, une par carte. Chacune renvoie à sa fiche.</p>
      </PageTitle>
      <Chips label="Histoires" value={kind} onChange={setKind} options={[["tous", "Toutes"], ["joueurs", "Joueurs"], ["matchs", "Matchs"]]} />
      <div className="stories">
        {items.map((s) => (
          <Link key={s.id} to={s.to} className="story">
            <span className="eyebrow">{s.kicker}</span>
            <span className="story__title">{s.title}</span>
            <span className="story__text">{s.text}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Videos({ album }: { album: Album }) {
  const clips = album.matches.filter((m) => matchVideo(m.id));
  return (
    <div>
      <PageTitle kicker="Rayon vidéos" title="Les images, sans faux lien.">
        <p>
          Quatre grands matchs ont leur illustration animée, faite pour l'album. Pour les vraies images, chaque bouton ouvre une recherche YouTube : aucune adresse n'est
          inventée, une vidéo peut disparaître, le texte de l'almanach reste.
        </p>
      </PageTitle>
      <div className="clips">
        {clips.map((m) => (
          <figure key={m.id} className="clip">
            <video src={matchVideo(m.id) ?? undefined} poster={matchPoster(m.id) ?? undefined} controls playsInline preload="none" />
            <figcaption>
              <Link to={{ page: "match", id: m.id }}>{m.title}</Link>
              <span className="muted">
                {m.competition} · {m.date}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      <Section title="Chercher les vrais matchs">
        <ul className="links">
          {album.matches.map((m) => (
            <li key={m.id}>
              <a href={youtubeSearch(`${m.videoQuery} match complet`)} target="_blank" rel="noreferrer">
                <LuPlay aria-hidden="true" /> {m.title} <span className="muted">· {m.competition}</span>
              </a>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Chercher les joueurs">
        <ul className="links">
          {album.album
            .filter((p) => p._src === "curated")
            .map((p) => (
              <li key={p.id}>
                <a href={youtubeSearch(p.videoQuery)} target="_blank" rel="noreferrer">
                  <LuPlay aria-hidden="true" /> {p.display} <span className="muted">· {p.anecdotes[0]?.title ?? p.club}</span>
                </a>
              </li>
            ))}
        </ul>
      </Section>
    </div>
  );
}

// ------------------------------------------------------------------ sources

export function Sources({ album }: { album: Album }) {
  const m = album.manifest;
  return (
    <div>
      <PageTitle kicker={`Édition du ${album.edition.label}`} title="Sources et certitude">
        <p>Rien n'a été effacé. Quand une information n'est pas certaine à 100 %, la raison est écrite ici, avec la source.</p>
      </PageTitle>
      <ul className="certitude">
        {album.certitude.map((row) => (
          <li key={row.title} className="sheet">
            <p className="eyebrow">{row.rate}</p>
            <h2 className="sheet__title">{row.title}</h2>
            <p>{row.sure}</p>
            <p>
              <strong>Sources :</strong> {row.sources}
            </p>
            <p className="muted">Pas 100 %, parce que : {row.doubt}</p>
          </li>
        ))}
      </ul>

      <Section title="D'où viennent les fichiers">
        <ul className="list">
          {m.sources.map((s) => (
            <li key={s.name}>
              <strong>{s.name}</strong> · {s.what}. {s.note}
            </li>
          ))}
        </ul>
        <p className="muted">{m.disclaimer}</p>
      </Section>

      <Section title="Dernières vérifications" kicker={album.updates.day}>
        <ul className="list">
          {album.updates.items.map((u) => (
            <li key={u.player}>
              <strong>{u.player}</strong> · {u.change} <span className="muted">({u.source})</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Les photos">
        <p>
          Les grandes fiches ont des portraits libres de droits, pris sur Wikimedia Commons ; le nom du photographe et la licence sont écrits en bas de chaque fiche.
        </p>
        <ul className="list list--compact">
          {Object.entries(album.portraits).map(([id, p]) => (
            <li key={id}>
              <Link to={{ page: "fiche", id }}>{album.byId.get(id)?.display ?? id}</Link> : {p.credit}
            </li>
          ))}
        </ul>
        <p>
          Les 15 954 visuels des fiches du jeu viennent d'un export public du jeu EA Sports FC 24 (septembre 2023). Ils servent dans cet album personnel ; ils ne sont pas
          libres de droits et ne doivent pas être revendus.
        </p>
        <p>Les illustrations de la couverture et des quatre matchs animés ont été créées pour l'album.</p>
      </Section>

      <Pasted />

      <Section title="Ce que contient cette édition">
        <Facts
          items={[
            ["Fiches de l'album", fmt(album.album.length)],
            ["Joueurs des fichiers du jeu", fmt(25229)],
            ["Visuels du jeu", fmt(15954)],
            ["Matchs de Ligue 1 et de Ligue 2", fmt(22842)],
            ["Matchs entre pays", fmt(49945)],
            ["Dont Coupe du monde", fmt(1068)],
            ["Matchs racontés", String(album.matches.length)],
            ["Effectifs 2026-2027", `${album.effectifs.clubs.length} clubs, ${fmt(album.effectifs.players.length)} joueurs`],
            ["Base construite le", longDate(m.built)],
          ]}
        />
      </Section>
    </div>
  );
}

function Pasted() {
  const { data } = useLoad(() => Promise.all([loadWiki(), loadPeople()]), []);
  if (!data) return <Loading text="Chargement du fichier collé…" />;
  const [wiki, people] = data;
  return (
    <Section title="Le fichier collé" kicker="10 joueurs, notes de FIFA 18 à EA FC 24">
      <p>Un texte collé à part donnait, pour dix stars, leurs notes de jeu d'une édition à l'autre. Il est gardé tel quel ; chaque ligne s'ouvre sur la fiche du jeu quand le numéro existe dans les fichiers.</p>
      <ul className="list">
        {wiki.fifaHistory.map((h) => {
          const known = people.byId.has(h.player_id);
          const steps = Object.entries(h.history)
            .map(([k, v]) => `${k.replace("fifa_", "FIFA ").replace("ea_fc_", "EA FC ")} : ${v.overall} (${v.club})`)
            .join(" · ");
          return (
            <li key={h.player_id}>
              {known ? <Link to={{ page: "jeu", id: h.player_id }}>{h.long_name}</Link> : <strong>{h.long_name}</strong>} · n° {h.player_id}
              {known ? "" : " (numéro absent des fichiers du jeu)"} · {steps}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

// ------------------------------------------------------------------ plus

export function Plus({ album }: { album: Album }) {
  return (
    <div>
      <PageTitle kicker="Le reste de l'album" title="Encore des rayons" />
      <div className="doors doors--list">
        <Door to={{ page: "jeux" }} kicker="On joue ensemble" title="Les jeux" figure="10 jeux avec le personnage" tone="gold" icon={LuPlay} />
        <Door to={{ page: "reglages" }} kicker="L'appli" title="Paramètres" figure="Personnage, voix, sons, mises à jour" tone="gold" icon={LuShieldCheck} />
        <Door to={{ page: "parents" }} kicker="Pour les grands" title="Coin des parents" figure="Nouveautés, sauvegarde, temps d'écran" icon={LuShieldCheck} />
        <Door to={{ page: "coffre" }} kicker="Le trésor" title="Le coffre" figure="Personnages secrets et cartes spéciales" tone="gold" icon={LuGem} />
        <Door to={{ page: "carte" }} kicker="Tour du monde" title="La carte des stades" figure="Voyages et découvertes" tone="pitch" icon={LuGlobe} />
        <Door to={{ page: "matchs" }} kicker="Les grands soirs" title="Les matchs racontés" figure={`${album.matches.length} matchs`} tone="pitch" icon={LuTrophy} />
        <Door to={{ page: "defi" }} kicker="Chaque jour" title="Le défi du jour" figure="4 bonnes réponses = un paquet bonus" tone="gold" icon={LuGraduationCap} />
        <Door to={{ page: "scores" }} kicker="Depuis 1872" title="Les scores" figure="72 787 résultats" icon={LuCalendarDays} />
        <Door to={{ page: "saison" }} kicker="2026-2027" title="La saison" figure={`${album.effectifs.clubs.length} clubs`} icon={LuShirt} />
        <Door to={{ page: "coupes" }} kicker="Trophées" title="Les coupes" figure={album.coupes.map((c) => c.title).join(", ")} icon={LuTrophy} />
        <Door to={{ page: "clubs" }} kicker="Huit maisons" title="Les clubs" icon={LuShieldCheck} />
        <Door to={{ page: "histoires" }} kicker="Ça se raconte" title="Les histoires" icon={LuMessageSquareQuote} />
        <Door to={{ page: "videos" }} kicker="Images" title="Les vidéos" icon={LuFilm} />
        <Door to={{ page: "lexique" }} kicker="Les mots du foot" title="Le lexique" figure={`${album.lexique.length} mots`} icon={LuBookMarked} />
        <Door to={{ page: "grand-defi" }} kicker="Dix questions" title="Le grand défi" icon={LuZap} />
        <Door to={{ page: "sources" }} kicker="Contrôle" title="Sources et certitude" icon={LuShieldCheck} />
      </div>
    </div>
  );
}
