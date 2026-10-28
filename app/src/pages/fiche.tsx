import { useEffect } from "react";
import { LuChevronLeft, LuChevronRight, LuExternalLink, LuHeart } from "react-icons/lu";
import { GROUPS, RARITY, albumCard } from "../cards";
import { type Album, type GameCardSide, type Player, gameSides, loadWiki, squadLines } from "../data";
import { markSeen, toggleFav, useStore } from "../store";
import { BackLink, Bar, Facts, Link, Section, useLoad } from "../ui/bits";
import { Carte } from "../ui/cards";
import { fold, youtubeSearch } from "../util";

function peel(text: string) {
  const cut = text.search(/\s+Sources?\s*:/i);
  if (cut === -1) return { line: text, extra: "" };
  return { line: text.slice(0, cut).trim(), extra: text.slice(cut).replace(/^\s*Sources?\s*:\s*/i, "").trim() };
}

export function Fiche({ album, id }: { album: Album; id: string }) {
  const player = album.byId.get(id);
  const state = useStore();
  useEffect(() => {
    if (player) markSeen(player.id);
  }, [player]);
  if (!player) {
    return (
      <div>
        <BackLink to={{ page: "joueurs" }} label="Tous les joueurs" />
        <p className="empty">Cette fiche n'existe pas dans cette édition.</p>
      </div>
    );
  }
  const card = albumCard(album, player);
  const owned = state.cards[card.id];
  const starred = state.fav.includes(card.id);
  const dex = album.dex.get(player.id) ?? 0;
  const prev = album.album[(dex - 2 + album.album.length) % album.album.length];
  const next = album.album[dex % album.album.length];
  const today = player.now ? peel(player.now) : null;
  const sources = [...player.sources, ...(today?.extra ? [today.extra] : [])];
  const portrait = album.portraits[player.id];
  const facePhoto = !portrait && album.faceOf.get(player.id);

  return (
    <div className="fiche">
      <BackLink to={{ page: "joueurs" }} label="Tous les joueurs" />
      <div className="fiche__hero" style={{ "--kit": player.kit, "--kit-ink": player.ink, "--rc": RARITY[card.rarity].color }}>
        <div className="fiche__card">
          <Carte card={card} count={owned?.[0]} shiny={(owned?.[3] ?? 0) > 0} size="xl" />
        </div>
        <div className="fiche__intro">
          <p className="eyebrow">
            Fiche n° {String(dex).padStart(4, "0")} · {player.code}
          </p>
          <h1 className="fiche__name">{player.display}</h1>
          <p className="fiche__club">{player.club}</p>
          <p className="fiche__pitch">{player.pitch}</p>
          <p className="fiche__family">
            <span className={`dot dot--${card.rarity}`} aria-hidden="true" />
            Carte {RARITY[card.rarity].label} · {GROUPS[card.group].name}. {RARITY[card.rarity].text}{" "}
            {card.rating != null ? `Sa note, ${card.rating}, vient du jeu vidéo EA Sports FC. ` : ""}
            {owned ? <strong>Dans ton classeur{owned[0] > 1 ? ` (×${owned[0]})` : ""}.</strong> : <span className="muted">Pas encore dans ton classeur.</span>}
          </p>
          <p className="fiche__rarity">Rang dans l'album : {album.labels.rarity[player.rarity]}</p>
          <div className="fiche__actions">
            <button type="button" className={starred ? "btn btn--soft btn--on" : "btn btn--soft"} onClick={() => toggleFav(card.id)} aria-pressed={starred}>
              <LuHeart aria-hidden="true" /> {starred ? "Dans tes favoris" : "Mettre en favori"}
            </button>
            <a className="btn btn--pitch" href={youtubeSearch(player.videoQuery)} target="_blank" rel="noreferrer">
              Voir sur YouTube <LuExternalLink aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      {today ? <p className="now">{today.line}</p> : null}

      {player.story && player.story !== player.pitch ? (
        <Section title="Le récit">
          <p className="prose">{player.story}</p>
        </Section>
      ) : null}

      <Section title="En bref">
        <Facts
          items={[
            ["Naissance", player.born],
            ["Décès", player.died],
            ["Lieu", player.place],
            ["Pays", player.country],
            ["Poste", player.position],
            ["Numéro", player.number != null ? String(player.number) : null],
            ["Maillot de la carte", player.shirt !== player.club ? player.shirt : null],
            ["Taille", player.height],
            ["Pied", player.foot],
            ["Époque", player.era],
            ["Rayons", player.rayons.map((r) => album.labels.rayon[r] ?? r).join(", ")],
          ]}
        />
      </Section>

      <GameNotes album={album} player={player} />
      <Squad album={album} player={player} />
      <Trace album={album} player={player} />

      {player.stats.length > 0 ? (
        <Section title="Chiffres tenus">
          <ul className="stats">
            {player.stats.map((s) => (
              <li key={s.label}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {player.clubs.length > 0 ? (
        <Section title="Parcours">
          <ol className="timeline">
            {player.clubs.map((c) => (
              <li key={`${c.name}-${c.years}`}>
                <strong>{c.name}</strong>
                <span>{c.years}</span>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {player.honours.length > 0 ? (
        <Section title="Palmarès">
          <ul className="honours">
            {player.honours.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {player.anecdotes.map((a) => (
        <section key={a.title} className="nugget">
          <p className="eyebrow">Le détail qui reste</p>
          <h2>{a.title}</h2>
          <p>{a.text}</p>
        </section>
      ))}

      <footer className="credits">
        {portrait ? <p>Photo : {portrait.credit}. Wikimedia Commons.</p> : null}
        {facePhoto ? <p>Visuel : EA Sports FC 24, fichier public de septembre 2023 (pas une photo libre de droits).</p> : null}
        <p>Sources : {sources.join(" · ")}. La recherche YouTube n'est pas une vidéo choisie.</p>
      </footer>

      <nav className="neighbours" aria-label="Fiches voisines">
        <Link to={{ page: "fiche", id: prev.id }} className="neighbours__link">
          <LuChevronLeft aria-hidden="true" />
          <span>
            <small>Avant</small>
            {prev.short}
          </span>
        </Link>
        <Link to={{ page: "fiche", id: next.id }} className="neighbours__link neighbours__link--next">
          <span>
            <small>Après</small>
            {next.short}
          </span>
          <LuChevronRight aria-hidden="true" />
        </Link>
      </nav>
    </div>
  );
}

function Side({ label, side, bars }: { label: string; side: GameCardSide; bars: boolean }) {
  return (
    <div className="gameside">
      <p className="eyebrow">{label}</p>
      <p className="gameside__head">
        Note {side.overall ?? "–"} · {side.positions || "poste non indiqué"}
      </p>
      <p className="muted">{[side.club, side.nation, side.height, side.foot].filter(Boolean).join(" · ")}</p>
      {bars ? (
        <ul className="bars">
          <Bar label="Vitesse" value={side.pace} />
          <Bar label="Tir" value={side.shooting} />
          <Bar label="Passe" value={side.passing} />
          <Bar label="Dribble" value={side.dribbling} />
          <Bar label="Défense" value={side.defending} />
          <Bar label="Physique" value={side.physic} />
        </ul>
      ) : null}
    </div>
  );
}

function GameNotes({ album, player }: { album: Album; player: Player }) {
  const raw = album.gameCards[player.display];
  const card = gameSides(album, player);
  const doubt = album.cardDoubts[player.display];
  const { data: wiki } = useLoad(() => (card.id ? loadWiki() : Promise.resolve(null)), [card.id]);
  if (!raw) return null;
  const reel = card.id && wiki && !wiki.reelDoubts[String(card.id)] ? wiki.reel[String(card.id)] : null;
  if (!card.old && !card.new) {
    return doubt ? <SetAside doubt={doubt} /> : null;
  }
  return (
    <Section title="Où il était" kicker="Notes du jeu vidéo">
      <p className="note">Une date, un club. Si la fiche ne dit pas le club d'aujourd'hui, c'est NC. Les notes chiffrées ne sont pas des buts en match.</p>
      {doubt ? <SetAside doubt={doubt} inline /> : null}
      {card.old && card.new && fold(card.old.club) !== fold(card.new.club) ? (
        <p>
          Septembre 2023 : {card.old.club}. 19 septembre 2025 : {card.new.club}. Aujourd'hui : NC, sauf si c'est déjà écrit plus haut.
        </p>
      ) : null}
      <div className="gamesides">
        {card.new ? <Side label="19 septembre 2025" side={card.new} bars /> : null}
        {card.old ? <Side label="Septembre 2023" side={card.old} bars={false} /> : null}
      </div>
      {reel ? (
        <div className="verified">
          <p className="eyebrow">Club vérifié à part</p>
          <p className="gameside__head">
            {reel.club}
            {reel.pos ? ` · ${reel.pos}` : ""}
            {reel.num ? ` · n° ${reel.num}` : ""}
          </p>
          <p className="muted">
            {reel.source}. {reel.asOf ? `À jour : ${reel.asOf}.` : ""}
          </p>
        </div>
      ) : null}
      {card.id ? (
        <Link to={{ page: "jeu", id: card.id }} className="btn btn--soft">
          Ouvrir toute la fiche du jeu, avec les 34 notes
        </Link>
      ) : null}
    </Section>
  );
}

function SetAside({ doubt, inline }: { doubt: { id?: string; new?: string }; inline?: boolean }) {
  const names = [doubt.id, doubt.new].filter((n, i, all): n is string => !!n && all.indexOf(n) === i);
  const text = (
    <p className="note">
      Le fichier d'origine reliait aussi cette fiche aux notes de jeu d'un autre joueur ({names.join(", ")}), qui a seulement le même prénom. Ce lien est
      mis de côté : il reste dans les données, mais il n'est pas montré comme celui de ce joueur.
    </p>
  );
  return inline ? text : <Section title="Notes du jeu vidéo">{text}</Section>;
}

function Squad({ album, player }: { album: Album; player: Player }) {
  const rows = squadLines(album, [player.display, player.short]);
  if (rows.length === 0) return null;
  return (
    <Section title="Effectif 2026-2027">
      {rows.length > 1 ? <p className="note">Plusieurs lignes portent ce nom. Elles sont toutes gardées, sans être fusionnées.</p> : null}
      <ul className="squadlines">
        {rows.map((row) => {
          const club = album.clubOfSquad.get(row.club);
          return (
            <li key={`${row.club}-${row.numero}-${row.joueur}`}>
              <p className="gameside__head">
                {row.ligue} · {row.club}
                {row.numero ? ` · n° ${row.numero}` : " · sans numéro"}
              </p>
              <p className="muted">
                {row.poste} · {row.nationalite}
                {club ? ` · ${club.stade}, ${club.ville}, ${club.capacite.toLocaleString("fr-FR")} places` : ""}
              </p>
              <p className="muted">
                Effectif au {row.maj}. {row.source}.
              </p>
              {row.remarque ? <p>{row.remarque}</p> : null}
            </li>
          );
        })}
      </ul>
      <Link to={{ page: "saison" }} className="btn btn--soft">
        Voir les effectifs de la saison
      </Link>
    </Section>
  );
}

function Trace({ album, player }: { album: Album; player: Player }) {
  const line = album.changements[player.id];
  const extra = album.playerFacts[fold(player.display)];
  const fields: Array<["born" | "height" | "foot", string]> = [["born", "Naissance"], ["height", "Taille"], ["foot", "Pied"]];
  const bits = fields.filter(([f]) => !player[f] && extra?.[f]).map(([f, label]) => `${label} : ${extra?.[f]}`);
  const other = fields.filter(([f]) => player[f] && extra?.[f] && extra[f] !== player[f]).map(([f, label]) => `${label} : ${extra?.[f]}`);
  if (!line && bits.length === 0 && other.length === 0) return null;
  return (
    <Section title="Ce qui a changé">
      {line ? <p>{line}</p> : null}
      {bits.length > 0 ? <p className="muted">{bits.join(" · ")}. Source : fiche déjà tenue dans l'album, pas une nouvelle recherche.</p> : null}
      {other.length > 0 ? <p className="muted">Autre valeur notée dans une fiche de l'album : {other.join(" · ")}.</p> : null}
    </Section>
  );
}
