import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuFastForward, LuGift, LuStar, LuX } from "react-icons/lu";
import { CARDS_PER_CHEMIN, CHEMINS, RARITY, cheminOf, isBig, type CardRef, type Pulled } from "../cards";
import { RARITY_COLORS, burst, rain, reducedMotion, sparkle, vibrate } from "../fx";
import { go } from "../router";
import { onCard, setBusy } from "../mascot/state";
import { coins, crowd, fanfare, flip, riser, tear, thump } from "../sound";
import { type PackKind, type PackResult, useStore } from "../store";
import { cx, fmt } from "../util";
import { Carte, cardRoute, useOverlay } from "./cards";
import { PathBar, RewardIcon, rewardText } from "./chemin";
import { PackArt } from "./pack";

export type Opening = {
  id: number;
  kind: PackKind;
  title: string;
  /** In the order they come out: the best card last. */
  pulled: Pulled[];
  result: PackResult;
  /** Path index when the pack was opened: it gives the wrapper its colours. */
  chemin: number;
};

type Phase = "pack" | "open" | "cards" | "recap";

function glowOf(p: Pulled): string {
  if (p.shiny) return "#ff7ae0";
  return RARITY[p.card.rarity].rank >= 1 ? RARITY[p.card.rarity].color : "#dfe7ff";
}

