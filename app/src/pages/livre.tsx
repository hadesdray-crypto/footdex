import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LuArrowLeft, LuArrowRight, LuMaximize2, LuMinimize2, LuSettings2, LuX } from "react-icons/lu";
import { RARITY, type CardRef } from "../cards";
import { setBook, useStore } from "../store";
import { Carte } from "../ui/cards";
import { click, crinkle, rustle, settle, slide } from "../sound";
import { vibrate } from "../fx";
import { cx } from "../util";
import { Couverture, ReglagesClasseur, livreDejaOuvert } from "./classeurs";
import { changerClasseur, useClasseur } from "../vue-classeur";

const POCKETS = 9;
const HOLD_MS = 380; // rester appuyé ce temps-là : la carte sort de sa pochette
const SLOP = 12; // le doigt bouge plus que ça avant : c'est un défilement, pas une prise
const EDGE_WAIT = 520; // la carte reste au bord : la page tourne
const EDGE_REPEAT = 950;
const PAGE_KEY = "footdex.livrepage";

type Book = Record<string, (string | null)[]>;
type Spot = { page: number; slot: number };
type Drag = { id: string; from: Spot; x: number; y: number; ox: number; oy: number; w: number };
type Settling = { key: string; kind: "in" | "back" };
type Flip = { dir: "next" | "prev"; from: number; to: number };

const pageKey = (i: number) => `p${i + 1}`;
const emptyPage = () => Array<string | null>(POCKETS).fill(null);
const spotKey = (s: Spot) => `${s.page}:${s.slot}`;

function readPage(): number {
  try {
    return Math.max(0, Number(sessionStorage.getItem(PAGE_KEY)) || 0);
  } catch {
    return 0;
  }
}
function writePage(n: number) {
  try {
    sessionStorage.setItem(PAGE_KEY, String(n));
  } catch {
    /* ignore */
  }
}

/** Toutes les cartes possédées sont dans le classeur : celles qui n'ont pas encore de pochette
 *  prennent les premières pochettes libres, dans l'ordre où elles ont été reçues. */
function arrange(book: Book, owned: Record<string, unknown>, order: (id: string) => number, known: (id: string) => boolean): Book | null {
  let changed = false;
  const next: Book = {};
  const placed = new Set<string>();
  for (const k of Object.keys(book)) {
    next[k] = (Array.isArray(book[k]) ? book[k] : emptyPage()).slice(0, POCKETS);
    while (next[k].length < POCKETS) next[k].push(null);
    next[k] = next[k].map((id) => {
      if (!id || !(id in owned) || placed.has(id)) {
        if (id) changed = true;
        return null;
      }
      placed.add(id);
      return id;
    });
  }
  const waiting = Object.keys(owned).filter((id) => !placed.has(id) && known(id)).sort((a, b) => order(a) - order(b));
  let p = 0;
  let s = 0;
  for (const id of waiting) {
    for (;;) {
      const k = pageKey(p);
      const page = (next[k] ??= emptyPage());
      if (s >= POCKETS) {
        p += 1;
        s = 0;
        continue;
      }
      if (page[s] == null) {
        page[s] = id;
        changed = true;
        s += 1;
        break;
      }
      s += 1;
    }
  }
  return changed ? next : null;
}

/** Le classeur comme un vrai : une couverture, des anneaux, des pochettes en plastique.
 *  Rester appuyé sur une carte la sort de sa pochette ; on la promène du doigt, la page tourne
 *  quand on arrive au bord, et en lâchant, elle se glisse dans la nouvelle pochette. */
