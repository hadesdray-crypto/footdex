// Les paramètres, refaits : UN seul point d'entrée (le bouton engrenage / l'onglet « Moi »), puis UN écran par sujet.
//   Paramètres
//   ├─ Mon personnage : qui est-ce · sa voix · ses copains · ses bruitages
//   ├─ L'appli : les sons · les mises à jour · la sauvegarde
//   └─ Pour les grands (code) : temps d'écran et Internet · réglages du jeu · atelier · essais (développeur)
// Chaque écran a une flèche de retour (celle d'Android aussi) et ne montre que ce dont il parle.
import { type ReactNode, useState, useSyncExternalStore } from "react";
import { LuLock, LuCopy, LuMic, LuRefreshCw, LuSettings, LuShieldCheck, LuShirt, LuUserRound, LuUsers, LuVolume2, LuZap } from "react-icons/lu";
import { CodeParent } from "../maj/code";
import { voirBienvenue } from "../maj/Bienvenue";
import { EST_APK, VERSION_APK } from "../maj/env";
import { Atelier, ZombieOptions } from "../mascot/Atelier";
import { Fig } from "../mascot/Fig";
import { Bruitages } from "../mascot/Bruitages";
import { BuddyPicker } from "../mascot/Buddies";
import { CaracList } from "../mascot/Carac";
import { PERSOS } from "../mascot/lines";
import { VoicePanel } from "../mascot/Mascot";
import { choosePerso, hideBubble, sample, stopTalking, update, useMascot } from "../mascot/state";
import { VoicePicker } from "../mascot/VoicePicker";
import { Wardrobe } from "../mascot/Wardrobe";
import type { Route } from "../router";
import { onSoundChange, setSound, soundOn } from "../sound";
import { BackLink, Door, PageTitle, Section } from "../ui/bits";
import { cx } from "../util";
import { Internet, Journal, Sauvegarde, TempsParJour, Version } from "./parents";
import { Essais, ReglagesJeu } from "./reglages-jeu";

const HUB: Route = { page: "moi" };
const GRANDS: Route = { page: "reg-grands" };

/** The frame of one screen: back arrow, title, content. `grands` screens need the parents' code. */
function Ecran({ titre, kicker, retour = HUB, nomRetour = "Paramètres", grands = false, children }: { titre: string; kicker?: string; retour?: Route; nomRetour?: string; grands?: boolean; children: ReactNode }) {
  return (
    <div className="reg">
      <BackLink to={retour} label={nomRetour} />
      <PageTitle kicker={kicker} title={titre} />
      {grands ? <CodeParent titre={titre}>{children}</CodeParent> : children}
    </div>
  );
}

// ------------------------------------------------------------------ the hub

export function Reglages() {
  const m = useMascot();
  const sound = useSyncExternalStore(onSoundChange, soundOn);
  const perso = PERSOS[m.s.perso];
  const [vestiaire, setVestiaire] = useState(false);
  return (
    <div className="reg">
      <PageTitle kicker="Tout se règle ici" title="Paramètres" />

      <button type="button" className="reg__hero" onClick={() => setVestiaire(true)} aria-label={`Ouvrir le vestiaire de ${perso.name} et de ses copains`}>
        <Fig look={m.s.look} size={96} mouth={perso.mouth} />
        <span className="reg__heroText">
          <strong>{perso.name}</strong>
          <span>Touche pour l'habiller, lui et ses copains</span>
        </span>
      </button>
      {vestiaire ? <Wardrobe onClose={() => setVestiaire(false)} start="tenue" /> : null}

      <Section title="Mon personnage" kicker={perso.name}>
        <div className="doors doors--list">
          <Door to={{ page: "reg-personnage" }} kicker="Mon personnage" title="Qui est-ce ?" figure="Son caractère, ses habits, le repos" tone="gold" icon={LuUserRound} />
          <Door to={{ page: "reg-voix" }} kicker="Mon personnage" title="Sa voix" figure="Des molettes : tu écoutes et tu choisis" tone="gold" icon={LuVolume2} />
          <Door to={{ page: "reg-copains" }} kicker="Mon personnage" title="Ses copains" figure="Qui est à l'écran avec lui" icon={LuUsers} />
          <Door to={{ page: "reg-bruitages" }} kicker="Mon personnage" title="Ses bruitages" figure="Enregistre tes propres bruits" icon={LuMic} />
        </div>
      </Section>

      <Section title="L'appli" kicker="Pour tout le monde">
        <div className="doors doors--list">
          <Door to={{ page: "reg-sons" }} kicker="L'appli" title="Les sons" figure={sound ? "Allumés" : "Coupés"} icon={LuVolume2} />
          <Door to={{ page: "reg-maj" }} kicker="L'appli" title="Mises à jour et nouveautés" figure={EST_APK ? `Version 1.${VERSION_APK}` : "Chercher une mise à jour"} icon={LuRefreshCw} />
          <Door to={{ page: "reg-sauvegarde" }} kicker="L'appli" title="Sauvegarder ma progression" figure="Pour changer de téléphone sans rien perdre" icon={LuCopy} />
        </div>
        <div className="chips">
          <button type="button" className="btn btn--soft" onClick={voirBienvenue}>Revoir la visite de l'appli</button>
        </div>
      </Section>

      <Section title="Pour les grands" kicker="Code parent">
        <div className="doors doors--list">
          <Door to={GRANDS} kicker="Avec le code" title="Réglages des grands" figure="Temps d'écran, Internet, réglages du jeu, essais" icon={LuShieldCheck} />
        </div>
      </Section>
    </div>
  );
}

// ------------------------------------------------------------------ mon personnage

