import { useEffect, useRef, useState } from "react";
import { LuArrowLeft, LuArrowRight, LuBookOpen, LuX } from "react-icons/lu";
import { RARITY, type CardRef } from "../cards";
import { setBook, useStore } from "../store";
import { Carte } from "../ui/cards";
import { click } from "../sound";
import { cx } from "../util";

const POCKETS = 9;
type Book = Record<string, (string | null)[]>;
type Drag = { id: string; from: { page: string; slot: number } | "tray"; x: number; y: number };

const pageKey = (i: number) => `p${i + 1}`;
const emptyPage = () => Array<string | null>(POCKETS).fill(null);

/** The binder as a real book: a cover, plastic pockets, pages you turn, cards you drag from one pocket to another. */
export function Livre({ byId }: { byId: Map<string, CardRef> }) {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [turn, setTurn] = useState<"" | "next" | "prev">("");
  const [drag, setDrag] = useState<Drag | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<string>("");
  const dragRef = useRef<Drag | null>(null);
  const edgeTimer = useRef(0);
  const book: Book = s.book;
  const used = Object.keys(book).filter((k) => book[k].some(Boolean)).map((k) => Number(k.slice(1)) - 1);
  const pages = Math.max(4, (used.length ? Math.max(...used) : 0) + 2);

  const placed = new Set<string>();
  for (const k of Object.keys(book)) for (const id of book[k]) if (id) placed.add(id);
  // A card that left the collection can never stay in a pocket.
  const tray = Object.keys(s.cards).filter((id) => !placed.has(id) && byId.has(id));

  const slots = (key: string): (string | null)[] => book[key] ?? emptyPage();

  function put(next: Book) {
    setBook(next);
  }

  function goPage(n: number, dir: "next" | "prev") {
    if (n < 0 || n >= pages || turn) return;
    click("soft");
    setTurn(dir);
    window.setTimeout(() => {
      setPage(n);
      setTurn("");
    }, 320);
  }

  function drop(d: Drag, target: string) {
    const next: Book = JSON.parse(JSON.stringify(book));
    const key = pageKey(page);
    const get = (k: string) => (next[k] ??= emptyPage());
    // take the card out of where it came from
    let displaced: string | null = null;
    if (target.startsWith("slot:")) {
      const slot = Number(target.slice(5));
      displaced = get(key)[slot];
      if (d.from !== "tray") get(d.from.page)[d.from.slot] = displaced;
      get(key)[slot] = d.id;
      if (d.from !== "tray" && d.from.page === key && d.from.slot === slot) get(key)[slot] = d.id;
    } else if (target === "tray" && d.from !== "tray") {
      get(d.from.page)[d.from.slot] = null;
    } else return;
    click("soft");
    put(next);
  }

  function startDrag(e: PointerEvent, id: string, from: Drag["from"]) {
    const el = e.currentTarget as HTMLElement;
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;
    const t0 = performance.now();
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (!active) {
        const far = Math.hypot(dx, dy) > 9;
        // From the tray, a mostly horizontal move scrolls the tray; a vertical move or a long press picks the card up.
        if (!far) return;
        if (from === "tray" && Math.abs(dx) > Math.abs(dy) * 1.4 && performance.now() - t0 < 300) return end(ev, false);
        active = true;
        try {
          el.setPointerCapture(ev.pointerId);
        } catch {
          /* still works */
        }
      }
      const d: Drag = { id, from, x: ev.clientX, y: ev.clientY };
      dragRef.current = d;
      setDrag(d);
      const t = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const zone = t?.closest<HTMLElement>("[data-drop]")?.dataset.drop ?? "";
      setHover(zone);
      window.clearTimeout(edgeTimer.current);
      if (zone === "edge:next" || zone === "edge:prev") {
        edgeTimer.current = window.setTimeout(() => {
          const delta = zone === "edge:next" ? 1 : -1;
          setPage((p: number) => Math.max(0, Math.min(pages - 1, p + delta)));
          click("soft");
        }, 650);
      }
    };
    const end = (ev: PointerEvent, drop_: boolean) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.clearTimeout(edgeTimer.current);
      if (active && drop_) {
        const t = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
        const zone = t?.closest<HTMLElement>("[data-drop]")?.dataset.drop ?? "";
        const d = dragRef.current;
        if (d && zone) drop(d, zone);
      } else if (!active && drop_) {
        setPicked((p: string | null) => (p === id ? null : id));
        pickedFrom.current = from;
      }
      dragRef.current = null;
      setDrag(null);
      setHover("");
    };
    const up = (ev: PointerEvent) => end(ev, true);
    const cancel = (ev: PointerEvent) => end(ev, false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  }
  const pickedFrom = useRef<Drag["from"]>("tray");

  // Tap method: pick a card, then tap a pocket (for little fingers that do not like dragging).
  function tapSlot(slot: number) {
    if (picked) {
      drop({ id: picked, from: pickedFrom.current, x: 0, y: 0 }, `slot:${slot}`);
      setPicked(null);
    }
  }

  useEffect(() => () => window.clearTimeout(edgeTimer.current), []);

  if (!open) {
    return (
      <div className="livre livre--closed">
        <button type="button" className="cover" onClick={() => { click("button"); setOpen(true); }} aria-label="Ouvrir le livre">
          <span className="cover__spine" aria-hidden="true" />
          <span className="cover__badge" aria-hidden="true">⚽</span>
          <span className="cover__title">FOOTDEX</span>
          <span className="cover__sub">pour Raphaël</span>
          <span className="cover__open"><LuBookOpen aria-hidden="true" /> Ouvrir</span>
        </button>
        <p className="livre__help">Range tes cartes comme dans un vrai classeur : une page, neuf pochettes, et tu glisses les cartes où tu veux.</p>
      </div>
    );
  }

  const cur = slots(pageKey(page));
  return (
    <div className="livre">
      <div className="livre__bar">
        <button type="button" className="btn btn--soft" onClick={() => setOpen(false)}><LuX aria-hidden="true" /> Fermer</button>
        <div className="livre__nav">
          <button type="button" className="btn btn--soft" onClick={() => goPage(page - 1, "prev")} disabled={page === 0} aria-label="Page précédente"><LuArrowLeft aria-hidden="true" /></button>
          <strong>Page {page + 1} / {pages}</strong>
          <button type="button" className="btn btn--soft" onClick={() => goPage(page + 1, "next")} disabled={page >= pages - 1} aria-label="Page suivante"><LuArrowRight aria-hidden="true" /></button>
        </div>
      </div>

      <div className={cx("book", drag && "book--drag")}>
        {drag ? <span className={cx("book__edge book__edge--l", hover === "edge:prev" && "is-hot")} data-drop="edge:prev"><LuArrowLeft aria-hidden="true" /></span> : null}
        {drag ? <span className={cx("book__edge book__edge--r", hover === "edge:next" && "is-hot")} data-drop="edge:next"><LuArrowRight aria-hidden="true" /></span> : null}
        <div className={cx("book__page", turn && `turn-${turn}`)}>
          <ul className="pockets">
            {cur.map((id, i) => {
              const card = id ? byId.get(id) : undefined;
              const own = id ? s.cards[id] : undefined;
              return (
                <li key={i} className={cx("pocket", hover === `slot:${i}` && "pocket--hot", picked && !id && "pocket--ready")} data-drop={`slot:${i}`} onClick={() => !card && tapSlot(i)}>
                  <span className="pocket__num">{i + 1}</span>
                  {card ? (
                    <div className={cx("pocket__card", drag?.id === id && "is-lifted", picked === id && "is-picked")} onPointerDown={(e: PointerEvent) => startDrag(e, card.id, { page: pageKey(page), slot: i })}>
                      <Carte card={card} shiny={(own?.[3] ?? 0) > 0} size="sm" tilt={false} label={`${card.name}, carte ${RARITY[card.rarity].label}`} />
                    </div>
                  ) : null}
                  <span className="pocket__glass" aria-hidden="true" />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <p className="livre__help">{picked ? "Touche maintenant une pochette vide." : "Glisse une carte dans une pochette. Pour changer de page, amène-la sur la flèche au bord. Tu peux aussi toucher une carte, puis une pochette."}</p>

      <div className={cx("tray", hover === "tray" && "tray--hot")} data-drop="tray">
        <p className="tray__title">Mes cartes à ranger ({tray.length})</p>
        {tray.length === 0 ? <p className="tray__empty">Toutes tes cartes sont rangées dans le livre. Glisse-en une ici pour la sortir.</p> : null}
        <div className="tray__row">
          {tray.map((id) => {
            const card = byId.get(id);
            if (!card) return null;
            const own = s.cards[id];
            return (
              <div key={id} className={cx("tray__card", drag?.id === id && "is-lifted", picked === id && "is-picked")} onPointerDown={(e: PointerEvent) => startDrag(e, id, "tray")}>
                <Carte card={card} shiny={(own?.[3] ?? 0) > 0} size="sm" tilt={false} label={card.name} />
              </div>
            );
          })}
        </div>
      </div>

      {drag && byId.get(drag.id) ? (
        <div className="ghost" style={{ left: `${drag.x}px`, top: `${drag.y}px` }}>
          <Carte card={byId.get(drag.id) as CardRef} size="sm" tilt={false} label="Carte en train d'être déplacée" />
        </div>
      ) : null}
    </div>
  );
}