/** The whole opening: the pack, the tear, the cards one by one, the big entrance for great cards, then the summary. */
export function Reveal({ opening, onClose, onGift }: { opening: Opening; onClose: () => void; onGift?: () => void }) {
  const { pulled, result, kind } = opening;
  const [phase, setPhase] = useState<Phase>(kind === "boutique" ? "cards" : "pack");
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [walk, setWalk] = useState(0);
  const [glory, setGlory] = useState(false);
  const timers = useRef<number[]>([]);
  const cardBox = useRef<HTMLDivElement | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const reduced = reducedMotion();
  const best = pulled[pulled.length - 1];
  const current = pulled[Math.min(index, pulled.length - 1)];
  useOverlay(onClose);

  const clear = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => {
    root.current?.focus();
    setBusy(true);
    return () => {
      clear();
      setBusy(false);
    };
  }, []);

  function center(): [number, number] {
    const r = cardBox.current?.getBoundingClientRect();
    return r ? [r.left + r.width / 2, r.top + r.height / 2] : [window.innerWidth / 2, window.innerHeight / 2];
  }

  function celebrate(p: Pulled) {
    const [x, y] = center();
    const colors = RARITY_COLORS[p.shiny ? "shiny" : p.card.rarity];
    burst(x, y, colors, 170, 1.15);
    later(260, () => burst(x, y - 40, colors, 90, 0.8));
    fanfare(p.shiny ? "shiny" : p.card.rarity);
    crowd(p.shiny ? 1.5 : 1);
    vibrate([25, 50, 90]);
  }

  function turn(big: boolean) {
    clear();
    setWalk(0);
    setShown(true);
    flip(current.card.rarity);
    onCard({ name: current.card.name, rarity: current.card.rarity, shiny: current.shiny });
    if (big) {
      setGlory(true);
      requestAnimationFrame(() => celebrate(current));
    } else if (RARITY[current.card.rarity].rank >= 1) {
      later(260, () => cardBox.current && sparkle(cardBox.current, RARITY[current.card.rarity].color, 24));
    }
  }

  function reveal() {
    if (isBig(current) && !reduced) {
      setWalk(1);
      later(500, () => {
        setWalk(2);
        thump();
        vibrate(12);
      });
      later(1200, () => {
        setWalk(3);
        thump();
        vibrate(12);
      });
      later(1900, () => {
        setWalk(4);
        thump();
        vibrate(12);
        riser(1.1);
      });
      later(3050, () => turn(true));
    } else turn(isBig(current));
  }

  function advance() {
    setGlory(false);
    if (index + 1 >= pulled.length) {
      setPhase("recap");
      return;
    }
    setShown(false);
    setIndex(index + 1);
  }

  function onStage() {
    if (phase !== "cards") return;
    if (walk > 0) turn(true);
    else if (!shown) reveal();
    else advance();
  }

  function openPack() {
    if (phase !== "pack") return;
    setPhase("open");
    tear();
    vibrate(15);
    later(reduced ? 60 : 1150, () => setPhase("cards"));
  }

  function showAll() {
    const rest = pulled.slice(shown ? index + 1 : index);
    clear();
    setWalk(0);
    setGlory(false);
    setPhase("recap");
    const big = rest.filter(isBig).pop();
    if (big) {
      fanfare(big.shiny ? "shiny" : big.card.rarity);
      crowd(big.shiny ? 1.5 : 1);
      requestAnimationFrame(() => burst(window.innerWidth / 2, window.innerHeight * 0.35, RARITY_COLORS[big.shiny ? "shiny" : big.card.rarity], 150, 1));
    }
  }

  const r = RARITY[current.card.rarity];
  const fresh = result.fresh.has(current.card.id);
  const big = isBig(current);
  const hintColor = !shown && RARITY[current.card.rarity].rank >= 1 ? glowOf(current) : undefined;

  return createPortal(
    <div
      ref={root}
      tabIndex={-1}
      className={cx("reveal", `reveal--${phase}`, walk > 0 && "reveal--walk", walk > 0 && `reveal--walk-${walk}`, glory && "reveal--glory", glory && current.shiny && "reveal--shiny")}
      role="dialog"
      aria-modal="true"
      aria-label={`Ouverture : ${opening.title}`}
      style={{ "--rc": current.shiny ? "#ff7ae0" : r.color, "--best": glowOf(best) }}
    >
      <div className="reveal__sky" aria-hidden="true">
        <span className="reveal__beam reveal__beam--l" />
        <span className="reveal__beam reveal__beam--r" />
        <span className="reveal__burst" />
      </div>

      <header className="reveal__bar">
        <p className="reveal__title">{opening.title}</p>
        <div className="reveal__tools">
          {phase === "cards" && pulled.length > 1 ? (
            <button type="button" className="btn btn--glass btn--small" onClick={showAll}>
              <LuFastForward aria-hidden="true" /> Tout montrer
            </button>
          ) : null}
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Fermer">
            <LuX aria-hidden="true" />
          </button>
        </div>
      </header>

      {phase === "pack" || phase === "open" ? (
        <div className="reveal__stage reveal__stage--pack">
          <TearPack kind={kind} chemin={opening.chemin} glow={glowOf(best)} hot={isBig(best)} torn={phase === "open"} onOpen={openPack} />
          <p className="reveal__hint" aria-live="polite">
            {phase === "pack" ? "Glisse ton doigt sur le paquet pour le déchirer, ou touche-le." : "Le paquet s'ouvre…"}
          </p>
        </div>
      ) : null}

      {phase === "cards" ? (
        <div className="reveal__stage" onClick={onStage}>
          <div className="reveal__deck">
            {Array.from({ length: Math.min(3, pulled.length - index - 1) }, (_, k) => (
              <span key={k} className="reveal__under" style={{ "--k": k + 1 }} aria-hidden="true" />
            ))}
            <div ref={cardBox} key={index} className={cx("reveal__card", !shown && hintColor && "reveal__card--hint")} style={hintColor ? { "--hint": hintColor } : undefined}>
              <Carte card={current.card} shiny={current.shiny} flipped={shown} fresh={shown && fresh} size="xl" tilt={shown} play={shown} />
            </div>
          </div>

          <div className="reveal__caption" aria-live="polite">
            {walk > 0 ? (
              <Walkout card={current.card} step={walk - 1} />
            ) : shown ? (
              <>
                <p className="reveal__rarity">
                  {current.shiny ? "Brillante · " : ""}
                  {r.label}
                </p>
                <h2 className="reveal__name">{current.card.name}</h2>
                <p className="reveal__sub">{current.card.sub}</p>
                <p className={cx("reveal__flag", fresh ? "reveal__flag--new" : "reveal__flag--dup")}>
                  {fresh ? "Nouvelle carte dans ton classeur" : `Doublon : +${result.starsByCard[current.card.id] ?? 0} étoiles`}
                </p>
              </>
            ) : (
              <p className="reveal__hint">{big && reduced ? "Une grande carte !" : "Touche la carte pour la retourner."}</p>
            )}
            <button type="button" className={cx("btn", shown ? "btn--gold" : "btn--glass")}>
              {walk > 0 ? "Retourner tout de suite" : !shown ? "Retourner la carte" : index + 1 >= pulled.length ? "Voir le résumé" : "Carte suivante"}
            </button>
          </div>

          <ol className="reveal__pips" aria-hidden="true">
            {pulled.map((p, i) => (
              <li
                key={p.card.id}
                className={cx("pip", (i < index || (i === index && shown)) && "pip--done", i === index && "pip--now")}
                style={{ "--pip": i < index || (i === index && shown) ? glowOf(p) : undefined }}
              />
            ))}
          </ol>
        </div>
      ) : null}

      {phase === "recap" ? <Recap opening={opening} onClose={onClose} onGift={onGift} /> : null}
    </div>,
    document.body,
  );
}

