// The app's settings, all in one place: the character, his voice, the sounds, updates, the parents' corner.
import { useState, useSyncExternalStore } from "react";
import { LuShieldCheck, LuShirt } from "react-icons/lu";
import { CaracList } from "../mascot/Carac";
import { VoicePanel } from "../mascot/Mascot";
import { VoicePicker } from "../mascot/VoicePicker";
import { CodeParent } from "../maj/code";
import { PERSOS } from "../mascot/lines";
import { SPEEDS, choosePerso, hideBubble, sample, stopTalking, update, useMascot } from "../mascot/state";
import { Wardrobe } from "../mascot/Wardrobe";
import { go } from "../router";
import { onSoundChange, setSound, soundOn } from "../sound";
import { PageTitle, Section } from "../ui/bits";
import { cx } from "../util";
import { Version } from "./parents";

export function Reglages() {
  const m = useMascot();
  const sound = useSyncExternalStore(onSoundChange, soundOn);
  const [wardrobe, setWardrobe] = useState(false);
  const perso = PERSOS[m.s.perso];
  return (
    <div>
      <PageTitle kicker="L'appli" title="Paramètres" />

      <Section title="Le personnage" kicker={`Aujourd'hui : ${perso.name}`}>
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
        <p className="mm__label">Dis-moi tout ce qui se passe</p>
        <div className="chips">
          <button type="button" className={cx("chip", m.s.narrate && "chip--on")} aria-pressed={m.s.narrate} onClick={() => update({ narrate: true })}>Oui</button>
          <button type="button" className={cx("chip", !m.s.narrate && "chip--on")} aria-pressed={!m.s.narrate} onClick={() => update({ narrate: false })}>Non</button>
        </div>
      </Section>

      <Section title="Change ma voix !" kicker="Une voix pour chaque personnage">
        <VoicePicker />
      </Section>

      <Section title="Réglages avancés de la voix" kicker="Code parent">
        <CodeParent titre="Réglages avancés de la voix">
          <VoicePanel />
        </CodeParent>
      </Section>

      <Section title="Les bruitages" kicker={sound ? "Allumés" : "Coupés"}>
        <p className="note">Les sons des boutons, des paquets et du ballon. La voix du personnage ne dépend pas de ce réglage.</p>
        <div className="chips">
          <button type="button" className={cx("chip", sound && "chip--on")} aria-pressed={sound} onClick={() => setSound(true)}>Allumés</button>
          <button type="button" className={cx("chip", !sound && "chip--on")} aria-pressed={!sound} onClick={() => setSound(false)}>Coupés</button>
        </div>
      </Section>

      <Version />

      <Section title="Pour les grands" kicker="Sauvegarde, temps d'écran, Internet">
        <button type="button" className="btn btn--soft" onClick={() => go({ page: "parents" })}><LuShieldCheck aria-hidden="true" /> Ouvrir le Coin des parents</button>
      </Section>

      {wardrobe ? <Wardrobe onClose={() => setWardrobe(false)} start="tenue" /> : null}
    </div>
  );
}
