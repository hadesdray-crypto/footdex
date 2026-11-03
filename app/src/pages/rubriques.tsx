// Les trois grandes pages de menu de l'application :
//  - Découvrir : tout ce qu'on peut explorer (matchs, cartes, histoires, scores, jeux…)
//  - Moi : mon coin (mon personnage, sons de l'appli, version, entrée des grands)
//  - Personnage : tous les réglages du personnage, au même endroit (et seulement là)
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  LuBookMarked, LuCalendarDays, LuDices, LuFilm, LuGem, LuGlobe, LuGraduationCap, LuLibrary, LuMessageSquareQuote, LuPlay, LuShieldCheck,
  LuShirt, LuTrophy, LuUserRound, LuUsers, LuZap,
} from "react-icons/lu";
import type { Album } from "../data";
import { ZombieOptions } from "../mascot/Atelier";
import { Bruitages } from "../mascot/Bruitages";
import { BuddyPicker } from "../mascot/Buddies";
import { CaracList } from "../mascot/Carac";
import { PERSOS } from "../mascot/lines";
import { SPEEDS, choosePerso, hideBubble, sample, stopTalking, update, useMascot } from "../mascot/state";
import { VoicePicker } from "../mascot/VoicePicker";
import { Wardrobe } from "../mascot/Wardrobe";
import { go, type Route } from "../router";
import { onSoundChange, setSound, soundOn } from "../sound";
import { BackLink, Door, PageTitle, Section } from "../ui/bits";
import { cx, fmt } from "../util";
import { Version } from "./parents";

// ------------------------------------------------------------------ Découvrir

export function Decouvrir({ album }: { album: Album }) {
  const anecdotes = useMemo(() => album.album.reduce((n, p) => n + p.anecdotes.length, 0) + album.matches.length, [album]);
  const surprise = () => {
    const stars = album.album.filter((p) => p._src === "curated");
    const choix: Route[] = [
      ...album.matches.map((m): Route => ({ page: "match", id: m.id })),
      ...stars.map((p): Route => ({ page: "fiche", id: p.id })),
    ];
    if (choix.length) go(choix[Math.floor(Math.random() * choix.length)]);
  };
  return (
    <div>
      <PageTitle kicker="Explore le football" title="Découvrir">
        Des matchs racontés, des cartes, des anecdotes, des vidéos : touche une rubrique et laisse-toi guider.
      </PageTitle>

      <button type="button" className="btn btn--gold btn--glow" onClick={surprise}>
        <LuDices aria-hidden="true" /> Surprends-moi : un match ou une carte au hasard
      </button>

      <Section title="Écouter et regarder" kicker="Les grands soirs">
        <div className="doors doors--list">
          <Door to={{ page: "matchs" }} kicker="Les grands soirs" title="Les matchs racontés" figure={`${fmt(album.matches.length)} matchs à revivre`} tone="pitch" icon={LuTrophy} />
          <Door to={{ page: "histoires" }} kicker="Ça se raconte" title="Les anecdotes" figure={`${fmt(anecdotes)} petites histoires`} tone="gold" icon={LuMessageSquareQuote} />
          <Door to={{ page: "videos" }} kicker="Images" title="Les vidéos" figure="4 matchs animés" icon={LuFilm} />
          <Door to={{ page: "carte" }} kicker="Tour du monde" title="La carte des stades" figure="Voyages et découvertes" tone="pitch" icon={LuGlobe} />
        </div>
      </Section>

      <Section title="Jouer et gagner" kicker="Pour les étoiles">
        <div className="doors doors--list">
          <Door to={{ page: "jeux" }} kicker="On joue ensemble" title="Les jeux" figure="10 jeux avec le personnage" tone="gold" icon={LuPlay} />
          <Door to={{ page: "defi" }} kicker="Chaque jour" title="Le défi du jour" figure="4 bonnes réponses = un paquet bonus" tone="gold" icon={LuGraduationCap} />
          <Door to={{ page: "grand-defi" }} kicker="Dix questions" title="Le grand défi" icon={LuZap} />
          <Door to={{ page: "machine" }} kicker="Des secrets" title="La machine à secrets" figure="Glisse une carte : anecdotes et surprises" tone="pitch" icon={LuGem} />
          <Door to={{ page: "mission" }} kicker="Quand papa le propose" title="La mission de Papa" figure="3 questions pour gagner la carte Mbappé" icon={LuGraduationCap} />
          <Door to={{ page: "coffre" }} kicker="Le trésor" title="Le coffre" figure="Personnages secrets et cartes spéciales" tone="gold" icon={LuGem} />
        </div>
      </Section>

      <Section title="Les chiffres et les clubs" kicker="Pour tout savoir">
        <div className="doors doors--list">
          <Door to={{ page: "joueurs" }} kicker="Tout l'album" title="Les joueurs" figure={`${fmt(album.album.length)} fiches · 25 229 du jeu`} tone="pitch" icon={LuUsers} />
          <Door to={{ page: "scores" }} kicker="Depuis 1872" title="Les scores" figure="72 787 résultats" icon={LuCalendarDays} />
          <Door to={{ page: "coupes" }} kicker="Trophées" title="Les coupes" figure={album.coupes.map((c) => c.title).join(", ")} icon={LuTrophy} />
          <Door to={{ page: "clubs" }} kicker="Huit maisons" title="Les clubs" icon={LuShieldCheck} />
          <Door to={{ page: "saison" }} kicker="2026-2027" title="La saison" figure={`${album.effectifs.clubs.length} clubs`} icon={LuShirt} />
          <Door to={{ page: "lexique" }} kicker="Les mots du foot" title="Le lexique" figure={`${album.lexique.length} mots`} icon={LuBookMarked} />
          <Door to={{ page: "classeur" }} kicker="Ta collection" title="Le classeur" icon={LuLibrary} />
          <Door to={{ page: "sources" }} kicker="Contrôle" title="Sources et certitude" icon={LuShieldCheck} />
        </div>
      </Section>
    </div>
  );
}

