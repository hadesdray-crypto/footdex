// The parents' corner (from the Encyclopédie de la vie) and the one journal of what's new.
import { type ReactNode, useMemo, useState } from "react";
import { LuCopy, LuDownload, LuRefreshCw, LuUpload } from "react-icons/lu";
import { PageTitle, Section } from "../ui/bits";
import { cx } from "../util";
import { EST_APK, HORS_LIGNE, LIEN_APK, VERSION_APK, VERSION_APP } from "../maj/env";
import { useHorsLigne, verifierMiseAJour } from "../maj/hors-ligne";
import { useMajApk, verifierApk } from "../maj/maj-apk";
import { useNouveautes } from "../maj/nouveautes";
import { permettreInternet, questionAdulte, useInternetPermis } from "../maj/parents";
import { creerCode, restaurerCode } from "../maj/sauvegarde";
import { LIMITES, choisirLimiteEcran, limiteEcran, useTempsEcran } from "../maj/temps-ecran";

export function Parents() {
  return (
    <div>
      <PageTitle kicker="Pour les grands" title="Coin des parents" />
      <Journal />
      <Version />
      <Sauvegarde />
      <Verrou>
        <TempsParJour />
        <Internet />
      </Verrou>
    </div>
  );
}

function Journal() {
  const liste = useNouveautes(true);
  return (
    <Section title="Nouveautés" kicker="Le journal">
      <div className="journal">
        {liste.map((n) => (
          <article key={n.date + n.titre} className="journal__item">
            <p className="journal__tag">{n.type === "appli" ? "🛠️ Appli" : "📊 Données"} · {n.date.split("-").reverse().join("/")}</p>
            <h3>{n.titre}</h3>
            <ul className="list list--compact">{n.points.map((p) => <li key={p}>{p}</li>)}</ul>
          </article>
        ))}
      </div>
    </Section>
  );
}

export function Version() {
  const web = useHorsLigne();
  const apk = useMajApk();
  const v = EST_APK ? apk.verification : web.verification;
  const msg = v === "en-cours" ? "Je regarde…" : v === "a-jour" ? "Tu as la dernière version." : v === "hors-ligne" ? "Pas de connexion : je regarderai plus tard." : v === "erreur" ? "Je n'ai pas pu regarder. Réessaie plus tard." : "";
  return (
    <Section title="Version" kicker={EST_APK ? "Application Android" : HORS_LIGNE ? "Site installé" : "Aperçu"}>
      <p>{EST_APK ? `Version 1.${VERSION_APK}` : "Version du site"} · construite le {VERSION_APP}</p>
      {EST_APK || HORS_LIGNE ? (
        <button type="button" className="btn btn--soft" onClick={() => (EST_APK ? verifierApk() : verifierMiseAJour())}>
          <LuRefreshCw aria-hidden="true" /> Chercher une mise à jour
        </button>
      ) : null}
      {msg ? <p className="note" role="status">{msg}</p> : null}
      {!EST_APK ? <a className="btn btn--gold" href={LIEN_APK}><LuDownload aria-hidden="true" /> Télécharger l'appli Android</a> : null}
    </Section>
  );
}

function Sauvegarde() {
  const [code, setCode] = useState("");
  const [colle, setColle] = useState("");
  const [msg, setMsg] = useState("");
  async function sauver() {
    const c = await creerCode();
    setCode(c);
    try {
      await navigator.clipboard.writeText(c);
      setMsg("Code copié ! Colle-le dans l'autre appli (ou envoie-le-toi par message).");
    } catch {
      setMsg("Sélectionne le code et copie-le.");
    }
  }
  async function recuperer() {
    try {
      const n = await restaurerCode(colle);
      setMsg(`Progression récupérée (${n} éléments). L'appli redémarre…`);
      window.setTimeout(() => location.reload(), 1200);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ce code ne marche pas.");
    }
  }
  return (
    <Section title="Sauvegarder ma progression" kicker="Cartes, étoiles, classeur, personnage">
      <p className="note">Pour passer du site à l'appli Android, ou à un nouveau téléphone, sans rien perdre.</p>
      <button type="button" className="btn btn--gold" onClick={() => void sauver()}><LuCopy aria-hidden="true" /> Créer mon code de sauvegarde</button>
      {code ? <textarea className="save__code" readOnly value={code} rows={3} onFocus={(e: { currentTarget: { select: () => void } }) => e.currentTarget.select()} /> : null}
      <p className="mm__label">Récupérer une progression</p>
      <textarea className="save__code" value={colle} onChange={(e: { target: { value: string } }) => setColle(e.target.value)} rows={3} placeholder="Colle ici le code FOOTDEX1:…" />
      <button type="button" className="btn btn--soft" disabled={!colle.trim()} onClick={() => void recuperer()}><LuUpload aria-hidden="true" /> Récupérer</button>
      {msg ? <p className="note" role="status">{msg}</p> : null}
    </Section>
  );
}

/** The settings below need an adult: a multiplication, different each time. */
function Verrou({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(false);
  const [rep, setRep] = useState("");
  const [a, b] = useMemo(questionAdulte, []);
  if (ok) return <>{children}</>;
  return (
    <Section title="Réglages des parents" kicker="Pour un adulte">
      <label className="parents__lock">Combien font {a} × {b} ?
        <input inputMode="numeric" value={rep} onChange={(e: { target: { value: string } }) => setRep(e.target.value)} />
      </label>
      <button type="button" className="btn btn--soft" disabled={rep.trim() !== String(a * b)} onClick={() => setOk(true)}>Ouvrir</button>
    </Section>
  );
}

function TempsParJour() {
  const [limite, setLimite] = useState(limiteEcran);
  const e = useTempsEcran();
  return (
    <Section title="Temps d'écran par jour" kicker="Le personnage prévient 10 minutes avant">
      <div className="chips" role="radiogroup" aria-label="Temps d'écran par jour">
        {LIMITES.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={limite === m} className={cx("chip", limite === m && "chip--on")} onClick={() => { choisirLimiteEcran(m); setLimite(m); }}>
            {m ? `${m} min` : "Sans limite"}
          </button>
        ))}
      </div>
      <p className="note">Aujourd'hui : {e.minutes} min dans l'appli. Repère des directives canadiennes : au plus 2 heures d'écran de loisir par jour, tous écrans confondus.</p>
    </Section>
  );
}

function Internet() {
  const permis = useInternetPermis();
  return (
    <Section title="Options Internet" kicker={permis ? "Allumées" : "Éteintes"}>
      <p className="note">Les boutons YouTube (vidéos des joueurs et des matchs) et les liens vers d'autres sites ont besoin d'Internet. Éteints, ils ne s'ouvrent pas : le personnage explique qu'il faut un adulte. Les mises à jour et la belle voix restent possibles.</p>
      <button type="button" className={cx("btn", permis ? "btn--soft" : "btn--gold")} onClick={() => permettreInternet(!permis)}>
        {permis ? "Éteindre les options Internet" : "Allumer les options Internet"}
      </button>
    </Section>
  );
}
