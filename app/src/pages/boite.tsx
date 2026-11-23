// La boîte à objets : tout ce qu'on a gagné qui n'est pas une carte — figurines, personnages, histoires, objets du coffre.
// Elle est rangée sur l'étagère de « Ma collection », à côté des classeurs.
import { type ReactNode, useState } from "react";
import { LuChevronsUp, LuClapperboard, LuLock, LuMusic, LuTrophy, LuX } from "react-icons/lu";
import { FBX } from "../fbx/art";
import { tradeFigDuplicates, useCollec } from "../fbx/store";
import { FigZoom, Figurine } from "../fbx/ui";
import type { Edition } from "../fbx/Standee";
import { vibrate } from "../fx";
import { Fig } from "../mascot/Fig";
import { CARAC } from "../mascot/caractere";
import { HISTOIRES, armer, carteId, desarmer, lancerHistoire, useArmees, useVues } from "../mascot/histoires";
import { PERSOS } from "../mascot/lines";
import { DOCTOR_LOOK, say, update, useMascot } from "../mascot/state";
import { click, coins, crinkle } from "../sound";
import { useStore } from "../store";
import { cx } from "../util";
import { SECRETS, SPECIALS } from "./coffre";

/** Combien d'objets sont dans la boîte. */
export function useNombreObjets(): number {
  const s = useStore();
  const c = useCollec();
  const figs = FBX.filter((f) => c.figs[f.id]).length + FBX.filter((f) => c.figsC[f.id]).length;
  const persos = SECRETS.filter((x) => s.chest.includes(x.id)).length + c.styles.length;
  const hist = HISTOIRES.filter((h) => s.chest.includes(carteId(h.id))).length;
  const objets = SPECIALS.filter((x) => s.chest.includes(x.id)).length;
  return figs + persos + hist + objets;
}

/** Le dessin de la boîte (petite sur l'étagère, grande quand on l'a fait venir devant).
 *  On l'ouvre en poussant le couvercle vers le haut, ou avec le bouton. */
export function BoiteVisuel({ small = false, count, onTap, onOpen }: { small?: boolean; count: number; onTap?: () => void; onOpen: () => void }) {
  const [ouverte, setOuverte] = useState(false);
  const [lift, setLift] = useState(0);

  function ouvrir() {
    if (ouverte) return;
    setOuverte(true);
    crinkle(0.4);
    vibrate(12);
    window.setTimeout(() => {
      onOpen();
      setOuverte(false);
      setLift(0);
    }, 520);
  }

  function down(e: PointerEvent) {
    if (e.button !== undefined && e.button > 0) return;
    if ((e.target as HTMLElement).closest(".boite__btn")) return;
    const el = e.currentTarget as HTMLElement;
    const h = el.getBoundingClientRect().height || 200;
    const sx = e.clientX;
    const sy = e.clientY;
    const pid = e.pointerId;
    let drag = false;
    let last = 0;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (!drag) {
        if (Math.abs(dy) < 10) return;
        if (Math.abs(dx) > Math.abs(dy) || dy > 0) return end(); // vers le bas ou sur le côté : ce n'est pas pour nous
        drag = true;
        try {
          el.setPointerCapture(pid);
        } catch {
          /* rien */
        }
      }
      last = Math.max(0, Math.min(1, -dy / (h * 0.6)));
      setLift(last);
    };
    const block = (ev: TouchEvent) => {
      if (drag && ev.cancelable) ev.preventDefault();
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      const wasDrag = drag;
      end();
      if (!wasDrag) {
        click("button");
        onTap?.();
      } else if (last > 0.35) ouvrir();
      else setLift(0);
    };
    function end() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("touchmove", block);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("touchmove", block, { passive: false });
  }

  const angle = ouverte ? -115 : -lift * 115;
  return (
    <div className={cx("boite", small && "boite--small")} onPointerDown={down} role="button" tabIndex={0} aria-label={small ? "Ma boîte à objets : la voir en grand" : "Ma boîte à objets : pousse le couvercle vers le haut pour l'ouvrir"}>
      <div className="boite__inside" aria-hidden="true">
        <span className="boite__peek boite__peek--a" />
        <span className="boite__peek boite__peek--b" />
        <span className="boite__peek boite__peek--c" />
      </div>
      <div className={cx("boite__lid", (ouverte || lift === 0) && "is-anim")} style={{ transform: `rotateX(${angle}deg)` }} aria-hidden="true">
        <span className="boite__lidtop" />
      </div>
      <div className="boite__body">
        <span className="boite__plank" />
        <span className="boite__plank" />
        <span className="boite__corner boite__corner--l" />
        <span className="boite__corner boite__corner--r" />
        <span className="boite__plate">
          <strong>MA BOÎTE</strong>
          <em>à objets</em>
          <small>{count} objet{count > 1 ? "s" : ""}</small>
        </span>
        <span className="boite__lock" />
      </div>
      {!small ? (
        <>
          <span className="boite__swipe" aria-hidden="true"><LuChevronsUp /> pousse le couvercle</span>
          <button type="button" className="cover__open boite__btn" onClick={ouvrir}>Ouvrir</button>
        </>
      ) : null}
    </div>
  );
}

