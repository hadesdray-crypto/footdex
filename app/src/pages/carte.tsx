import { useEffect, useMemo, useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuMinus, LuPlane, LuPlus, LuVolume2, LuX } from "react-icons/lu";
import { KINDS, LAND_PATH, MAP_H, MAP_W, PLACES, SEA_PATH, TOURS, project, type Kind, type Place, type Tour } from "../carte-data";
import type { Album } from "../data";
import { getMascot } from "../mascot/state";
import { say } from "../mascot/state";
import { Chips, Link, PageTitle } from "../ui/bits";
import { cx, storageGet, storageSet } from "../util";

const KEY = "footdex.carte.v1";
type View = { z: number; x: number; y: number };
const GRATICULE = (() => {
  const out: string[] = [];
  for (let lon = -150; lon <= 150; lon += 30) out.push(`M${project(lon, 84)[0]} 0V${MAP_H}`);
  for (let lat = -60; lat <= 60; lat += 30) out.push(`M0 ${project(0, lat)[1]}H${MAP_W}`);
  return out.join("");
})();

function loadSeen(): string[] {
  try {
    const raw = JSON.parse(storageGet(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x: unknown): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** The world map: drag, pinch, touch a place, or take a tour. */
export function Carte({ album }: { album: Album }) {
  const box = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 360, h: 420, ok: false });
  const [view, setView] = useState<View | null>(null);
  const [kind, setKind] = useState<"tous" | Kind>("tous");
  const [seen, setSeen] = useState<string[]>(loadSeen);
  const [sel, setSel] = useState<string | null>(null);
  const [tour, setTour] = useState<{ id: string; i: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: false, dist: 0, startX: 0, startY: 0 });
  const raf = useRef(0);

  const minZ = Math.max(size.w / MAP_W, size.h / MAP_H);
  const maxZ = (size.w / MAP_W) * 60;
  const clamp = (v: View): View => {
    const z = Math.min(maxZ, Math.max(minZ, v.z));
    const x = Math.min(0, Math.max(size.w - MAP_W * z, v.x));
    const y = Math.min(0, Math.max(size.h - MAP_H * z, v.y));
    return { z, x, y };
  };
  const centered = (lon: number, lat: number, z: number): View => {
    const [px, py] = project(lon, lat);
    return clamp({ z, x: size.w / 2 - px * z, y: size.h / 2 - py * z });
  };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.round(r.width), h: Math.round(r.height), ok: true });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  useEffect(() => {
    if (!size.ok) return;
    setView((v: View | null) => (v ? clamp(v) : centered(10, 40, size.w / 300)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h, size.ok]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const v = view ?? { z: minZ, x: 0, y: 0 };
  const at = (lon: number, lat: number) => {
    const [px, py] = project(lon, lat);
    return { x: px * v.z + v.x, y: py * v.z + v.y };
  };

  function fly(to: View) {
    cancelAnimationFrame(raf.current);
    const from = v;
    const t0 = performance.now();
    const dur = 1100;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      // Zoom out a little in the middle of a long trip.
      const arc = Math.sin(Math.PI * t) * 0.35;
      const z = (from.z + (to.z - from.z) * e) * (1 - arc * Math.min(1, Math.hypot(to.x - from.x, to.y - from.y) / 800));
      setView(clamp({ z, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }

  function zoomAt(px: number, py: number, factor: number) {
    setView((cur: View | null) => {
      const c = cur ?? v;
      const z = Math.min(maxZ, Math.max(minZ, c.z * factor));
      const k = z / c.z;
      return clamp({ z, x: px - (px - c.x) * k, y: py - (py - c.y) * k });
    });
  }

  // ---- gestures
  const local = (e: { clientX: number; clientY: number }) => {
    const r = box.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };
  function down(e: PointerEvent) {
    cancelAnimationFrame(raf.current);
    pointers.current.set(e.pointerId, local(e));
    const g = gesture.current;
    if (pointers.current.size === 1) {
      g.moved = false;
      g.startX = e.clientX;
      g.startY = e.clientY;
    }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      g.dist = Math.hypot(a.x - b.x, a.y - b.y);
      g.moved = true;
    }
  }
  function move(e: PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const now = local(e);
    const g = gesture.current;
    if (!g.moved && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < 6) return;
    if (!g.moved) {
      g.moved = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* the gesture still works */
      }
    }
    pointers.current.set(e.pointerId, now);
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.dist > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, dist / g.dist);
      g.dist = dist;
    } else {
      const dx = now.x - prev.x;
      const dy = now.y - prev.y;
      setView((cur: View | null) => clamp({ ...(cur ?? v), x: (cur ?? v).x + dx, y: (cur ?? v).y + dy }));
    }
  }
  function up(e: PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current.dist = 0;
  }
  function wheel(e: WheelEvent) {
    const p = local(e);
    zoomAt(p.x, p.y, e.deltaY < 0 ? 1.25 : 0.8);
  }

  // ---- places
  const place = sel ? PLACES.find((p) => p.id === sel) ?? null : null;
  const activeTour: Tour | null = tour ? TOURS.find((t) => t.id === tour.id) ?? null : null;
  const shown = useMemo(() => PLACES.filter((p) => kind === "tous" || p.kind === kind), [kind]);

  function discover(id: string) {
    setSeen((cur: string[]) => {
      if (cur.includes(id)) return cur;
      const next = [...cur, id];
      storageSet(KEY, JSON.stringify(next));
      return next;
    });
  }
  function open(p: Place, opts: { fly?: boolean; speak?: string } = {}) {
    setSel(p.id);
    discover(p.id);
    if (opts.fly !== false) fly(centered(p.lon, p.lat, Math.max(v.z, (size.w / MAP_W) * 14)));
    const m = getMascot();
    if (opts.speak) say(`${opts.speak} ${p.name}, ${p.city}. ${p.text}`);
    else if (m.s.narrate) say(`${p.name}, ${p.city}, ${p.country}. ${p.text}`);
  }
  function showMap() {
    const el = box.current;
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 70), behavior: "smooth" });
  }
  function goTour(id: string, i: number) {
    const t = TOURS.find((x) => x.id === id);
    if (!t) return;
    const stop = t.stops[i];
    const p = PLACES.find((x) => x.id === stop.place);
    if (!p) return;
    setTour({ id, i });
    setSel(p.id);
    discover(p.id);
    fly(centered(p.lon, p.lat, (size.w / MAP_W) * 16));
    showMap();
    say(`Étape ${i + 1} sur ${t.stops.length}. ${stop.note} ${p.name}, à ${p.city}.`);
  }
  function endTour() {
    setTour(null);
    fly(centered(10, 40, size.w / 300));
  }

  const route = activeTour && tour ? activeTour.stops.slice(0, tour.i + 1).map((s) => PLACES.find((p) => p.id === s.place)).filter((p): p is Place => !!p) : [];
  const total = PLACES.length;
  const found = PLACES.filter((p) => seen.includes(p.id)).length;
  const labelAt = v.z > (size.w / MAP_W) * 9;

  return (
    <div className="carte">
      <PageTitle kicker="Le Tour du monde du foot" title="La carte">
        <p>Touche un stade pour découvrir son histoire. Ou pars en voyage avec le bonhomme.</p>
      </PageTitle>

      <div className="carte__bar">
        <Chips<"tous" | Kind>
          label="Lieux à montrer"
          scroll
          value={kind}
          onChange={setKind}
          options={[["tous", "Tous"], ["soir", "Grands soirs"], ["stade", "Stades de légende"], ["club", "Clubs de France"]]}
        />
        <p className="carte__count">
          <strong>{found}</strong> lieux découverts sur {total}
        </p>
      </div>

      <div
        ref={box}
        className="carte__map"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={wheel}
        role="application"
        aria-label="Carte du monde des stades. Déplace-la avec un doigt, zoome avec deux doigts."
      >
        <svg width={size.w} height={size.h} className="carte__svg" aria-hidden="true">
          <defs>
            <linearGradient id="carte-sea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#12306b" />
              <stop offset="1" stopColor="#081633" />
            </linearGradient>
            <linearGradient id="carte-land" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2c7a5d" />
              <stop offset="1" stopColor="#1b5a47" />
            </linearGradient>
          </defs>
          <rect width={size.w} height={size.h} fill="url(#carte-sea)" />
          <g transform={`translate(${v.x} ${v.y}) scale(${v.z})`}>
            <path d={GRATICULE} className="carte__grid" vectorEffect="non-scaling-stroke" />
            <path d={LAND_PATH} fill="url(#carte-land)" className="carte__land" vectorEffect="non-scaling-stroke" />
            <path d={SEA_PATH} className="carte__lake" vectorEffect="non-scaling-stroke" />
          </g>
          {route.length > 1 ? (
            <polyline
              className="carte__route"
              points={route.map((p) => {
                const a = at(p.lon, p.lat);
                return `${a.x},${a.y}`;
              }).join(" ")}
            />
          ) : null}
          {shown.map((p) => {
            const a = at(p.lon, p.lat);
            if (a.x < -20 || a.y < -20 || a.x > size.w + 20 || a.y > size.h + 20) return null;
            const on = sel === p.id;
            const done = seen.includes(p.id);
            return (
              <g
                key={p.id}
                className={cx("pin", on && "is-on", done && "is-seen")}
                transform={`translate(${a.x} ${a.y})`}
                role="button"
                tabIndex={0}
                aria-label={`${p.name}, ${p.city}`}
                onClick={() => open(p)}
                onKeyDown={(e: { key: string }) => {
                  if (e.key === "Enter" || e.key === " ") open(p);
                }}
              >
                <circle className="pin__hit" r="20" />
                {on ? <circle className="pin__pulse" r="11" fill={KINDS[p.kind].color} /> : null}
                <circle className="pin__dot" r={on ? 8.5 : 6.5} fill={done ? KINDS[p.kind].color : "#0c1324"} stroke={KINDS[p.kind].color} strokeWidth="2.6" />
                {labelAt || on ? (
                  <text className="pin__label" y="-13" textAnchor="middle">
                    {p.name}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <div className="carte__zoom">
          <button type="button" aria-label="Zoomer" onClick={() => zoomAt(size.w / 2, size.h / 2, 1.6)}>
            <LuPlus aria-hidden="true" />
          </button>
          <button type="button" aria-label="Dézoomer" onClick={() => zoomAt(size.w / 2, size.h / 2, 0.62)}>
            <LuMinus aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="carte__legend" aria-hidden="true">
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <span key={k}>
            <i style={{ background: KINDS[k].color }} />
            {KINDS[k].label}
          </span>
        ))}
        <span>
          <i className="hollow" />
          pas encore découvert
        </span>
      </div>

      {activeTour && tour ? (
        <section className="carte__sheet carte__sheet--tour" aria-live="polite">
          <p className="eyebrow">
            <LuPlane aria-hidden="true" /> {activeTour.title} · étape {tour.i + 1} / {activeTour.stops.length}
          </p>
          <h2>{place?.name}</h2>
          <p className="carte__note">{activeTour.stops[tour.i].note}</p>
          {place ? <p>{place.text}</p> : null}
          <div className="carte__nav">
            <button type="button" className="btn btn--soft" disabled={tour.i === 0} onClick={() => goTour(tour.id, tour.i - 1)}>
              <LuChevronLeft aria-hidden="true" /> Avant
            </button>
            <button type="button" className="btn btn--ghost" onClick={endTour}>
              <LuX aria-hidden="true" /> Arrêter
            </button>
            <button type="button" className="btn btn--gold" disabled={tour.i >= activeTour.stops.length - 1} onClick={() => goTour(tour.id, tour.i + 1)}>
              Suite <LuChevronRight aria-hidden="true" />
            </button>
          </div>
        </section>
      ) : place ? (
        <section className="carte__sheet" aria-live="polite">
          <p className="eyebrow">
            <i className="dot" style={{ background: KINDS[place.kind].color }} /> {KINDS[place.kind].label} · {place.city}, {place.country}
          </p>
          <h2>{place.name}</h2>
          <p>{place.text}</p>
          <div className="carte__links">
            {(place.matches ?? []).map((id) => {
              const m = album.matches.find((x) => x.id === id);
              return m ? (
                <Link key={id} to={{ page: "match", id }} className="btn btn--soft">
                  {m.title}
                </Link>
              ) : null;
            })}
            {(place.clubs ?? []).map((id) => {
              const c = album.clubs.find((x) => x.id === id);
              return c ? (
                <Link key={id} to={{ page: "club", id }} className="btn btn--soft">
                  {c.name}
                </Link>
              ) : null;
            })}
            <button type="button" className="btn btn--ghost" onClick={() => say(`${place.name}, ${place.city}. ${place.text}`)}>
              <LuVolume2 aria-hidden="true" /> Écouter
            </button>
          </div>
        </section>
      ) : (
        <section className="carte__sheet carte__sheet--empty">
          <h2>Où veux-tu aller ?</h2>
          <p>Touche un point sur la carte, ou choisis un voyage.</p>
        </section>
      )}

      {!activeTour ? (
        <section className="carte__tours" aria-label="Les voyages">
          <h2 className="sheet__title">Les voyages</h2>
          {TOURS.map((t) => (
            <button key={t.id} type="button" className="carte__tour" onClick={() => goTour(t.id, 0)}>
              <LuPlane aria-hidden="true" />
              <span>
                <strong>{t.title}</strong>
                <em>{t.tag}</em>
              </span>
              <LuChevronRight aria-hidden="true" />
            </button>
          ))}
        </section>
      ) : null}

      <section className="carte__list" aria-label="Tous les lieux">
        <h2 className="sheet__title">Tous les lieux</h2>
        <ul>
          {shown.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => { showMap(); open(p); }}>
                <i style={{ background: KINDS[p.kind].color, opacity: seen.includes(p.id) ? 1 : 0.35 }} />
                <span>
                  <strong>{p.name}</strong>
                  <em>
                    {p.city}, {p.country}
                  </em>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
