// Découvrir : tout ce qu'on peut explorer (matchs, cartes, histoires, scores, jeux…). Les réglages sont dans pages/reglages.tsx.
import { useMemo } from "react";
import {
  LuBookMarked, LuCalendarDays, LuDices, LuFilm, LuGem, LuGlobe, LuGraduationCap, LuLibrary, LuMessageSquareQuote, LuPlay, LuShieldCheck,
  LuShirt, LuTrophy, LuUsers, LuZap,
} from "react-icons/lu";
import type { Album } from "../data";
import { go, type Route } from "../router";
import { Door, PageTitle, Section } from "../ui/bits";
import { fmt } from "../util";

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

      <Section title="Jouer et gagner" kicker="Pour les pièces">
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
