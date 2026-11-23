// Le lecteur vidéo de l'appli : la vidéo officielle s'ouvre en grand, dans l'appli.
// Lecteur YouTube en mode « confidentialité renforcée », vidéos suivantes limitées à la même chaîne.
// Les pubs et le logo YouTube ne peuvent pas être enlevés (règles de YouTube) : c'est la chaîne qui décide des pubs.
// En secours (si le lecteur refuse de s'afficher), un bouton ouvre la même vidéo en dehors de l'appli.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LuExternalLink, LuPlay, LuX } from "react-icons/lu";
import { internetPermis } from "../maj/parents";
import { say } from "../mascot/state";
import { click } from "../sound";
import type { Video } from "../videos";

let ouvrirVideo: ((v: Video) => void) | null = null;

/** Ouvre une vidéo dans le lecteur (si un adulte a permis Internet). */
export function regarder(v: Video) {
  if (!internetPermis()) {
    say("Les vidéos sont sur Internet. Un adulte peut l'allumer dans Réglages, « Pour les grands ».");
    return;
  }
  click("button");
  ouvrirVideo?.(v);
}

const GENRE: Record<Video["genre"], string> = { complet: "Match complet", resume: "Résumé", recit: "Vidéo" };

/** À poser une fois dans l'appli : la fenêtre du lecteur. */
export function Lecteur() {
  const [v, setV] = useState<Video | null>(null);
  useEffect(() => {
    ouvrirVideo = setV;
    return () => {
      ouvrirVideo = null;
    };
  }, []);
  useEffect(() => {
    if (!v) return;
    const back = (e: KeyboardEvent) => e.key === "Escape" && setV(null);
    window.addEventListener("keydown", back);
    return () => window.removeEventListener("keydown", back);
  }, [v]);
  if (!v) return null;
  const src = `https://www.youtube-nocookie.com/embed/${v.yt}?autoplay=1&rel=0&playsinline=1&iv_load_policy=3&hl=fr&cc_lang_pref=fr`;
  return createPortal(
    <div className="lecteur" role="dialog" aria-modal="true" aria-label={v.titre}>
      <div className="lecteur__bar">
        <button type="button" className="btn btn--soft" onClick={() => { click("back"); setV(null); }}><LuX aria-hidden="true" /> Fermer</button>
        <span className="lecteur__titre">
          <strong>{v.titre}</strong>
          <small>{GENRE[v.genre]} · {v.chaine}{v.langue ? ` · commentaire en ${v.langue}` : ""}</small>
        </span>
      </div>
      <div className="lecteur__ecran">
        <iframe
          src={src}
          title={v.titre}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <a className="btn btn--soft lecteur__secours" href={`https://www.youtube.com/watch?v=${v.yt}`} target="_blank" rel="noreferrer">
        La vidéo ne s'affiche pas ? L'ouvrir en dehors de l'appli <LuExternalLink aria-hidden="true" />
      </a>
    </div>,
    document.body,
  );
}

/** Une vignette de vidéo : l'image de la vidéo, son titre, sa chaîne. */
export function Vignette({ v }: { v: Video }) {
  return (
    <button type="button" className="vignette" onClick={() => regarder(v)}>
      <span className="vignette__img">
        <img src={`https://i.ytimg.com/vi/${v.yt}/mqdefault.jpg`} alt="" loading="lazy" onError={(e: Event) => ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")} />
        <span className={`vignette__genre vignette__genre--${v.genre}`}>{GENRE[v.genre]}</span>
        <span className="vignette__play" aria-hidden="true"><LuPlay /></span>
      </span>
      <strong>{v.titre}</strong>
      <small>{v.chaine}{v.langue ? ` · ${v.langue}` : ""}</small>
    </button>
  );
}
