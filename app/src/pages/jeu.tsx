import { LuHeart } from "react-icons/lu";
import { GROUPS, RARITY, gameCard } from "../cards";
import { type Album, type Fc24, type Fc26, type FifaHistory, type Person, type Reel, type ReelDoubt, loadFc24, loadFc26, loadPeople, loadWiki, posListFr } from "../data";
import { toggleFav, useStore } from "../store";
import { BackLink, Bar, Facts, Failure, Link, Loading, Section, useLoad } from "../ui/bits";
import { Carte } from "../ui/cards";

const SKILLS: Array<[string, string]> = [
  ["crossing", "Centres"], ["finishing", "Finition"], ["heading_accuracy", "Jeu de tête"], ["short_passing", "Passes courtes"],
  ["volleys", "Volées"], ["dribbling", "Dribbles"], ["curve", "Effet"], ["fk_accuracy", "Coups francs"], ["long_passing", "Passes longues"],
  ["ball_control", "Contrôle"], ["acceleration", "Accélération"], ["sprint_speed", "Vitesse"], ["agility", "Agilité"], ["reactions", "Réactivité"],
  ["balance", "Équilibre"], ["shot_power", "Puissance de frappe"], ["jumping", "Détente"], ["stamina", "Endurance"], ["strength", "Puissance"],
  ["long_shots", "Tirs de loin"], ["aggression", "Agressivité"], ["interceptions", "Interceptions"], ["positioning", "Placement"],
  ["vision", "Vision"], ["penalties", "Penalties"], ["composure", "Sang-froid"], ["defensive_awareness", "Placement défensif"],
  ["standing_tackle", "Tacle debout"], ["sliding_tackle", "Tacle glissé"], ["gk_diving", "Plongeon"], ["gk_handling", "Prise de balle"],
  ["gk_kicking", "Dégagement"], ["gk_positioning", "Placement du gardien"], ["gk_reflexes", "Réflexes"],
];
const RATE: Record<string, string> = { High: "haute", Medium: "moyenne", Low: "basse" };
const BODY: Record<string, string> = { Unique: "unique", Lean: "mince", Normal: "normale", Stocky: "costaude" };
const HISTORY_LABEL: Record<string, string> = { fifa_18: "FIFA 18", fifa_19: "FIFA 19", fifa_20: "FIFA 20", fifa_21: "FIFA 21", fifa_22: "FIFA 22", fifa_23: "FIFA 23", ea_fc_24: "EA FC 24" };

type Loaded = { person: Person; fc24: Fc24 | null; fc26: Fc26 | null; reel: Reel | null; reelDoubt: ReelDoubt | null; history: FifaHistory | null };

async function loadAll(id: number): Promise<Loaded | "absent"> {
  const people = await loadPeople();
  const person = people.byId.get(id);
  if (!person) return "absent";
  const [c24, c26, wiki] = await Promise.all([
    person.chunk >= 0 ? loadFc24(person.chunk) : Promise.resolve(null),
    person.chunk26 >= 0 ? loadFc26(person.chunk26) : Promise.resolve(null),
    loadWiki(),
  ]);
  return {
    person,
    fc24: c24?.get(id) ?? null,
    fc26: c26?.get(id) ?? null,
    reel: wiki.reelDoubts[String(id)] ? null : wiki.reel[String(id)] ?? null,
    reelDoubt: wiki.reelDoubts[String(id)] ?? null,
    history: wiki.fifaHistory.find((h) => h.player_id === id) ?? null,
  };
}