type Onglet = "figurines" | "persos" | "histoires" | "objets";

/** Ce qu'il y a dans la boîte : seulement ce qui a été gagné. */
export function BoiteContenu({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const c = useCollec();
  const m = useMascot();
  const vues = useVues();
  const armees = useArmees();
  const [tab, setTab] = useState<Onglet>("figurines");
  const [figZoom, setFigZoom] = useState<{ id: string; v: Edition } | null>(null);

  const figs: { id: string; v: Edition; n: number }[] = [
    ...FBX.filter((f) => c.figs[f.id]).map((f) => ({ id: f.id, v: "s" as Edition, n: c.figs[f.id] })),
    ...FBX.filter((f) => c.figsC[f.id]).map((f) => ({ id: f.id, v: "c" as Edition, n: c.figsC[f.id] })),
  ];
  const secrets = SECRETS.filter((x) => s.chest.includes(x.id));
  const hist = HISTOIRES.filter((h) => s.chest.includes(carteId(h.id)));
  const objets = SPECIALS.filter((x) => s.chest.includes(x.id));
  const look = (k: string) => (k === "medecin" ? DOCTOR_LOOK : m.s.looks[k] ?? CARAC[k as keyof typeof CARAC].tenue);
  const vide = (t: string) => <p className="boitec__vide"><LuLock aria-hidden="true" /> {t}</p>;

  return (
    <div className="boitec" role="dialog" aria-modal="true" aria-label="Ma boîte à objets">
      <div className="livre__bar">
        <button type="button" className="btn btn--soft" onClick={() => { click("back"); onClose(); }}><LuX aria-hidden="true" /> Fermer la boîte</button>
        <strong className="boitec__titre">Ma boîte à objets</strong>
      </div>
      <div className="segmented" role="tablist" aria-label="Dans la boîte">
        {([
          ["figurines", `Figurines ${figs.length}`],
          ["persos", `Personnages ${secrets.length + c.styles.length}`],
          ["histoires", `Histoires ${hist.length}`],
          ["objets", `Objets ${objets.length}`],
        ] as [Onglet, string][]).map(([t, l]) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={cx("segmented__tab", tab === t && "segmented__tab--on")} onClick={() => { click("soft"); setTab(t); }}>{l}</button>
        ))}
      </div>

      <div className="boitec__fond">
        {tab === "figurines" ? (
          figs.length ? (
            <div className="colx__shelf">
              {figs.map((f) => (
                <div key={`${f.v}-${f.id}`} className="colx__figslot">
                  <button type="button" className="colx__figbtn" aria-label="Voir la figurine en grand" onClick={() => setFigZoom({ id: f.id, v: f.v })}>
                    <Figurine id={f.id} edition={f.v} owned count={f.n} size={140} spin={false} />
                  </button>
                  {f.n > 1 ? (
                    <button type="button" className="btn btn--ghost btn--small" onClick={() => { const g = tradeFigDuplicates(f.id, f.v); if (g) { coins(4); say(`${g} pièces d'or !`); } }}>Échanger le doublon</button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : vide("Pas encore de figurine. Elles se gagnent dans le coffre des Footballinis.")
        ) : tab === "persos" ? (
          secrets.length || c.styles.length ? (
            <div className="colx__styles">
              {secrets.map((x) => {
                const wearing = m.s.perso === x.perso && JSON.stringify(m.s.look) === JSON.stringify(x.look);
                return (
                  <div key={x.id} className="colx__style">
                    <Fig look={x.look} size={90} crop="bust" mouth="grin" mode={PERSOS[x.perso].mode} />
                    <strong>{x.name}</strong>
                    <button type="button" className="btn btn--gold btn--small" disabled={wearing} onClick={() => { update({ perso: x.perso, look: x.look }); window.setTimeout(() => say(x.line), 250); }}>{wearing ? "Il est avec toi" : "Le choisir"}</button>
                  </div>
                );
              })}
              {c.styles.map((st, k) => (
                <div key={`style-${k}`} className="colx__style">
                  <Fig look={st.look} size={90} mouth="grin" />
                  <strong>{st.name}</strong>
                  <button type="button" className="btn btn--soft btn--small" onClick={() => { update({ look: st.look }); say(`Je m'habille comme ${st.name} !`); }}>L'habiller comme ça</button>
                </div>
              ))}
            </div>
          ) : vide("Pas encore de personnage. Ouvre les coffres !")
        ) : tab === "histoires" ? (
          hist.length ? (
            <ul className="specials">
              {hist.map((h) => (
                <li key={h.id} className="spec" style={{ "--h1": "#c58bff", "--h2": "#3d1a6b" }}>
                  <div className="spec__art spec__art--duo">{h.fixes.map((k) => <Fig key={k} look={look(k)} size={52} crop="bust" />)}</div>
                  <h3>{h.titre}</h3>
                  <p className="spec__quirk">{h.teaser}</p>
                  <p className="spec__fact">
                    {armees[h.id] > 0
                      ? `Carte activée, encore ${Math.max(1, Math.ceil(armees[h.id] / 60000))} min : mets les bons personnages côte à côte.`
                      : `${vues[h.id] ? `Vue ${vues[h.id]} fois. ` : ""}Carte éteinte : l'histoire ne vient pas toute seule.`}
                  </p>
                  {armees[h.id] > 0 ? (
                    <button type="button" className="btn btn--soft" onClick={() => desarmer(h.id)}>Éteindre la carte</button>
                  ) : (
                    <button type="button" className="btn btn--gold" onClick={() => armer(h.id)}>Activer 30 minutes</button>
                  )}
                  <button type="button" className="btn btn--soft" onClick={() => lancerHistoire(h.id, [...m.s.buddies, PERSOS[m.s.perso].mode as string])}>Revoir l'histoire</button>
                </li>
              ))}
            </ul>
          ) : vide("Pas encore d'histoire. Elles sont cachées dans le coffre.")
        ) : (
          <>
          {objets.length ? (
          <ul className="specials">
            {objets.map((x) => {
              const Icon = x.icon;
              return (
                <li key={x.id} className="spec" style={{ "--h1": x.hue[0], "--h2": x.hue[1] }}>
                  <div className="spec__art"><Icon aria-hidden="true" /></div>
                  <h3>{x.name}</h3>
                  <p className="spec__quirk">{x.quirk}</p>
                  <p className="spec__fact"><strong>Savais-tu ?</strong> {x.fact}</p>
                  <button type="button" className="btn btn--soft" onClick={() => say(`${x.name}. ${x.quirk} Savais-tu ? ${x.fact}`)}>Écouter</button>
                </li>
              );
            })}
          </ul>
          ) : (
            vide("Pas encore d'objet. Ouvre le coffre pour en trouver !")
          )}
          <div className="colx__soon">
            <p className="boitec__bientot">Bientôt dans la boîte</p>
            {(
              [
                [<LuMusic key="m" />, "Musiques", "De courts morceaux de musique à collectionner."],
                [<LuClapperboard key="c" />, "Clips", "De petits clips vidéo rigolos."],
                [<LuTrophy key="t" />, "Séquences de match", "Les plus beaux buts, à revoir."],
              ] as [ReactNode, string, string][]
            ).map(([i, t, d]) => (
              <div key={t} className="colx__soonitem">
                <span aria-hidden="true">{i}</span>
                <strong>{t}</strong>
                <em>{d}</em>
                <LuLock aria-hidden="true" />
              </div>
            ))}
          </div>
          </>
        )}
      </div>
      {figZoom ? <FigZoom id={figZoom.id} v={figZoom.v} count={(figZoom.v === "c" ? c.figsC : c.figs)[figZoom.id] ?? 1} onClose={() => setFigZoom(null)} /> : null}
    </div>
  );
}