export function Livre({ byId, onView }: { byId: Map<string, CardRef>; onView: (c: CardRef) => void }) {
  const s = useStore();
  const [open, setOpen] = useState(livreDejaOuvert);
  const [page, setPageRaw] = useState(readPage);
  const [flip, setFlip] = useState<Flip | null>(null);
  const flipRef = useRef<Flip | null>(null);
  const [palette, setPalette] = useState(false);
  const [arrive, setArrive] = useState(false);
  const couleurs = useClasseur("joueurs");
  const grand = couleurs.vue === "grand";
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState("");
  const [settling, setSettling] = useState<Settling[]>([]);
  const [two, setTwo] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const edgeTimer = useRef(0);
  const pageRef = useRef(page);
  const hoverRef = useRef("");
  const liftedRef = useRef(false);
  const book: Book = s.book;

  // Deux pages côte à côte quand il y a la place (tablette couchée), une grande page sinon.
  useLayoutEffect(() => {
    const el = wrap.current;
    const measure = () => {
      const w = el?.clientWidth ?? window.innerWidth;
      setTwo(w >= 720 && window.innerWidth > window.innerHeight);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" && el ? new ResizeObserver(measure) : null;
    if (ro && el) ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [open, grand]);

  // Ranger toute seule chaque carte qui n'a pas encore de pochette.
  useEffect(() => {
    const next = arrange(book, s.cards, (id) => s.cards[id]?.[2] ?? 0, (id) => byId.has(id));
    if (next) setBook(next);
  }, [book, s.cards, byId]);

  const used = Object.keys(book).filter((k) => book[k]?.some(Boolean)).map((k) => Number(k.slice(1)) - 1);
  const step = two ? 2 : 1;
  // Comme un vrai classeur : une page libre au bout, avec ses pochettes vides.
  let pages = Math.max(2, (used.length ? Math.max(...used) : 0) + 2);
  if (two && pages % 2) pages += 1;
  const first = Math.min(two ? page - (page % 2) : page, pages - step);
  const count = Object.keys(s.cards).filter((id) => byId.has(id)).length;
  const copies = Object.entries(s.cards).reduce((n, [id, o]) => n + (byId.has(id) ? o[0] : 0), 0);

  function setPage(n: number) {
    const v = Math.max(0, Math.min(pages - 1, n));
    pageRef.current = v;
    setPageRaw(v);
    writePage(v);
  }

  // Glisser le doigt sur la page (sans rester appuyé sur une carte) : la page tourne, comme un vrai classeur.
  function swipeStart(e: PointerEvent) {
    if (e.button !== undefined && e.button > 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    const t0 = performance.now();
    const pid = e.pointerId;
    liftedRef.current = false;
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (liftedRef.current || dragRef.current || ev.type === "pointercancel") return;
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && performance.now() - t0 < 900) {
        if (dx < 0) turnTo(first + step, "next");
        else turnTo(first - step, "prev");
      }
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  /** Tourner la page pour de vrai : la feuille se soulève, passe au-dessus des anneaux et retombe de l'autre côté. */
  function turnTo(n: number, dir: "next" | "prev") {
    if (n < 0 || n >= pages || flipRef.current) return;
    const cur = pageRef.current;
    const from = two ? cur - (cur % 2) : cur;
    const f: Flip = { dir, from, to: n };
    flipRef.current = f;
    setFlip(f);
    if (couleurs.son) rustle();
    window.setTimeout(() => {
      setPage(n);
      flipRef.current = null;
      setFlip(null);
    }, couleurs.flipMs);
  }

  const slots = (p: number): (string | null)[] => book[pageKey(p)] ?? emptyPage();

  function settle_(keys: Settling[]) {
    setSettling(keys);
    window.setTimeout(() => setSettling([]), 520);
  }

  function dropAt(d: Drag, target: string) {
    const m = /^slot:(\d+):(\d+)$/.exec(target);
    if (!m) {
      settle();
      settle_([{ key: spotKey(d.from), kind: "back" }]);
      return;
    }
    const to: Spot = { page: Number(m[1]), slot: Number(m[2]) };
    if (to.page === d.from.page && to.slot === d.from.slot) {
      settle();
      settle_([{ key: spotKey(to), kind: "back" }]);
      return;
    }
    const next: Book = JSON.parse(JSON.stringify(book));
    const get = (p: number) => (next[pageKey(p)] ??= emptyPage());
    const displaced = get(to.page)[to.slot];
    get(d.from.page)[d.from.slot] = displaced; // la carte qui était là prend la place libérée
    get(to.page)[to.slot] = d.id;
    setBook(next);
    slide();
    window.setTimeout(() => crinkle(0.35), 120);
    vibrate(10);
    const anim: Settling[] = [{ key: spotKey(to), kind: "in" }];
    if (displaced) anim.push({ key: spotKey(d.from), kind: "in" });
    settle_(anim);
  }

  function zoneAt(x: number, y: number): string {
    const t = document.elementFromPoint(x, y) as HTMLElement | null;
    const z = t?.closest<HTMLElement>("[data-drop]")?.dataset.drop;
    if (z) return z;
    // Au-delà du bord du classeur : la page tourne aussi.
    const r = wrap.current?.querySelector(".classeur")?.getBoundingClientRect();
    if (r && y > r.top && y < r.bottom) {
      if (x < r.left + 30) return "edge:prev";
      if (x > r.right - 30) return "edge:next";
    }
    return "";
  }

  function edgeTurn(zone: string) {
    window.clearTimeout(edgeTimer.current);
    if (zone !== "edge:next" && zone !== "edge:prev") return;
    const go = (wait: number) => {
      edgeTimer.current = window.setTimeout(() => {
        const cur = pageRef.current;
        const st = two ? 2 : 1;
        const base = two ? cur - (cur % 2) : cur;
        const n = zone === "edge:next" ? base + st : base - st;
        if (n < 0 || n > pages - 1) return;
        turnTo(n, zone === "edge:next" ? "next" : "prev");
        go(EDGE_REPEAT);
      }, wait);
    };
    go(EDGE_WAIT);
  }

  function press(e: PointerEvent, card: CardRef, from: Spot) {
    if (e.button !== undefined && e.button > 0) return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const pid = e.pointerId;
    let lifted = false;
    let gone = false;
    let lx = sx;
    let ly = sy;

    const lift = () => {
      if (gone) return;
      lifted = true;
      liftedRef.current = true;
      try {
        el.setPointerCapture(pid);
      } catch {
        /* marche quand même */
      }
      vibrate(18);
      crinkle(0.3);
      const d: Drag = { id: card.id, from, x: lx, y: ly, ox: sx - rect.left, oy: sy - rect.top, w: rect.width };
      dragRef.current = d;
      setDrag(d);
      hoverRef.current = `slot:${from.page}:${from.slot}`;
      setHover(hoverRef.current);
    };
    const holdTimer = window.setTimeout(lift, HOLD_MS);

    // Une fois la carte accrochée, le doigt ne fait plus défiler la page.
    const block = (ev: TouchEvent) => {
      if (lifted && ev.cancelable) ev.preventDefault();
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      lx = ev.clientX;
      ly = ev.clientY;
      if (!lifted) {
        if (Math.hypot(lx - sx, ly - sy) > SLOP) cleanup(); // c'était un défilement
        return;
      }
      const d = { ...(dragRef.current as Drag), x: lx, y: ly };
      dragRef.current = d;
      setDrag(d);
      const zone = zoneAt(lx, ly);
      if (zone !== hoverRef.current) {
        hoverRef.current = zone;
        edgeTurn(zone);
        setHover(zone);
      }
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      const wasLifted = lifted;
      const d = dragRef.current;
      cleanup();
      if (wasLifted && d) dropAt(d, zoneAt(ev.clientX, ev.clientY));
      else if (!wasLifted) {
        click("soft");
        onView(card); // un simple toucher : la carte en grand
      }
    };
    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      const d = dragRef.current;
      const wasLifted = lifted;
      cleanup();
      if (wasLifted && d) dropAt(d, "");
    };
    function cleanup() {
      gone = true;
      window.clearTimeout(holdTimer);
      window.clearTimeout(edgeTimer.current);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("touchmove", block);
      dragRef.current = null;
      hoverRef.current = "";
      setDrag(null);
      setHover("");
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("touchmove", block, { passive: false });
  }

  useEffect(() => () => window.clearTimeout(edgeTimer.current), []);

  // arrivé déjà ouvert (depuis l'étagère) : on descend jusqu'au classeur
  useEffect(() => {
    if (open) window.setTimeout(() => wrap.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openBook() {
    setOpen(true);
    setArrive(true);
    window.setTimeout(() => setArrive(false), 520);
    // le classeur ouvert remplit l'écran : on descend jusqu'à lui
    window.setTimeout(() => wrap.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 60);
  }


  if (!open) {
    return (
      <div className="livre livre--closed" ref={wrap}>
        <Couverture
          theme="joueurs"
          count={count}
          onOpen={openBook}
          apercu={slots(0)
            .map((id) => (id ? byId.get(id) : undefined))
            .map((card, k) => (card ? <span key={k} className="couv__mini"><Carte card={card} size="sm" tilt={false} label={card.name} /></span> : <span key={k} />))}
        />
        <p className="livre__help">Glisse la couverture sur le côté pour ouvrir ton classeur : toutes tes cartes sont rangées dedans.</p>
      </div>
    );
  }

  const settlingOf = (k: string) => settling.find((x) => x.key === k)?.kind;

  /** Une feuille du classeur. `live` : on peut toucher et déplacer ses cartes (pas pendant qu'elle tourne). */
  function feuille(p: number, side: "left" | "right" | "one", live: boolean) {
    if (p < 0 || p >= pages) return <div className={cx("feuille", side !== "one" && `feuille--${side}`, "feuille--vide")} />;
    return (
      <div className={cx("feuille", side !== "one" && `feuille--${side}`)}>
        <ul className="pockets">
          {slots(p).map((id, slot) => {
            const card = id ? byId.get(id) : undefined;
            const own = id ? s.cards[id] : undefined;
            const k = `${p}:${slot}`;
            const lifted = live && drag && drag.from.page === p && drag.from.slot === slot;
            const st = live ? settlingOf(k) : undefined;
            return (
              <li key={slot} className={cx("pocket", live && hover === `slot:${k}` && "pocket--hot", lifted && "pocket--empty")} data-drop={live ? `slot:${k}` : undefined}>
                <span className="pocket__num">{p * POCKETS + slot + 1}</span>
                {card && !lifted ? (
                  <div
                    className={cx("pocket__card", st === "in" && "is-in", st === "back" && "is-back")}
                    onPointerDown={live ? (e: PointerEvent) => press(e, card, { page: p, slot }) : undefined}
                    onContextMenu={(e: Event) => e.preventDefault()}
                  >
                    <Carte card={card} count={own?.[0]} shiny={(own?.[3] ?? 0) > 0} size="sm" tilt={false} label={`${card.name}, carte ${RARITY[card.rarity].label}`} />
                  </div>
                ) : null}
                <span className="pocket__glass" aria-hidden="true" />
              </li>
            );
          })}
        </ul>
        <span className="feuille__num" aria-hidden="true">{p + 1}</span>
      </div>
    );
  }
  const dragCard = drag ? byId.get(drag.id) : undefined;
  const label = two ? `Pages ${first + 1} et ${first + 2} sur ${pages}` : `Page ${first + 1} sur ${pages}`;

  const vueOuverte = (
    <div className={cx("livre", drag && "livre--drag", grand && "livre--grand")} ref={wrap} style={couleurs.style}>
      <div className="livre__bar">
        <button type="button" className="btn btn--soft" onClick={() => { click("back"); setOpen(false); }}><LuX aria-hidden="true" /> Fermer</button>
        <div className="livre__nav">
          <button type="button" className="btn btn--soft" onClick={() => turnTo(first - step, "prev")} disabled={first === 0} aria-label="Page précédente"><LuArrowLeft aria-hidden="true" /></button>
          <strong>{label}</strong>
          <button type="button" className="btn btn--soft" onClick={() => turnTo(first + step, "next")} disabled={first + step > pages - 1} aria-label="Page suivante"><LuArrowRight aria-hidden="true" /></button>
        </div>
        <button type="button" className={cx("btn btn--soft", palette && "btn--on")} onClick={() => { click("soft"); setPalette((v: boolean) => !v); }}><LuSettings2 aria-hidden="true" /> Réglages</button>
        <button type="button" className="btn btn--soft" onClick={() => { click("soft"); changerClasseur("joueurs", { vue: grand ? "page" : "grand" }); }}>
          {grand ? <LuMinimize2 aria-hidden="true" /> : <LuMaximize2 aria-hidden="true" />} {grand ? "Plus petit" : "En grand"}
        </button>
        <span className="livre__count">
          {count} carte{count > 1 ? "s" : ""} différente{count > 1 ? "s" : ""}
          {copies > count ? <small> · {copies} avec les doublons</small> : null}
        </span>
      </div>

      <div className="table" style={couleurs.style}>
      <div className={cx("classeur", two ? "classeur--two" : "classeur--one", flip && "is-flipping", arrive && "classeur--arrive", couleurs.classes)} onPointerDown={swipeStart}>
        {drag ? <span className={cx("classeur__edge classeur__edge--l", hover === "edge:prev" && "is-hot", first === 0 && "is-off")} data-drop="edge:prev"><LuArrowLeft aria-hidden="true" /></span> : null}
        {drag ? <span className={cx("classeur__edge classeur__edge--r", hover === "edge:next" && "is-hot", first + step > pages - 1 && "is-off")} data-drop="edge:next"><LuArrowRight aria-hidden="true" /></span> : null}
        {two ? (
          <>
            <div className="cellule">
              {feuille(flip ? (flip.dir === "next" ? flip.from : flip.to) : first, "left", !flip)}
              {flip && flip.dir === "prev" ? (
                <div className="leaf leaf--prev" aria-hidden="true">
                  <div className="leaf__face">{feuille(flip.from, "left", false)}</div>
                  <div className="leaf__face leaf__face--back">{feuille(flip.to + 1, "right", false)}</div>
                </div>
              ) : null}
            </div>
            <div className="cellule">
              {feuille(flip ? (flip.dir === "next" ? flip.to + 1 : flip.from + 1) : first + 1, "right", !flip)}
              {flip && flip.dir === "next" ? (
                <div className="leaf leaf--next" aria-hidden="true">
                  <div className="leaf__face">{feuille(flip.from + 1, "right", false)}</div>
                  <div className="leaf__face leaf__face--back">{feuille(flip.to, "left", false)}</div>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="cellule">
            {feuille(flip ? (flip.dir === "next" ? flip.to : flip.from) : first, "one", !flip)}
            {flip ? (
              <div className={cx("leaf", flip.dir === "next" ? "leaf--next" : "leaf--back-in")} aria-hidden="true">
                <div className="leaf__face">{feuille(flip.dir === "next" ? flip.from : flip.to, "one", false)}</div>
                <div className="leaf__face leaf__face--back"><div className="feuille feuille--dos" /></div>
              </div>
            ) : null}
          </div>
        )}
        <span className="classeur__rings" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
      </div>

      {palette ? <ReglagesClasseur quel="joueurs" /> : null}
      <p className="livre__help">
        {drag
          ? "Amène la carte sur une pochette et lâche-la. Au bord du classeur, la page tourne."
          : "Touche une carte pour la voir en grand. Reste appuyé dessus pour la sortir et la ranger ailleurs."}
      </p>

      {drag && dragCard ? createPortal(
        <div className="ghost" style={{ left: `${drag.x - drag.ox}px`, top: `${drag.y - drag.oy}px`, width: `${drag.w}px` }}>
          <div className="ghost__in">
            <Carte card={dragCard} shiny={(s.cards[drag.id]?.[3] ?? 0) > 0} size="sm" tilt={false} label="Carte en train d'être déplacée" />
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
  // En grand, le classeur passe au-dessus de tout (même de la barre du haut).
  return grand ? createPortal(vueOuverte, document.body) : vueOuverte;
}
