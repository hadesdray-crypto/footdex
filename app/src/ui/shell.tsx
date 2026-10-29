import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { LuHouse, LuLibrary, LuMenu, LuPackageOpen, LuSearch, LuStar, LuUsers, LuVolume2, LuVolumeX, LuSettings } from "react-icons/lu";
import { openBinderTab } from "../pages/binder";
import { go, type Route } from "../router";
import { click, onSoundChange, setSound, soundOn, unlockAudio } from "../sound";
import { packStatus, useStore } from "../store";
import { cx, fmt } from "../util";
import type { Album } from "../data";
import { Mascot } from "../mascot/Mascot";
import { MiseAJour } from "../maj/MiseAJour";
import { TempsEcran } from "../maj/TempsEcran";
import { Link } from "./bits";
import { Signal } from "./signal";

const TABS: { to: Route; label: string; icon: typeof LuHouse; match: string[] }[] = [
  { to: { page: "accueil" }, label: "Accueil", icon: LuHouse, match: ["accueil"] },
  { to: { page: "joueurs" }, label: "Joueurs", icon: LuUsers, match: ["joueurs", "fiche", "jeu"] },
  { to: { page: "paquets" }, label: "Paquets", icon: LuPackageOpen, match: ["paquets"] },
  { to: { page: "collection" }, label: "Collection", icon: LuLibrary, match: ["collection", "classeur"] },
  {
    to: { page: "plus" },
    label: "Plus",
    icon: LuMenu,
    match: ["plus", "matchs", "match", "scores", "coupes", "coupe", "clubs", "club", "saison", "lexique", "defi", "grand-defi", "histoires", "videos", "sources", "carte", "coffre", "jeux", "parents", "reglages"],
  },
];

export function Shell({ page, pageKey, album, children }: { page: string; pageKey: string; album: Album; children: ReactNode }) {
  const state = useStore();
  const status = packStatus(state);
  const ready = (status.free ? 1 : 0) + (status.bonus ? 1 : 0) + status.gifts;
  const sound = useSyncExternalStore(onSoundChange, soundOn);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    // A click for every button, different for the menu, the filters, the back buttons and the rest.
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest("a, button, select, label.toggle");
      if (!el || el.closest(".carte--tap, .reveal__stage, .reveal__pack, .topbar__sound, .mascot, .mm, .wd")) return;
      if (el.closest(".tabbar")) click("menu");
      else if (el.matches(".backlink, .viewer__close") || el.getAttribute("aria-label") === "Fermer") click("back");
      else if (el.matches(".chip, .segmented__tab, .clubbadge, select, label.toggle")) click("soft");
      else click("button");
    };
    // Phones only play sound after a real touch: the first one wakes it up.
    const unlock = () => unlockAudio();
    document.addEventListener("pointerdown", onPointer);
    for (const type of ["touchend", "click", "keydown"]) document.addEventListener(type, unlock, { capture: true, passive: true });
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      for (const type of ["touchend", "click", "keydown"]) document.removeEventListener(type, unlock, { capture: true });
    };
  }, []);
  function switchSound() {
    const next = !sound;
    setSound(next);
    setToast(next ? "Son activé. Tu n'entends rien ? Monte le volume et enlève le mode silencieux du téléphone." : "Son coupé.");
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), next ? 4200 : 1800);
  }
  return (
    <div className="app">
      <div className="aurora" aria-hidden="true">
        <span className="aurora__a" />
        <span className="aurora__b" />
        <span className="aurora__c" />
      </div>
      <header className="topbar">
        <div className="topbar__inner">
          <Link to={{ page: "accueil" }} className="brand" label="Footdex, retour à l'accueil">
            <span className="brand__word">FOOTDEX</span>
            <span className="brand__sub">
              <span className="brand__alm">L'almanach du football · </span>
              <span className="brand__for">pour Raphaël</span>
            </span>
          </Link>
          <div className="topbar__tools">
            <button
              type="button"
              className="starpill"
              onClick={() => {
                openBinderTab("boutique");
                go({ page: "classeur" });
              }}
              aria-label={`${fmt(state.stars)} étoiles, ouvrir la boutique`}
            >
              <LuStar aria-hidden="true" />
              <span>{fmt(state.stars)}</span>
            </button>
            <Signal />
            <button
              type="button"
              className="iconbtn topbar__sound"
              onClick={switchSound}
              aria-pressed={sound}
              aria-label={sound ? "Son activé : appuie pour couper les bruitages" : "Son coupé : appuie pour remettre les bruitages"}
              title={sound ? "Couper le son" : "Remettre le son"}
            >
              {sound ? <LuVolume2 aria-hidden="true" /> : <LuVolumeX aria-hidden="true" />}
            </button>
            <button type="button" className="iconbtn topbar__gear" onClick={() => go({ page: "reglages" })} aria-label="Paramètres de l'appli"><LuSettings aria-hidden="true" /></button>
            <button type="button" className="iconbtn topbar__search" onClick={() => go({ page: "joueurs" })} aria-label="Chercher un joueur">
              <LuSearch aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      <p className={toast ? "toast toast--on" : "toast"} role="status" aria-live="polite">
        {toast ?? ""}
      </p>
      <main className="page" id="contenu" key={pageKey}>
        {children}
      </main>
      <Mascot album={album} page={page} />
      <MiseAJour />
      <TempsEcran />
      <nav className="tabbar" aria-label="Rubriques">
        <ul>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const on = tab.match.includes(page);
            const isPack = tab.label === "Paquets";
            return (
              <li key={tab.label} className={cx(isPack && "tabbar__pack")}>
                <Link to={tab.to} className={cx("tab", on && "tab--on", isPack && "tab--pack", isPack && ready > 0 && "tab--ready")} label={isPack && ready ? `${tab.label}, ${ready} à ouvrir` : undefined}>
                  <span className="tab__icon">
                    <Icon aria-hidden="true" />
                    {isPack && ready ? <span className="tab__badge">{ready}</span> : null}
                  </span>
                  <span className="tab__label">{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