function TearPack({ kind, chemin, glow, hot, torn, onOpen }: { kind: PackKind; chemin: number; glow: string; hot: boolean; torn: boolean; onOpen: () => void }) {
  const [progress, setProgress] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const button = useRef<HTMLButtonElement | null>(null);
  return (
    <button
      ref={button}
      type="button"
      className={cx("reveal__pack", hot && "reveal__pack--hot")}
      aria-label="Ouvrir le paquet"
      disabled={torn}
      onPointerDown={(e: PointerEvent) => {
        start.current = { x: e.clientX, y: e.clientY };
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* not supported */
        }
      }}
      onPointerMove={(e: PointerEvent) => {
        if (!start.current) return;
        const width = button.current?.offsetWidth ?? 240;
        const p = Math.min(1, Math.abs(e.clientX - start.current.x) / (width * 0.7));
        setProgress(p);
        if (p >= 1) {
          start.current = null;
          onOpen();
        }
      }}
      onPointerUp={(e: PointerEvent) => {
        const s = start.current;
        start.current = null;
        if (!s) return;
        const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y);
        if (moved < 12 || progress > 0.4) onOpen();
        else setProgress(0);
      }}
      onPointerCancel={() => {
        start.current = null;
        setProgress(0);
      }}
      onClick={(e: MouseEvent) => {
        if (e.detail === 0) onOpen();
      }}
    >
      <PackArt kind={kind} chemin={chemin} glow={glow} tear={torn ? 1 : progress} torn={torn} />
      <span className="reveal__swipe" aria-hidden="true" />
    </button>
  );
}

function Walkout({ card, step }: { card: CardRef; step: number }) {
  const labels = card.kind === "moment" ? ["Compétition", "Date", "Stade"] : ["Pays", "Poste", "Club"];
  return (
    <ol className="walkout">
      {card.clues.map((clue, i) =>
        i < step ? (
          <li key={i} className="walkout__clue">
            <span>{labels[i]}</span>
            <strong>{clue}</strong>
          </li>
        ) : null,
      )}
    </ol>
  );
}

function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(reducedMotion() ? to : 0);
  useEffect(() => {
    if (reducedMotion()) return;
    let frame = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to]);
  return <>{fmt(n)}</>;
}

