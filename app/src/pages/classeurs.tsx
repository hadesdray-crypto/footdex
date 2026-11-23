import { createPortal } from "react-dom";
// Les classeurs : la couverture qu'on ouvre en la glissant sur le côté, l'étagère de « Ma collection »
// (le classeur des joueurs et celui des Footballinis), et le classeur des Footballinis.
import { type ReactNode, useEffect, useRef, useState } from "react";
import { LuArrowLeft, LuArrowRight, LuChevronsLeft, LuMaximize2, LuMinimize2, LuSettings2, LuX } from "react-icons/lu";
import { FBX } from "../fbx/art";
import { FbxCard } from "../fbx/ui";
import { useCollec } from "../fbx/store";
import { vibrate } from "../fx";
import { go } from "../router";
import { click, rustle } from "../sound";
import { useStore } from "../store";
import { Ball } from "../ui/pack";
import { cx } from "../util";
import { ANNEAUX, COUVS, FONDS, PAPIERS, changerClasseur, reglagesClasseur, remettreClasseur, type Quel, type Reglages, useClasseur } from "../vue-classeur";
import { BoiteContenu, BoiteVisuel, useNombreObjets } from "./boite";

export type Theme = "joueurs" | "fbx";

/** Demande au classeur des joueurs de s'ouvrir directement (on vient de l'ouvrir depuis l'étagère). */
export const OUVRIR_LIVRE = "footdex.livre.ouvrir";
export function livreDejaOuvert(): boolean {
  try {
    const v = sessionStorage.getItem(OUVRIR_LIVRE) === "1";
    sessionStorage.removeItem(OUVRIR_LIVRE);
    return v;
  } catch {
    return false;
  }
}

const TITRES: Record<Theme, { titre: string; sous: string }> = {
  joueurs: { titre: "FOOTDEX", sous: "les joueurs" },
  fbx: { titre: "FOOTBALLINIS", sous: "les rigolos" },
};

/** Une couverture de classeur. On l'ouvre en la glissant vers le côté (elle tourne sur ses anneaux),
 *  ou avec le bouton « Ouvrir ». Un simple toucher appelle onTap (sur l'étagère : la voir en grand). */
export function Couverture({ theme, count, onOpen, onTap, small = false, apercu }: { theme: Theme; count: number; onOpen: () => void; onTap?: () => void; small?: boolean; apercu?: ReactNode }) {
  const [angle, setAngle] = useState(0);
  const [anim, setAnim] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const t = TITRES[theme];
  const couleurs = useClasseur(theme);

  function finish() {
    setAnim(true);
    setAngle(-165);
    rustle();
    vibrate(12);
    window.setTimeout(() => {
      onOpen();
      setAnim(false);
      setAngle(0);
    }, 420);
  }

  function down(e: PointerEvent) {
    if (e.button !== undefined && e.button > 0) return;
    if ((e.target as HTMLElement).closest(".couv__btn")) return;
    const w = ref.current?.getBoundingClientRect().width ?? 300;
    const sx = e.clientX;
    const sy = e.clientY;
    const pid = e.pointerId;
    const el = e.currentTarget as HTMLElement;
    let drag = false;
    let last = 0;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (!drag) {
        if (Math.abs(dx) < 10) return;
        if (Math.abs(dy) > Math.abs(dx)) return end(); // ça défile, ce n'est pas pour nous
        drag = true;
        try {
          el.setPointerCapture(pid);
        } catch {
          /* rien */
        }
      }
      // Glisser vers la gauche ou vers la droite : la couverture tourne sur ses anneaux.
      last = Math.min(1, Math.abs(dx) / (w * 0.9));
      setAngle(-last * 165);
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
      } else if (last > 0.33) finish();
      else {
        setAnim(true);
        setAngle(0);
        window.setTimeout(() => setAnim(false), 300);
      }
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

  return (
    <div className={cx("couv", `couv--${theme}`, small && "couv--small")} ref={ref} style={couleurs.style}>
      {/* sous la couverture : la première page, avec les vraies cartes (aucune pochette vide) */}
      <div className="couv__inside" aria-hidden="true">
        {apercu}
      </div>
      <div
        className={cx("cover", `cover--${theme}`, anim && "cover--anim")}
        style={{ transform: `rotateY(${angle}deg)` }}
        onPointerDown={down}
        role="button"
        tabIndex={0}
        aria-label={`Classeur ${t.sous}${small ? " : le voir en grand" : " : glisse sur le côté pour l'ouvrir"}`}
        onKeyDown={(e: KeyboardEvent) => (e.key === "Enter" ? (small && onTap ? onTap() : finish()) : undefined)}
      >
        <span className="cover__spine" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="cover__stitch" aria-hidden="true" />
        <span className="cover__badge" aria-hidden="true">{theme === "joueurs" ? <Ball className="cover__ball" /> : <span className="cover__fbx">★</span>}</span>
        <span className="cover__title">{t.titre}</span>
        <span className="cover__sub">{t.sous}</span>
        <span className="cover__count">{count} carte{count > 1 ? "s" : ""}</span>
        {!small ? (
          <>
            <span className="cover__swipe" aria-hidden="true"><LuChevronsLeft /> glisse pour ouvrir</span>
            <button type="button" className="cover__open couv__btn" onClick={() => finish()}>Ouvrir</button>
          </>
        ) : null}
      </div>
    </div>
  );
}

