import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LuArrowRight, LuHeart, LuX } from "react-icons/lu";
import { GROUPS, RARITY, type CardRef, type Visual } from "../cards";
import { faceUrl, knownFace } from "../data";
import { reducedMotion } from "../fx";
import { go, type Route } from "../router";
import { getState, toggleFav, useStore } from "../store";
import { cx, initials, isoFromDays, longDate } from "../util";
import { Link } from "./bits";

export function useFace(id: number | null, chunk: number): string | null {
  const [url, setUrl] = useState<string | null>(() => (id != null ? knownFace(id) ?? null : null));
  useEffect(() => {
    if (id == null || chunk < 0) {
      setUrl(null);
      return;
    }
    const known = knownFace(id);
    if (known) {
      setUrl(known);
      return;
    }
    let alive = true;
    setUrl(null);
    faceUrl(id, chunk)
      .then((u) => {
        if (alive) setUrl(u);
      })
      .catch(() => {
        if (alive) setUrl(null);
      });
    return () => {
      alive = false;
    };
  }, [id, chunk]);
  return url;
}

export function Art({ visual, name, number, kit, ink, big, play }: { visual: Visual; name: string; number?: number | null; kit?: string; ink?: string; big?: boolean; play?: boolean }) {
  const faceId = visual.type === "face" ? visual.id : null;
  const faceChunk = visual.type === "face" ? visual.chunk : -1;
  const face = useFace(faceId, faceChunk);
  if (visual.type === "portrait") {
    return <img className="art__img" src={visual.src} alt={`Portrait de ${name}`} loading={big ? "eager" : "lazy"} decoding="async" draggable={false} />;
  }
  if (visual.type === "match") {
    if (play && visual.video && !reducedMotion()) {
      return <video className="art__img art__img--scene" src={visual.video} poster={visual.src ?? undefined} autoPlay muted loop playsInline aria-hidden="true" />;
    }
    if (visual.src) return <img className="art__img art__img--scene" src={visual.src} alt="" loading={big ? "eager" : "lazy"} decoding="async" draggable={false} />;
    const [a, b] = visual.score.split(/[–-]/).map((x) => x.trim());
    return (
      <span className="art__scene" aria-hidden="true">
        <span className="art__scene-pitch" />
        <span className="art__board">
          <span>{visual.home}</span>
          <strong>{a}</strong>
          <span>{visual.away}</span>
          <strong>{b}</strong>
        </span>
      </span>
    );
  }
  if (visual.type === "face" && face) {
    return <img className="art__img art__img--face" src={face} alt={`Visuel du jeu de ${name}`} loading="lazy" decoding="async" draggable={false} />;
  }
  if (number != null) {
    return (
      <span className="art__number" style={kit ? { "--kit": kit, "--kit-ink": ink } : undefined} aria-hidden="true">
        {number}
      </span>
    );
  }
  return (
    <span className="art__initials" aria-hidden="true">
      {visual.type === "face" ? "" : initials(name)}
    </span>
  );
}

/** Follows the finger or the mouse: the card leans, and its light and foil move with it. */
function useTilt<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || reducedMotion()) return;
    let frame = 0;
    const set = (px: number, py: number, active: boolean) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--px", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--py", `${(py * 100).toFixed(1)}%`);
        el.style.setProperty("--rx", `${((0.5 - py) * 20).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${((px - 0.5) * 24).toFixed(2)}deg`);
        el.style.setProperty("--glare", active ? "1" : "0");
        el.classList.toggle("is-tilting", active);
      });
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)), true);
    };
    const leave = () => set(0.5, 0.5, false);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointercancel", leave);
    el.addEventListener("pointerup", leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointercancel", leave);
      el.removeEventListener("pointerup", leave);
    };
  }, [enabled]);
  return ref;
}

export type CarteProps = {
  card: CardRef;
  shiny?: boolean;
  count?: number;
  fresh?: boolean;
  stars?: number;
  flipped?: boolean;
  back?: string;
  size?: "xl" | "md" | "sm";
  tilt?: boolean;
  play?: boolean;
  onClick?: () => void;
  label?: string;
  children?: ReactNode;
};