// ------------------------------------------------------------------ Moi

export function Moi() {
  const m = useMascot();
  const sound = useSyncExternalStore(onSoundChange, soundOn);
  const perso = PERSOS[m.s.perso];
  return (
    <div>
      <PageTitle kicker="Mon coin" title="Moi" />

      <div className="doors doors--list">
        <Door to={{ page: "personnage" }} kicker="Mon personnage" title={perso.name} figure="Vestiaire, voix, copains, bruitages" tone="gold" icon={LuUserRound} />
        <Door to={{ page: "parents" }} kicker="Pour les grands" title="Coin des parents" figure="Code parent : temps d'écran, sauvegarde, voix avancée" icon={LuShieldCheck} />
      </div>

      <Section title="Sons de l'appli" kicker={sound ? "Allumés" : "Coupés"}>
        <p className="note">Les sons des boutons, des paquets et du ballon. La voix du personnage ne dépend pas de ce réglage.</p>
        <div className="chips">
          <button type="button" className={cx("chip", sound && "chip--on")} aria-pressed={sound} onClick={() => setSound(true)}>Allumés</button>
          <button type="button" className={cx("chip", !sound && "chip--on")} aria-pressed={!sound} onClick={() => setSound(false)}>Coupés</button>
        </div>
      </Section>

      <Version />
    </div>
  );
}

// ------------------------------------------------------------------ Mon personnage

export function Personnage() {
  const m = useMascot();
  const [wardrobe, setWardrobe] = useState(false);
  const perso = PERSOS[m.s.perso];
  return (
    <div>
      <BackLink to={{ page: "moi" }} label="Moi" />
      <PageTitle kicker={`Aujourd'hui : ${perso.name}`} title="Mon personnage" />

      <Section title="Qui est-ce ?" kicker="Son caractère et ses habits">
        <p className="note">Chaque caractère a sa tenue, sa voix et sa façon de parler. Seul le Jongleur a un ballon.</p>
        <CaracList current={m.s.perso} onPick={(i: number) => { choosePerso(i); window.setTimeout(sample, 60); }} />
        <div className="chips">
          <button type="button" className="btn btn--gold" onClick={() => setWardrobe(true)}><LuShirt aria-hidden="true" /> Vestiaire</button>
          {m.s.rest ? (
            <button type="button" className="btn btn--soft" onClick={() => update({ rest: false })}>Réveiller {perso.name}</button>
          ) : (
            <button type="button" className="btn btn--soft" onClick={() => { stopTalking(); hideBubble(); update({ rest: true }); }}>💤 {perso.name} se repose</button>
          )}
        </div>
        <p className="note">Sur le personnage : un toucher ouvre son menu, deux touchers le font jouer (ou continuer son histoire), un appui long permet de le déplacer, un coup de doigt rapide le lance.</p>
      </Section>

      <Section title="Sa voix" kicker="Comment il parle">
        <p className="mm__label">Vitesse</p>
        <div className="chips">
          {SPEEDS.map((s, i) => (
            <button key={s.label} type="button" className={cx("chip", m.s.speed === i && "chip--on")} aria-pressed={m.s.speed === i} onClick={() => { update({ speed: i }); sample(); }}>{s.label}</button>
          ))}
        </div>
        <p className="mm__label">Afficher ce qu'il dit (les bulles de texte)</p>
        <div className="chips">
          <button type="button" className={cx("chip", m.s.bubbles && "chip--on")} aria-pressed={m.s.bubbles} onClick={() => update({ bubbles: true })}>Oui</button>
          <button type="button" className={cx("chip", !m.s.bubbles && "chip--on")} aria-pressed={!m.s.bubbles} onClick={() => update({ bubbles: false })}>Non</button>
        </div>
        <p className="mm__label">Dis-moi tout ce qui se passe</p>
        <div className="chips">
          <button type="button" className={cx("chip", m.s.narrate && "chip--on")} aria-pressed={m.s.narrate} onClick={() => update({ narrate: true })}>Oui</button>
          <button type="button" className={cx("chip", !m.s.narrate && "chip--on")} aria-pressed={!m.s.narrate} onClick={() => update({ narrate: false })}>Non</button>
        </div>
      </Section>

      <Section title="Change ma voix !" kicker="Une voix pour chaque personnage, le Médecin et l'Arbitre">
        <VoicePicker />
      </Section>

      <Section title="Ses copains" kicker="Deux au maximum, à côté de lui">
        <p className="note">Ils parlent avec leur voix, réagissent quand il est lancé… Touche-les pour qu'ils parlent, glisse-les pour les déplacer.</p>
        <BuddyPicker />
      </Section>

      <Section title="Le Zombie" kicker="Comment il joue avec les autres">
        <ZombieOptions />
      </Section>

      <Section title="Mes bruitages" kicker="Enregistre les bruits des personnages">
        <Bruitages />
      </Section>

      {wardrobe ? <Wardrobe onClose={() => setWardrobe(false)} start="tenue" /> : null}
    </div>
  );
}