type Rayon = Theme | "boite";

/** L'étagère de « Ma collection » : les deux classeurs et la boîte à objets.
 *  Un toucher : l'objet sort un peu de l'étagère. Un deuxième : il vient devant, en grand. Puis on l'ouvre. */
export function Etagere() {
  const s = useStore();
  const c = useCollec();
  const objets = useNombreObjets();
  const [zoom, setZoom] = useState<Rayon | null>(null);
  const [sorti, setSorti] = useState<Rayon | null>(null);
  const [fbxOpen, setFbxOpen] = useState(false);
  const [boiteOpen, setBoiteOpen] = useState(false);
  const joueurs = Object.keys(s.cards).length;
  const fbx = FBX.filter((f) => c.cards[f.id]).length;
  const count = (t: Theme) => (t === "joueurs" ? joueurs : fbx);

  function tap(t: Rayon) {
    if (sorti === t) {
      setSorti(null);
      setZoom(t);
    } else {
      setSorti(t);
      vibrate(8);
    }
  }

  function open(t: Rayon) {
    setZoom(null);
    setSorti(null);
    if (t === "boite") return setBoiteOpen(true);
    if (t === "joueurs") {
      try {
        sessionStorage.setItem(OUVRIR_LIVRE, "1");
      } catch {
        /* le classeur s'ouvrira sur sa couverture */
      }
      go({ page: "classeur" });
    } else if (reglagesClasseur("fbx").vue === "liste") {
      // affichage « liste » choisi : la grille des Footballinis, juste en dessous
      document.querySelector(".colx__grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else setFbxOpen(true);
  }

  return (
    <>
      <div className="etagere">
        <p className="etagere__title">Mes classeurs et ma boîte</p>
        <div className="etagere__row">
          {(["joueurs", "fbx"] as Theme[]).map((t) => (
            <div key={t} className={cx("etagere__item", sorti === t && "is-out")}>
              <Couverture theme={t} count={count(t)} small onTap={() => tap(t)} onOpen={() => open(t)} />
              {sorti === t ? <span className="etagere__tip">Touche encore</span> : null}
            </div>
          ))}
          <div className={cx("etagere__item etagere__item--boite", sorti === "boite" && "is-out")}>
            <BoiteVisuel small count={objets} onTap={() => tap("boite")} onOpen={() => open("boite")} />
            {sorti === "boite" ? <span className="etagere__tip">Touche encore</span> : null}
          </div>
        </div>
        <span className="etagere__plank" aria-hidden="true" />
      </div>

      {zoom ? createPortal(
        <div className="couvzoom" role="dialog" aria-modal="true" aria-label={zoom === "boite" ? "La boîte à objets en grand" : "Le classeur en grand"}>
          <button type="button" className="btn btn--soft couvzoom__close" onClick={() => { click("back"); setZoom(null); }}><LuX aria-hidden="true" /> Fermer</button>
          {zoom === "boite" ? (
            <div className="couvzoom__boite">
              <BoiteVisuel count={objets} onOpen={() => open("boite")} />
            </div>
          ) : (
            <Couverture theme={zoom} count={count(zoom)} onOpen={() => open(zoom)} />
          )}
          <p className="couvzoom__help">{zoom === "boite" ? "Pousse le couvercle vers le haut pour ouvrir la boîte." : "Glisse la couverture sur le côté pour ouvrir le classeur."}</p>
        </div>,
        document.body,
      ) : null}
      {fbxOpen ? createPortal(<ClasseurFbx onClose={() => setFbxOpen(false)} />, document.body) : null}
      {boiteOpen ? createPortal(<BoiteContenu onClose={() => setBoiteOpen(false)} />, document.body) : null}
    </>
  );
}

/** Le classeur des Footballinis : 20 pochettes, les cartes trouvées dedans, les autres en ombre. */
function ClasseurFbx({ onClose }: { onClose: () => void }) {
  const c = useCollec();
  const r = useClasseur("fbx");
  const [page, setPage] = useState(0);
  const [two, setTwo] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [turn, setTurn] = useState<"" | "next" | "prev">("");
  const [regl, setRegl] = useState(false);

  useEffect(() => {
    const m = () => setTwo(window.innerWidth >= 760 && window.innerWidth > window.innerHeight);
    m();
    window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, []);

  const pages = Math.ceil(FBX.length / 9) + (two && Math.ceil(FBX.length / 9) % 2 ? 1 : 0);
  const step = two ? 2 : 1;
  const first = two ? page - (page % 2) : page;
  const shown = two ? [first, first + 1] : [first];

  function goTo(n: number, dir: "next" | "prev") {
    if (n < 0 || n > pages - 1 || turn) return;
    if (r.son) rustle();
    setTurn(dir);
    window.setTimeout(() => {
      setPage(n);
      setTurn("");
    }, Math.round(r.flipMs / 2));
  }

  // glisser le doigt sur la page pour la tourner
  function swipe(e: PointerEvent) {
    const sx = e.clientX;
    const sy = e.clientY;
    const pid = e.pointerId;
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      window.removeEventListener("pointerup", up);
      const dx = ev.clientX - sx;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(ev.clientY - sy) * 1.4) goTo(dx < 0 ? first + step : first - step, dx < 0 ? "next" : "prev");
    };
    window.addEventListener("pointerup", up);
  }

  return (
    <div className={cx("fbxbook", r.vue === "grand" && "fbxbook--grand")} role="dialog" aria-modal="true" aria-label="Le classeur des Footballinis" style={r.style}>
      <div className="livre__bar">
        <button type="button" className="btn btn--soft" onClick={() => { click("back"); onClose(); }}><LuX aria-hidden="true" /> Fermer</button>
        <div className="livre__nav">
          <button type="button" className="btn btn--soft" onClick={() => goTo(first - step, "prev")} disabled={first === 0} aria-label="Page précédente"><LuArrowLeft aria-hidden="true" /></button>
          <strong>{two ? `Pages ${first + 1} et ${first + 2} sur ${pages}` : `Page ${first + 1} sur ${pages}`}</strong>
          <button type="button" className="btn btn--soft" onClick={() => goTo(first + step, "next")} disabled={first + step > pages - 1} aria-label="Page suivante"><LuArrowRight aria-hidden="true" /></button>
        </div>
        <button type="button" className={cx("btn btn--soft", regl && "btn--on")} onClick={() => { click("soft"); setRegl((v: boolean) => !v); }}><LuSettings2 aria-hidden="true" /> Réglages</button>
        <button type="button" className="btn btn--soft" onClick={() => { click("soft"); changerClasseur("fbx", { vue: r.vue === "grand" ? "page" : "grand" }); }}>
          {r.vue === "grand" ? <LuMinimize2 aria-hidden="true" /> : <LuMaximize2 aria-hidden="true" />} {r.vue === "grand" ? "Plus petit" : "En grand"}
        </button>
        <span className="livre__count">{FBX.filter((f) => c.cards[f.id]).length} / {FBX.length} trouvées</span>
      </div>
      {regl ? <ReglagesClasseur quel="fbx" /> : null}
      <div className="table">
        <div className={cx("classeur", "classeur--fbx", two ? "classeur--two" : "classeur--one", turn && `turn-${turn}`, r.classes)} onPointerDown={swipe}>
          {shown.map((p, i) => (
            <div key={p} className={cx("feuille", two && (i === 0 ? "feuille--left" : "feuille--right"))}>
              <ul className="pockets">
                {Array.from({ length: 9 }, (_, slot) => {
                  const f = FBX[p * 9 + slot];
                  return (
                    <li key={slot} className="pocket">
                      <span className="pocket__num">{p * 9 + slot + 1}</span>
                      {f ? (
                        <div className="pocket__card pocket__card--fbx">
                          <FbxCard id={f.id} owned={!!c.cards[f.id]} count={c.cards[f.id] ?? 0} onClick={() => { if (c.cards[f.id]) { click("soft"); setZoom(f.id); } }} />
                        </div>
                      ) : null}
                      <span className="pocket__glass" aria-hidden="true" />
                    </li>
                  );
                })}
              </ul>
              <span className="feuille__num" aria-hidden="true">{p + 1}</span>
            </div>
          ))}
          <span className="classeur__rings" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
      <p className="livre__help">Touche une carte trouvée pour la voir en grand. Glisse ton doigt sur la page pour la tourner.</p>
      {zoom ? (
        <div className="chm" role="dialog" aria-modal="true" onClick={() => setZoom(null)}>
          <div className="chm__box chm__box--card">
            <FbxCard id={zoom} big count={c.cards[zoom] ?? 1} />
            <button type="button" className="btn btn--gold" onClick={() => setZoom(null)}>Fermer</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Les réglages d'un classeur : affichage, couverture, pages, fond, anneaux, pochettes, sons… */
export function ReglagesClasseur({ quel }: { quel: Quel }) {
  const r = useClasseur(quel);
  const set = (part: Partial<Reglages>) => {
    click("soft");
    changerClasseur(quel, part);
  };
  const chips = <T extends string | boolean>(titre: string, valeur: T, options: [T, string][], cle: keyof Reglages) => (
    <div className="couleurs__ligne">
      <span>{titre}</span>
      <div className="chips">
        {options.map(([v, l]) => (
          <button key={String(v)} type="button" className={cx("chip", valeur === v && "chip--on")} aria-pressed={valeur === v} onClick={() => set({ [cle]: v } as Partial<Reglages>)}>{l}</button>
        ))}
      </div>
    </div>
  );
  const swatch = (on: boolean, nom: string, bg: string, onClick: () => void, extra?: Record<string, string>) => (
    <button key={nom} type="button" className={cx("couleurs__sw", on && "is-on")} aria-pressed={on} onClick={onClick}>
      <span style={{ background: bg, ...extra }} />
      <small>{nom}</small>
    </button>
  );
  return (
    <div className="couleurs">
      {chips("Affichage", r.vue, [["page", "Dans la page"], ["grand", "En grand"], ["liste", "La liste"]], "vue")}
      <p className="couleurs__titre">La couverture</p>
      <div className="couleurs__row">{COUVS.map((c) => swatch(r.couv === c.id, c.nom, `radial-gradient(120% 90% at 30% 10%, ${c.a}, ${c.b} 75%)`, () => set({ couv: c.id }), { borderColor: c.ligne }))}</div>
      <p className="couleurs__titre">Les pages</p>
      <div className="couleurs__row">{PAPIERS.map((c) => swatch(r.papier === c.id, c.nom, `linear-gradient(90deg, ${c.a}, ${c.b} 30%)`, () => set({ papier: c.id })))}</div>
      <p className="couleurs__titre">Le fond derrière le classeur</p>
      <div className="couleurs__row">{FONDS.map((c) => swatch(r.fond === c.id, c.nom, c.css, () => set({ fond: c.id }), { width: "58px", borderRadius: "8px" }))}</div>
      <p className="couleurs__titre">Les anneaux</p>
      <div className="couleurs__row">{ANNEAUX.map((c) => swatch(r.anneaux === c.id, c.nom, `linear-gradient(${c.a}, ${c.b} 50%, ${c.c})`, () => set({ anneaux: c.id }), { width: "40px", height: "22px", borderRadius: "11px" }))}</div>
      {chips("Les pochettes", r.pochettes, [["brillantes", "Brillantes"], ["mates", "Mates"]], "pochettes")}
      {chips("Numéros des pochettes", r.numeros, [[true, "Oui"], [false, "Non"]], "numeros")}
      {chips("Les pages tournent", r.vitesse, [["douce", "Doucement"], ["rapide", "Vite"]], "vitesse")}
      {chips("Bruit des pages", r.son, [[true, "Oui"], [false, "Non"]], "son")}
      <div className="chips">
        <button type="button" className="btn btn--soft" onClick={() => { click("back"); remettreClasseur(quel); }}>Remettre comme au départ</button>
      </div>
    </div>
  );
}