/** The collectible card, front and back, in its rarity's material. */
export function Carte({ card, shiny, count, fresh, stars, flipped = true, back, size = "md", tilt = true, play, onClick, label, children }: CarteProps) {
  const ref = useTilt<HTMLDivElement>(tilt && flipped);
  const r = RARITY[card.rarity];
  const big = size === "xl";
  const dos = back ?? getState().back;
  const moment = card.kind === "moment";
  return (
    <div
      ref={ref}
      className={cx("carte", `carte--${card.rarity}`, `carte--${size}`, shiny && "carte--shiny", !flipped && "carte--back", onClick && "carte--tap", moment && "carte--scene")}
      style={{ "--rc": r.color }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick()) : undefined}
      aria-label={label ?? (flipped ? `Carte ${r.label}${shiny ? " brillante" : ""} : ${card.name}` : "Carte face cachée")}
    >
      <div className="carte__tilt">
        <div className="carte__flip">
          <div className="carte__face carte__face--front" aria-hidden={!flipped}>
            <div className="carte__frame">
              <div className="carte__inner">
                <div className={cx("carte__art", card.visual.type === "face" && "carte__art--face")}>
                  <Art visual={card.visual} name={card.name} number={card.number} kit={card.kit} ink={card.ink} big={big} play={play} />
                </div>
                <span className="carte__shade" aria-hidden="true" />
                <div className="carte__top">
                  {card.rating != null ? (
                    <span className="carte__rating" title="Note du jeu vidéo EA Sports FC">
                      <strong>{card.rating}</strong>
                      <span>{card.pos}</span>
                      <small className="carte__source">note du jeu</small>
                    </span>
                  ) : (
                    <span className="carte__rating carte__rating--year">
                      <strong>{card.pos}</strong>
                    </span>
                  )}
                  <span className="carte__badge">{shiny ? "Brillante" : r.label}</span>
                </div>
                <div className="carte__info">
                  <p className="carte__meta">
                    <span>{moment ? card.sub : card.nation}</span>
                    {card.number != null ? <span>n° {card.number}</span> : null}
                  </p>
                  <p className="carte__name">{card.short}</p>
                  <p className="carte__club">{moment ? card.line : card.club}</p>
                  <p className="carte__serial">{card.serial}</p>
                </div>
                <span className="carte__holo" aria-hidden="true" />
                <span className="carte__glare" aria-hidden="true" />
              </div>
            </div>
            {fresh ? <span className="carte__flag carte__flag--new">Nouvelle</span> : null}
            {!fresh && stars ? <span className="carte__flag carte__flag--stars">+{stars} ★</span> : null}
            {!fresh && !stars && count && count > 1 ? <span className="carte__flag carte__flag--count">×{count}</span> : null}
            {children}
          </div>
          <div className={cx("carte__face carte__face--back back", `back--${dos}`)} aria-hidden={flipped}>
            <span className="carte__monogram" aria-hidden="true">
              F
            </span>
            <span className="carte__backword" aria-hidden="true">
              FOOTDEX
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small card for long lists. */
export function Tile({ to, card, owned, shiny, starred }: { to: Route; card: CardRef; owned?: number; shiny?: boolean; starred?: boolean }) {
  return (
    <Link to={to} className={cx("tile", `tile--${card.rarity}`, shiny && "tile--shiny")}>
      <span className="tile__art">
        <Art visual={card.thumb ? { type: "portrait", src: card.thumb } : card.visual} name={card.name} number={card.number} kit={card.kit} ink={card.ink} />
        {card.rating != null ? (
          <span className="tile__rating">
            {card.rating}
            <small>{card.pos}</small>
          </span>
        ) : null}
        <span className="tile__rarity">{RARITY[card.rarity].label}</span>
      </span>
      <span className="tile__body">
        <span className="tile__name">{card.name}</span>
        <span className="tile__sub">{card.sub}</span>
        <span className="tile__meta">
          {owned ? <span className="tile__owned">{owned > 1 ? `×${owned} dans ton classeur` : "Dans ton classeur"}</span> : <span className="tile__missing">Pas encore</span>}
          {starred ? (
            <span className="tile__fav" aria-label="Dans tes favoris">
              <LuHeart aria-hidden="true" />
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

export function cardRoute(card: CardRef): Route {
  if (card.kind === "album") return { page: "fiche", id: card.target };
  if (card.kind === "moment") return { page: "match", id: card.target };
  return { page: "jeu", id: Number(card.target) };
}

/** Locks the page scroll while an overlay is open, and closes it with Escape. */
export function useOverlay(onClose: () => void) {
  const latest = useRef(onClose);
  latest.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") latest.current();
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("noscroll");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("noscroll");
    };
  }, []);
}

/** A card taken out of the binder and held up to the light. */
export function CardViewer({ card, onClose }: { card: CardRef; onClose: () => void }) {
  const state = useStore();
  useOverlay(onClose);
  const own = state.cards[card.id];
  const starred = state.fav.includes(card.id);
  const r = RARITY[card.rarity];
  const shiny = !!own && own[3] > 0;
  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label={`Carte de ${card.name}`} style={{ "--rc": r.color }}>
      <button type="button" className="viewer__backdrop" aria-label="Fermer" onClick={onClose} />
      <div className="viewer__inner">
        <button type="button" className="iconbtn viewer__close" onClick={onClose} aria-label="Fermer">
          <LuX aria-hidden="true" />
        </button>
        <div className="viewer__card">
          <Carte card={card} size="xl" shiny={shiny} play />
        </div>
        <div className="viewer__text">
          <p className="viewer__rarity">
            Carte {r.label}
            {shiny ? " · Brillante" : ""} · {GROUPS[card.group].name}
          </p>
          <h2 className="viewer__name">{card.name}</h2>
          <p className="viewer__sub">{card.sub}</p>
          {card.rating != null ? <p className="viewer__own">{card.rating} : note du jeu vidéo EA Sports FC, pas une statistique de match.</p> : null}
          {own ? (
            <p className="viewer__own">
              Reçue le {longDate(isoFromDays(own[1]))} · {own[0] > 1 ? `${own[0]} exemplaires` : "1 exemplaire"}
              {own[3] > 0 ? ` · ${own[3]} brillante${own[3] > 1 ? "s" : ""}` : ""}
            </p>
          ) : (
            <p className="viewer__own">Pas encore dans ton classeur.</p>
          )}
          <div className="viewer__actions">
            <button
              type="button"
              className="btn btn--gold"
              onClick={() => {
                onClose();
                go(cardRoute(card));
              }}
            >
              Ouvrir la fiche <LuArrowRight aria-hidden="true" />
            </button>
            <button type="button" className={cx("btn", starred ? "btn--soft btn--on" : "btn--soft")} onClick={() => toggleFav(card.id)} aria-pressed={starred}>
              <LuHeart aria-hidden="true" /> {starred ? "Dans tes favoris" : "Mettre en favori"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