function Recap({ opening, onClose, onGift }: { opening: Opening; onClose: () => void; onGift?: () => void }) {
  const state = useStore();
  const { pulled, result, kind } = opening;
  const isPack = kind !== "boutique";
  const newChemin = result.cheminAfter > result.cheminBefore;
  const before = cheminOf(result.before);
  const after = cheminOf(result.after);
  const rewards = result.granted.flatMap((g) => g.rewards.map((r) => ({ r, at: g.at - g.chemin * CARDS_PER_CHEMIN, chemin: g.chemin })));
  const nextAt = Math.ceil((after.step + 1) / 20) * 20;

  useEffect(() => {
    const timers: number[] = [];
    if (result.stars > 0) timers.push(window.setTimeout(() => coins(Math.min(6, Math.ceil(result.stars / 5))), 500));
    if (rewards.length > 0) timers.push(window.setTimeout(() => fanfare("eclat"), 1100));
    if (newChemin) {
      const tone = CHEMINS[after.index].tone;
      timers.push(
        window.setTimeout(() => {
          fanfare("legende");
          crowd(1.3);
          rain([tone[0], "#ffd76a", "#ffffff", tone[0]], 180);
          vibrate([30, 60, 30, 60, 120]);
        }, 1500),
      );
    }
    return () => timers.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const freshCount = pulled.filter((p) => result.fresh.has(p.card.id)).length;
  return (
    <div className="recap">
      <p className="eyebrow">{opening.title}</p>
      <h2 className="recap__title">
        {pulled.length === 1 ? (freshCount ? "Nouvelle carte !" : "Un doublon") : freshCount === 0 ? "Que des doublons" : freshCount === 1 ? "1 nouvelle carte" : `${freshCount} nouvelles cartes`}
      </h2>
      <div className={cx("recap__cards", pulled.length === 1 && "recap__cards--one")}>
        {pulled.map((p, i) => (
          <div key={p.card.id} className="recap__slot" style={{ "--i": i }}>
            <Carte
              card={p.card}
              shiny={p.shiny}
              fresh={result.fresh.has(p.card.id)}
              stars={result.starsByCard[p.card.id]}
              size={pulled.length === 1 ? "md" : "sm"}
              tilt={false}
              onClick={() => {
                onClose();
                go(cardRoute(p.card));
              }}
              label={`${p.card.name}, ouvrir la fiche`}
            />
          </div>
        ))}
      </div>

      {result.stars > 0 ? (
        <p className="recap__stars">
          <LuStar aria-hidden="true" /> +<CountUp to={result.stars} /> étoiles avec les doublons
        </p>
      ) : null}
      {kind === "boutique" ? <p className="recap__note">Il te reste {fmt(state.stars)} étoiles.</p> : null}

      {isPack ? (
        <section className="recap__path" aria-label="Ton chemin">
          <p className="recap__chemin">
            Chemin {after.index + 1} · {CHEMINS[after.index].name}
            {after.index === CHEMINS.length - 1 ? ` · niveau ${after.level}` : ""}
          </p>
          <PathBar from={newChemin ? 0 : before.step} to={after.step} chemin={after.index} />
          <p className="recap__steps">
            {fmt(after.step)} / {CARDS_PER_CHEMIN} cartes sur ce chemin · prochaine récompense dans {nextAt - after.step} carte{nextAt - after.step > 1 ? "s" : ""}
          </p>
        </section>
      ) : null}

      {rewards.length > 0 ? (
        <ul className="recap__rewards" aria-label="Récompenses gagnées">
          {rewards.map(({ r, at, chemin }, i) => (
            <li key={i} style={{ "--i": i }}>
              <RewardIcon reward={r} />
              <span>
                <strong>{rewardText(r)}</strong>
                <small>
                  {at} cartes sur le chemin {chemin + 1}
                </small>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {newChemin ? (
        <div className="recap__newpath" style={{ "--p1": CHEMINS[after.index].tone[0], "--p2": CHEMINS[after.index].tone[1] }}>
          <p className="eyebrow">Nouveau chemin débloqué</p>
          <h3>
            Chemin {after.index + 1} : {CHEMINS[after.index].name}
          </h3>
          <p>{CHEMINS[after.index].text}</p>
        </div>
      ) : null}

      <div className="recap__actions">
        {state.gifts.length > 0 && onGift ? (
          <button type="button" className="btn btn--gold btn--big" onClick={onGift}>
            <LuGift aria-hidden="true" /> Ouvrir mon cadeau{state.gifts.length > 1 ? ` (${state.gifts.length})` : ""}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn--soft"
          onClick={() => {
            onClose();
            go({ page: "classeur" });
          }}
        >
          Voir mon classeur
        </button>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}