export function Jeu({ album, id }: { album: Album; id: number }) {
  const state = useStore();
  const { data, error, retry } = useLoad(() => loadAll(id), [id]);
  if (error) return <Failure text={`La fiche n'a pas pu être ouverte (${error}).`} retry={retry} />;
  if (data === null) return <Loading text="Ouverture de la fiche du jeu…" />;
  if (data === "absent") {
    return (
      <div>
        <BackLink to={{ page: "joueurs" }} label="Tous les joueurs" />
        <p className="empty">Aucun joueur sous ce numéro dans les fichiers du jeu.</p>
      </div>
    );
  }
  const { person, fc24, fc26, reel, reelDoubt, history } = data;
  const card = gameCard(person);
  const owned = state.cards[card.id];
  const starred = state.fav.includes(card.id);
  const attrs = fc24?.attrs;
  const styles = attrs?.play_styles ? attrs.play_styles.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const work = attrs?.work_rate ? attrs.work_rate.split("/").map((part) => RATE[part] ?? part).join(" / ") : null;

  return (
    <div className="fiche">
      <BackLink to={{ page: "joueurs" }} label="Tous les joueurs" />
      <div className="fiche__hero" style={{ "--rc": RARITY[card.rarity].color }}>
        <div className="fiche__card">
          <Carte card={card} count={owned?.[0]} shiny={(owned?.[3] ?? 0) > 0} size="xl" />
        </div>
        <div className="fiche__intro">
          <p className="eyebrow">Fiche du jeu n° {person.id}</p>
          <h1 className="fiche__name">{fc24?.name ?? person.name}</h1>
          {fc26 && fc24 && fc26.name !== fc24.name ? <p className="muted">Nom complet dans le fichier 2025 : {fc26.name}</p> : null}
          <p className="fiche__club">
            {person.club} · {person.clubYear === 2026 ? "club vérifié en 2026" : person.clubYear === 2025 ? "club du jeu, 19 septembre 2025" : "club du jeu, septembre 2023"}
          </p>
          <p className="fiche__pitch">
            Ces chiffres viennent des jeux EA Sports FC. Ce ne sont pas des statistiques de matchs. Le club est celui de la date écrite ; aujourd'hui : NC s'il n'a pas été revérifié.
          </p>
          <p className="fiche__family">
            <span className={`dot dot--${card.rarity}`} aria-hidden="true" />
            Carte {RARITY[card.rarity].label} · {GROUPS[card.group].name}. {RARITY[card.rarity].text}{" "}
            {owned ? <strong>Dans ton classeur{owned[0] > 1 ? ` (×${owned[0]})` : ""}.</strong> : <span className="muted">Pas encore dans ton classeur.</span>}
          </p>
          {!person.face ? <p className="muted">Pas de visuel pour ce joueur dans le fichier.</p> : null}
          <div className="fiche__actions">
            <button type="button" className={starred ? "btn btn--soft btn--on" : "btn btn--soft"} onClick={() => toggleFav(card.id)} aria-pressed={starred}>
              <LuHeart aria-hidden="true" /> {starred ? "Dans tes favoris" : "Mettre en favori"}
            </button>
          </div>
          {person.album.length > 0 ? (
            <div className="albumlinks">
              {person.album.map((aid) => {
                const p = album.byId.get(aid);
                return p ? (
                  <Link key={aid} to={{ page: "fiche", id: aid }} className="btn btn--pitch">
                    Fiche de l'album : {p.display}
                  </Link>
                ) : null;
              })}
            </div>
          ) : null}
        </div>
      </div>

      {reel ? (
        <Section title="Club vérifié à part" kicker={reel.asOf}>
          <p className="gameside__head">
            {reel.club}
            {reel.pos ? ` · ${reel.pos}` : ""}
            {reel.num ? ` · n° ${reel.num}` : ""}
          </p>
          <p className="muted">{reel.source}.</p>
        </Section>
      ) : null}

      {reelDoubt ? (
        <Section title="Club mis de côté">
          <p className="note">
            Le fichier d'origine lui donnait le club {reelDoubt.club}
            {reelDoubt.num ? `, n° ${reelDoubt.num}` : ""} ({reelDoubt.source}). Mais à ce numéro, l'effectif Wikipédia liste {reelDoubt.listed.join(", ") || "un autre joueur"} : un
            autre joueur, avec le même prénom. Ce club n'est donc pas montré comme le sien. La ligne reste dans les données.
          </p>
        </Section>
      ) : null}

      {fc26 ? (
        <Section title="Fichier du 19 septembre 2025" kicker="EA Sports FC 26">
          <Facts
            items={[
              ["Note", String(fc26.overall)],
              ["Potentiel", String(fc26.potential)],
              ["Postes", posListFr(fc26.positions)],
              ["Club", fc26.club],
              ["Pays", fc26.nation],
              ["Taille", fc26.height],
              ["Pied", fc26.foot],
            ]}
          />
          <ul className="bars">
            <Bar label="Vitesse" value={fc26.pace} />
            <Bar label="Tir" value={fc26.shooting} />
            <Bar label="Passe" value={fc26.passing} />
            <Bar label="Dribble" value={fc26.dribbling} />
            <Bar label="Défense" value={fc26.defending} />
            <Bar label="Physique" value={fc26.physic} />
          </ul>
          {fc26.pace == null ? <p className="muted">Pas de notes détaillées dans ce fichier (souvent un gardien).</p> : null}
        </Section>
      ) : null}

      {fc24 && attrs ? (
        <>
          <Section title="Fichier de septembre 2023" kicker="EA Sports FC 24">
            <Facts
              items={[
                ["Note", String(fc24.overall)],
                ["Potentiel", String(fc24.potential)],
                ["Naissance", fc24.born],
                ["Taille", fc24.height],
                ["Poids", fc24.weight],
                ["Pied", fc24.foot],
                ["Postes", posListFr(fc24.positions)],
                ["Pied faible", attrs.weak_foot ? `${attrs.weak_foot} / 5` : null],
                ["Gestes techniques", attrs.skill_moves ? `${attrs.skill_moves} / 5` : null],
                ["Réputation", attrs.reputation ? `${attrs.reputation} / 5` : null],
                ["Activité", work],
                ["Morphologie", BODY[attrs.body_type] ?? attrs.body_type],
              ]}
            />
          </Section>
          <Section title="Club dans le jeu, 2023">
            <Facts
              items={[
                ["Club", fc24.club],
                ["Championnat", fc24.league],
                ["Poste au club", attrs.club_position],
                ["Numéro", fc24.number],
                ["Arrivée", attrs.club_joined],
                ["Fin de contrat", attrs.contract_until],
                ["Valeur", fc24.value],
                ["Salaire", fc24.wage],
                ["Clause", attrs.release_clause],
              ]}
            />
          </Section>
          <Section title="Sélection dans le jeu, 2023">
            <Facts
              items={[
                ["Pays", fc24.nation],
                ["Poste", attrs.nation_position],
                ["Numéro", attrs.nation_number],
              ]}
            />
          </Section>
          <Section title={`Les ${SKILLS.filter(([k]) => attrs.skills[k] != null).length} notes`}>
            <ul className="bars bars--two">
              {SKILLS.map(([key, label]) => (
                <Bar key={key} label={label} value={attrs.skills[key]} />
              ))}
            </ul>
          </Section>
          {styles.length > 0 ? (
            <Section title="Styles de jeu">
              <ul className="honours honours--light">
                {styles.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </Section>
          ) : null}
        </>
      ) : (
        <Section title="Fichier de septembre 2023">
          <p className="muted">Ce joueur n'est pas dans le fichier de septembre 2023. Seul le fichier de 2025 le connaît.</p>
        </Section>
      )}

      {history ? (
        <Section title="Ses notes, jeu après jeu" kicker="Fichier collé à part">
          <ul className="timeline">
            {Object.entries(history.history).map(([edition, h]) => (
              <li key={edition}>
                <strong>
                  {HISTORY_LABEL[edition] ?? edition} · note {h.overall}
                </strong>
                <span>
                  {h.club} · {h.position}
                </span>
              </li>
            ))}
          </ul>
          <Facts
            items={[
              ["Nom complet", history.long_name],
              ["Né le", history.dob],
              ["Âge noté", `${history.age} ans`],
              ["Taille", `${history.height_cm} cm`],
              ["Poids", `${history.weight_kg} kg`],
              ["Pied", history.preferred_foot === "Left" ? "Gaucher" : history.preferred_foot === "Right" ? "Droitier" : history.preferred_foot],
              ["Pied faible", `${history.weak_foot} / 5`],
              ["Gestes techniques", `${history.skill_moves} / 5`],
              ["Postes", [history.primary_position, ...history.secondary_positions].join(", ")],
              ["Club noté", `${history.club} (${history.league})`],
              ["Note, potentiel", `${history.overall}, ${history.potential}`],
              ["Pays", history.nationality],
            ]}
          />
          <ul className="bars">
            {Object.entries(history.attributes).map(([k, v]) => (
              <Bar key={k} label={{ pace: "Vitesse", shooting: "Tir", passing: "Passe", dribbling: "Dribble", defending: "Défense", physical: "Physique" }[k] ?? k} value={v} />
            ))}
          </ul>
          {history.primary_position === "GK" ? (
            <p className="muted">Pour un gardien, le jeu range sous ces six noms ses notes de gardien (plongeon, prise de balle, dégagement, réflexes, vitesse, placement).</p>
          ) : null}
          <p className="muted">Ce fichier collé donne des notes de jeu, pas des statistiques de matchs.</p>
        </Section>
      ) : null}
    </div>
  );
}