export function RegPersonnage() {
  const m = useMascot();
  const [wardrobe, setWardrobe] = useState(false);
  const perso = PERSOS[m.s.perso];
  return (
    <Ecran titre="Qui est-ce ?" kicker={`Aujourd'hui : ${perso.name}`}>
      <Section title="Son caractère" kicker="Touche pour choisir">
        <p className="note">Chaque caractère a sa tenue, sa voix et sa façon de parler. Seul le Jongleur a un ballon.</p>
        <CaracList current={m.s.perso} onPick={(i: number) => { choosePerso(i); window.setTimeout(sample, 60); }} />
        <div className="chips">
          <button type="button" className="btn btn--gold" onClick={() => setWardrobe(true)}><LuShirt aria-hidden="true" /> Vestiaire</button>
          {m.s.rest ? (
            <button type="button" className="btn btn--soft" onClick={() => update({ rest: false })}>Réveiller {perso.name}</button>
          ) : (
            <button type="button" className="btn btn--soft" onClick={() => { stopTalking(); hideBubble(); update({ rest: true }); }}>{perso.name} se repose</button>
          )}
        </div>
      </Section>

      <Section title="Ce qu'il dit" kicker="Les bulles et les explications">
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
        <p className="note">Sur le personnage : un toucher ouvre son menu, deux touchers le font jouer, un appui long permet de le déplacer, un coup de doigt rapide le lance.</p>
      </Section>
      {wardrobe ? <Wardrobe onClose={() => setWardrobe(false)} start="tenue" /> : null}
    </Ecran>
  );
}

export function RegVoix() {
  return (
    <Ecran titre="Sa voix" kicker="Fais rouler une molette : tu l'entends">
      <VoicePicker />
      <Section title="Je n'entends rien ?" kicker="Voix avancée">
        <details className="vp__more">
          <summary>Trouver la bonne voix pas à pas</summary>
          <VoicePanel />
        </details>
      </Section>
    </Ecran>
  );
}

export function RegCopains() {
  return (
    <Ecran titre="Ses copains" kicker="Deux au maximum, à côté de lui">
      <Section>
        <p className="note">Ils parlent avec leur voix, réagissent quand il est lancé… Touche-les pour qu'ils parlent, glisse-les pour les déplacer.</p>
        <BuddyPicker />
      </Section>
      <Section title="Le Zombie" kicker="Comment il joue avec les autres">
        <ZombieOptions />
      </Section>
    </Ecran>
  );
}

export function RegBruitages() {
  return (
    <Ecran titre="Ses bruitages" kicker="Enregistre les bruits des personnages">
      <Bruitages />
    </Ecran>
  );
}

// ------------------------------------------------------------------ l'appli

export function RegSons() {
  const sound = useSyncExternalStore(onSoundChange, soundOn);
  return (
    <Ecran titre="Les sons" kicker={sound ? "Allumés" : "Coupés"}>
      <Section>
        <p className="note">Les sons des boutons, des paquets et du ballon. La voix du personnage ne dépend pas de ce réglage.</p>
        <div className="chips">
          <button type="button" className={cx("chip", sound && "chip--on")} aria-pressed={sound} onClick={() => setSound(true)}>Allumés</button>
          <button type="button" className={cx("chip", !sound && "chip--on")} aria-pressed={!sound} onClick={() => setSound(false)}>Coupés</button>
        </div>
      </Section>
    </Ecran>
  );
}

export function RegMaj() {
  return (
    <Ecran titre="Mises à jour et nouveautés" kicker="Ce qui a changé">
      <Version />
      <Journal />
    </Ecran>
  );
}

export function RegSauvegarde() {
  return (
    <Ecran titre="Sauvegarder ma progression" kicker="Cartes, pièces, personnage">
      <Sauvegarde />
    </Ecran>
  );
}

// ------------------------------------------------------------------ pour les grands (code)

export function RegGrands() {
  return (
    <Ecran titre="Réglages des grands" kicker="Code parent" grands>
      <div className="doors doors--list">
        <Door to={{ page: "reg-ecran" }} kicker="Les grands" title="Temps d'écran et Internet" figure="Limiter le temps, couper les liens" icon={LuLock} />
        <Door to={{ page: "reg-jeu" }} kicker="Les grands" title="Réglages du jeu" figure="Paquets, chances, coffre, mission" icon={LuSettings} />
        <Door to={{ page: "reg-atelier" }} kicker="Les grands" title="L'atelier des personnages" figure="Combien chacun parle et bouge" icon={LuUserRound} />
        <Door to={{ page: "reg-dev" }} kicker="Développeur" title="Essais" figure="Lancer à la main le chapardeur, la fête, la figurine à clipser" tone="gold" icon={LuZap} />
      </div>
    </Ecran>
  );
}

export function RegEcran() {
  return (
    <Ecran titre="Temps d'écran et Internet" kicker="Code parent" retour={GRANDS} nomRetour="Réglages des grands" grands>
      <TempsParJour />
      <Internet />
    </Ecran>
  );
}

export function RegJeu() {
  return (
    <Ecran titre="Réglages du jeu" kicker="Code parent" retour={GRANDS} nomRetour="Réglages des grands" grands>
      <ReglagesJeu />
    </Ecran>
  );
}

export function RegAtelier() {
  return (
    <Ecran titre="L'atelier des personnages" kicker="Code parent" retour={GRANDS} nomRetour="Réglages des grands" grands>
      <p className="note">Combien chaque personnage parle et bouge, s'il peut être lancé, les blessures, le Médecin et l'Arbitre.</p>
      <Atelier />
    </Ecran>
  );
}

export function RegDev() {
  return (
    <Ecran titre="Essais" kicker="Menu développeur" retour={GRANDS} nomRetour="Réglages des grands" grands>
      <Essais />
    </Ecran>
  );
}
