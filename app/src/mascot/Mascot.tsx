import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuArrowLeft, LuBookMarked, LuBookOpen, LuCalendarDays, LuCompass, LuFilm, LuGlobe, LuGraduationCap, LuHouse, LuLibrary, LuMessageSquareQuote, LuPackageOpen, LuShieldCheck, LuTrophy, LuUserPlus, LuUsers, LuZap, LuMessageCircle, LuSettings, LuShirt, LuVolume2, LuX } from "react-icons/lu";
import type { Album } from "../data";
import { useOverlay } from "../ui/cards";
import { cx, dayKey } from "../util";
import { Fig } from "./Fig";
import { PERSOS } from "./lines";
import { CaracList } from "./Carac";
import { ballOpen } from "../sound";
import { piperDownload, piperRemove } from "../piper";
import { SPEEDS, choosePerso, wornLook, askToTell, continueSpeech, explain, getMascot, greet, hideBubble, onShake, onThrown, play, readPage, sample, sayLabel, stopTalking, tellStory, testEngine, update, useMascot, warmVoice, ENGINES, type Engine } from "./state";
import { Wardrobe, type Tab } from "./Wardrobe";
import { go, type Route } from "../router";
import { createActor } from "./actor";
import { mountBall, unmountBall } from "./ball";
import { runScript } from "./scripts";

const W = 74;
const H = 84;

/** The character: always there, in a corner. Tap for his menu, hold to move him, flick him away (he will not like it). */
export function Mascot({ album, page }: { album: Album; page: string }) {
  const m = useMascot();
  const perso = PERSOS[m.s.perso];
  const [menu, setMenu] = useState<null | "main" | "settings" | "go">(null);
  const [wardrobe, setWardrobe] = useState<false | Tab>(false);
  const menuRef = useRef<unknown>(null);
  const wardrobeRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const act = useRef<{ busy: boolean; cancel: (() => void) | null }>({ busy: false, cancel: null });
  const [roam, setRoam] = useState<{ x: number; y: number } | null>(null);
  const g = useRef({ down: false, mode: "wait" as "wait" | "drag" | "swipe", sx: 0, sy: 0, ox: 0, oy: 0, t0: 0, moved: 0, timer: 0, lastTap: 0, tapTimer: 0 });

  const area = { l: 6, r: size.w - W - 6, t: 66, b: size.h - H - 76 };
  const pos = drag ?? roam ?? { x: area.l + m.s.fx * Math.max(0, area.r - area.l), y: area.t + m.s.fy * Math.max(0, area.b - area.t) };

  posRef.current = pos;
  menuRef.current = menu;
  wardrobeRef.current = !!wardrobe;
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    warmVoice();
  }, []);

  // Welcome, once a day.
  useEffect(() => {
    const today = dayKey();
    if (m.s.day === today) return;
    update({ day: today });
    const t = window.setTimeout(greet, 1800);
    return () => window.clearTimeout(t);
  }, []);

  // Shaking the phone.
  useEffect(() => {
    let last = 0;
    let hits = 0;
    let hitAt = 0;
    let lx = 0;
    let ly = 0;
    let lz = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const d = Math.abs((a.x ?? 0) - lx) + Math.abs((a.y ?? 0) - ly) + Math.abs((a.z ?? 0) - lz);
      lx = a.x ?? 0;
      ly = a.y ?? 0;
      lz = a.z ?? 0;
      const now = Date.now();
      if (d > 30) {
        if (now - hitAt > 900) hits = 0;
        hits += 1;
        hitAt = now;
        if (hits >= 3 && now - last > 4500) {
          last = now;
          hits = 0;
          onShake();
        }
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, []);

  function askMotion() {
    const dm = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
    if (dm && typeof dm.requestPermission === "function") dm.requestPermission().catch(() => undefined);
  }

  // The juggler's ball: a real ball, on the screen, that falls and rolls.
  useEffect(() => {
    if (perso.mode !== "joueur") return;
    const p = posRef.current;
    mountBall(Math.min(window.innerWidth - 30, p.x + W + 20), p.y + 10);
    return () => unmountBall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perso.mode]);

  // Each character has his own habits.
  useEffect(() => {
    const timers: number[] = [];
    const every = (min: number, max: number, fn: () => void) => {
      const loop = () => {
        timers.push(
          window.setTimeout(() => {
            if (!document.hidden) fn();
            loop();
          }, min + Math.random() * (max - min)),
        );
      };
      loop();
    };
    if (perso.mode === "statue") every(16000, 30000, () => play("tip", 1500));
    if (perso.mode === "excite") {
      every(70000, 120000, () => {
        const s = getMascot();
        if (!s.bubble && !s.busy && !s.talking) askToTell(album.matches);
      });
    }
    if (perso.mode === "joueur") every(7000, 15000, () => wander());
    else if (perso.mode === "excite") every(22000, 42000, () => wander());
    else every(40000, 75000, () => wander());
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perso.mode]);

  // He walks about on his own: the actor takes his place on the screen, plays his scene, and goes back home.
  function wander() {
    const st = getMascot();
    const a = act.current;
    const fab = fabRef.current;
    if (a.busy || !fab || st.busy || st.talking || st.anim || menuRef.current || wardrobeRef.current || document.querySelector(".mm, .wd, .reveal")) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const here = posRef.current;
    const mode = PERSOS[getMascot().s.perso].mode;
    const r = Math.random();
    const finish = () => {
      a.busy = false;
      a.cancel = null;
      rootRef.current?.classList.remove("is-behind");
      if (fabRef.current) fabRef.current.style.visibility = "";
      setRoam(null);
    };
    const anims: Animation[] = [];
    // Old tricks of the juggler: climbing on an icon, walking behind the buttons, waving, jumping.
    if (mode === "joueur" && r >= 0.62) {
      a.busy = true;
      a.cancel = () => {
        anims.forEach((x) => x.cancel());
        finish();
      };
      const ox = here.x;
      const oy = here.y;
      if (r < 0.76) {
        const t = pickTarget();
        if (!t) return finish();
        const tr = t.getBoundingClientRect();
        const dx = tr.left + tr.width / 2 - (ox + W / 2);
        const dy = tr.bottom - 8 - oy;
        play("cheer", 4200);
        anims.push(
          fab.animate(
            [
              { transform: "translate(0,0)" },
              { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 90}px) rotate(${dx > 0 ? 12 : -12}deg)`, offset: 0.18 },
              { transform: `translate(${dx}px,${dy}px)`, offset: 0.3 },
              { transform: `translate(${dx}px,${dy - 16}px)`, offset: 0.4 },
              { transform: `translate(${dx}px,${dy + 2}px)`, offset: 0.5 },
              { transform: `translate(${dx}px,${dy - 20}px)`, offset: 0.6 },
              { transform: `translate(${dx}px,${dy + 4}px)`, offset: 0.7 },
              { transform: `translate(${dx}px,${dy - 6}px) rotate(-6deg)`, offset: 0.76 },
              { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 70}px)`, offset: 0.88 },
              { transform: "translate(0,0)" },
            ],
            { duration: 4200, easing: "ease-in-out" },
          ),
        );
        window.setTimeout(() => t.animate([{ transform: "rotate(0)" }, { transform: "rotate(-6deg) scale(1.08)" }, { transform: "rotate(5deg)" }, { transform: "rotate(0)" }], { duration: 900, iterations: 3 }), 1100);
        window.setTimeout(finish, 4300);
      } else if (r < 0.86) {
        const top = Math.random() < 0.5;
        const toX = ox < window.innerWidth / 2 ? window.innerWidth - W - 8 : 8;
        const toY = top ? 40 - oy : window.innerHeight - H * 0.92 - oy;
        const dx = toX - ox;
        rootRef.current?.classList.add("is-behind");
        const keys: Keyframe[] = [];
        for (let i = 0; i <= 12; i += 1) {
          const f = i / 12;
          const e = f < 0.15 ? f / 0.15 : 1;
          keys.push({ transform: `translate(${dx * f}px,${toY * e + (i % 2 ? -7 : 0)}px) rotate(${i % 2 ? 3 : -3}deg)`, offset: f });
        }
        anims.push(fab.animate(keys, { duration: 5200, easing: "linear" }));
        window.setTimeout(() => {
          rootRef.current?.classList.remove("is-behind");
          anims.push(fab.animate([{ transform: `translate(${dx}px,${toY}px)` }, { transform: `translate(${dx}px,${toY}px)`, offset: 0.1 }, { transform: "translate(0,0)" }], { duration: 1600, easing: "ease-in-out" }));
        }, 5200);
        window.setTimeout(finish, 6900);
      } else if (r < 0.94) {
        play("wave", 3200);
        window.setTimeout(finish, 3300);
      } else {
        play("jump", 2000);
        window.setTimeout(finish, 2100);
      }
      return;
    }
    // Everything else: he really walks on the screen.
    a.busy = true;
    const actor = createActor(getMascot().s.look, here.x + W / 2, here.y + H - 4, {
      onTap: () => {
        a.cancel?.();
        const cx = Math.min(1, Math.max(0, (actor.x - W / 2 - area.l) / Math.max(1, area.r - area.l)));
        const cy = Math.min(1, Math.max(0, (actor.y - H - area.t) / Math.max(1, area.b - area.t)));
        update({ fx: cx, fy: cy });
        window.setTimeout(() => setMenu("main"), 30);
      },
      onMove: (x, y) => setRoam({ x: Math.max(0, x - W / 2), y: Math.max(0, y - H) }),
    });
    fab.style.visibility = "hidden";
    a.cancel = () => {
      actor.destroy();
      finish();
    };
    actor.pose("idle");
    const home = { x: here.x + W / 2, y: here.y + H - 4 };
    runScript(mode, actor, { home, target: pickTarget })
      .catch(() => undefined)
      .then(() => {
        if (actor.dead) return;
        actor.destroy();
        finish();
      });
  }

  // Assistance mode:

  // Assistance mode: whatever the finger touches is read aloud, and every new page is announced.
  useEffect(() => {
    if (!m.s.narrate) return;
    const h = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("button, a, [role=button], [role=tab], input, select") as HTMLElement | null;
      if (!el || el.closest(".mascot__fab, .mascot__bubble")) return;
      const label = (el.getAttribute("aria-label") || el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 90);
      if (label) sayLabel(label);
    };
    document.addEventListener("pointerdown", h, true);
    return () => document.removeEventListener("pointerdown", h, true);
  }, [m.s.narrate]);
  const firstPage = useRef(true);
  useEffect(() => {
    if (firstPage.current) {
      firstPage.current = false;
      return;
    }
    if (!m.s.narrate) return;
    const t = window.setTimeout(() => explain(page), 600);
    return () => window.clearTimeout(t);
  }, [page]);

  // ---- gestures
  function down(e: PointerEvent) {
    if (m.anim === "thrown") return;
    act.current.cancel?.();
    const t = e.currentTarget as HTMLElement;
    try {
      t.setPointerCapture(e.pointerId);
    } catch {
      /* the gesture still works without capture */
    }
    const s = g.current;
    s.down = true;
    s.mode = "wait";
    s.sx = e.clientX;
    s.sy = e.clientY;
    s.ox = pos.x;
    s.oy = pos.y;
    s.t0 = performance.now();
    s.moved = 0;
    window.clearTimeout(s.timer);
    s.timer = window.setTimeout(() => {
      if (s.down && s.mode === "wait" && s.moved < 10) {
        s.mode = "drag";
        setDragging(true);
        setMenu(null);
        if (navigator.vibrate) navigator.vibrate(15);
      }
    }, 380);
  }
  function move(e: PointerEvent) {
    const s = g.current;
    if (!s.down) return;
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    s.moved = Math.max(s.moved, Math.hypot(dx, dy));
    if (s.mode === "wait" && s.moved >= 12) {
      s.mode = "swipe";
      window.clearTimeout(s.timer);
    }
    if (s.mode === "drag") {
      setDrag({ x: Math.min(area.r, Math.max(area.l, s.ox + dx)), y: Math.min(area.b, Math.max(area.t, s.oy + dy)) });
    }
  }
  function up(e: PointerEvent) {
    const s = g.current;
    if (!s.down) return;
    s.down = false;
    window.clearTimeout(s.timer);
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    const dt = Math.max(1, performance.now() - s.t0);
    if (s.mode === "drag") {
      const x = drag?.x ?? pos.x;
      const y = drag?.y ?? pos.y;
      update({ fx: (x - area.l) / Math.max(1, area.r - area.l), fy: (y - area.t) / Math.max(1, area.b - area.t) });
      setDrag(null);
      setDragging(false);
    } else if (s.mode === "swipe") {
      const len = Math.hypot(dx, dy);
      if (len > 45 && len / dt > 0.5) {
        setMenu(null);
        hideBubble();
        play("thrown", 2700, dx / len, dy / len);
        window.setTimeout(() => update({ fy: 1 }), 1500);
        window.setTimeout(() => onThrown(len / dt > 1.6), 2500);
      }
    } else {
      askMotion();
      const now = performance.now();
      window.clearTimeout(s.tapTimer);
      if (now - s.lastTap < 340) {
        s.lastTap = 0;
        setMenu(null);
        continueSpeech();
      } else {
        s.lastTap = now;
        s.tapTimer = window.setTimeout(() => {
          stopTalking();
          setMenu((v: null | "main" | "settings" | "go") => (v ? null : "main"));
        }, 340);
      }
    }
    s.mode = "wait";
  }
  function cancel() {
    const s = g.current;
    s.down = false;
    window.clearTimeout(s.timer);
    setDrag(null);
    setDragging(false);
  }

  // ---- bubble position next to the character
  const right = pos.x + W / 2 > size.w / 2;
  const below = pos.y < 190;
  const bw = Math.min(260, size.w - 24);
  const bx = right ? Math.max(8, pos.x + W - bw) : Math.min(size.w - bw - 8, pos.x);
  const bubble = m.bubble;
  const showAside = bubble && !bubble.top && !m.busy;

  // He is resting (like Plume): only a small sleeping badge stays; a tap wakes him up.
  if (m.s.rest) {
    return (
      <button type="button" className="mascot__sleep" aria-label={`${perso.name} se repose : touche pour le réveiller`} onClick={() => { update({ rest: false }); window.setTimeout(greet, 400); }}>
        <span aria-hidden="true">💤</span>
      </button>
    );
  }

  const thrown = m.anim === "thrown";
  const fabStyle = {
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    "--tx": `${m.vx * 1300}px`,
    "--ty": `${m.vy * 1300}px`,
    "--rot": `${(m.vx >= 0 ? 1 : -1) * 600}deg`,
  };

  return (
    <>
      <div ref={rootRef} className={cx("mascot", m.busy && "is-hidden")} aria-live="polite">
        <button
          ref={fabRef}
          type="button"
          className={cx("mascot__fab", dragging && "is-drag", thrown && "is-thrown", m.anim === "shake" && "is-shake", m.anim === "jump" && "is-jump", m.talking && "is-talk")}
          style={fabStyle}
          aria-label={`${perso.name} : ouvrir son menu`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={cancel}
          onKeyDown={(e: { key: string; preventDefault: () => void }) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMenu((v: null | "main" | "settings" | "go") => (v ? null : "main"));
            }
          }}
        >
          <Fig look={wornLook()} size={W} crop="full" mouth={perso.mouth} talk={m.talking} cheer={m.anim === "cheer"} hurt={m.hurt} mode={perso.mode} tip={m.anim === "tip"} act={m.anim ?? ""} />
        </button>
        {showAside ? (
          <div className={cx("mascot__bubble", right && "is-right", below && "is-below")} style={{ left: `${bx}px`, ...(below ? { top: `${pos.y + H + 8}px` } : { bottom: `${size.h - pos.y + 6}px` }), width: `${bw}px` }}>
            <p>{bubble.text}</p>
            <button type="button" className="mascot__x" onClick={hideBubble} aria-label="Fermer la bulle">
              <LuX aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
      {bubble && bubble.top
        ? createPortal(
            <div className="mascot__top" role="status">
              <Fig look={wornLook()} size={64} crop="bust" mouth={perso.mouth} talk={m.talking} cheer={m.anim === "cheer"} act={m.anim ?? ""} mode={perso.mode} />
              <p>{bubble.text}</p>
            </div>,
            document.body,
          )
        : null}
      {menu ? <Menu view={menu} setView={setMenu} album={album} page={page} openWardrobe={(tab: Tab) => { setMenu(null); setWardrobe(tab); }} /> : null}
      {wardrobe ? <Wardrobe start={wardrobe} onClose={() => setWardrobe(false)} /> : null}
    </>
  );
}

const DESTINATIONS: { to: Route; label: string; icon: typeof LuHouse }[] = [
  { to: { page: "accueil" }, label: "Accueil", icon: LuHouse },
  { to: { page: "joueurs" }, label: "Les joueurs", icon: LuUsers },
  { to: { page: "paquets" }, label: "Les paquets", icon: LuPackageOpen },
  { to: { page: "classeur" }, label: "Le classeur", icon: LuLibrary },
  { to: { page: "jeux" }, label: "Les jeux", icon: LuZap },
  { to: { page: "coffre" }, label: "Le coffre", icon: LuPackageOpen },
  { to: { page: "carte" }, label: "La carte du monde", icon: LuGlobe },
  { to: { page: "matchs" }, label: "Les matchs", icon: LuTrophy },
  { to: { page: "scores" }, label: "Les scores", icon: LuCalendarDays },
  { to: { page: "coupes" }, label: "Les coupes", icon: LuTrophy },
  { to: { page: "clubs" }, label: "Les clubs", icon: LuShieldCheck },
  { to: { page: "saison" }, label: "La saison", icon: LuCalendarDays },
  { to: { page: "defi" }, label: "Le défi du jour", icon: LuGraduationCap },
  { to: { page: "grand-defi" }, label: "Le grand défi", icon: LuZap },
  { to: { page: "histoires" }, label: "Les histoires", icon: LuMessageSquareQuote },
  { to: { page: "videos" }, label: "Les vidéos", icon: LuFilm },
  { to: { page: "lexique" }, label: "Le lexique", icon: LuBookMarked },
  { to: { page: "sources" }, label: "Les sources", icon: LuShieldCheck },
];

function Menu({ view, setView, album, page, openWardrobe }: { view: "main" | "settings" | "go"; setView: (v: null | "main" | "settings" | "go") => void; album: Album; page: string; openWardrobe: (tab: Tab) => void }) {
  const m = useMascot();
  const perso = PERSOS[m.s.perso];
  const close = () => setView(null);
  useOverlay(close);
  const [ball, setBall] = useState(view === "main");
  useEffect(() => {
    if (view !== "main") return;
    ballOpen();
    const t = window.setTimeout(() => setBall(false), 1050);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const run = (fn: () => void) => () => {
    close();
    fn();
  };
  return createPortal(
    <div className="mm" role="dialog" aria-modal="true" aria-label="Menu du personnage">
      <button type="button" className="mm__backdrop" aria-label="Fermer" onClick={close} />
      {ball ? (
        <div className="mm__ball" aria-hidden="true">
          <span className="mm__half mm__half--l"><Ball /></span>
          <span className="mm__half mm__half--r"><Ball /></span>
        </div>
      ) : null}
      <div className="mm__sheet">
        <span className="signal__grip" aria-hidden="true" />
        <div className="mm__head">
          {view !== "main" ? (
            <button type="button" className="iconbtn" onClick={() => setView("main")} aria-label="Retour">
              <LuArrowLeft aria-hidden="true" />
            </button>
          ) : (
            <Fig look={m.s.look} size={52} crop="bust" mouth={perso.mouth} />
          )}
          <div className="mm__who">
            <strong>{view === "settings" ? "Réglages" : view === "go" ? "Aller quelque part" : perso.name}</strong>
            <span>{view === "settings" ? "Voix et caractère" : view === "go" ? "Touche où tu veux aller" : perso.tag}</span>
          </div>
          <button type="button" className="iconbtn" onClick={close} aria-label="Fermer le menu">
            <LuX aria-hidden="true" />
          </button>
        </div>
        {view === "main" ? (
          <div className="mm__tiles">
            <button type="button" className="mm__tile" onClick={run(() => explain(page))}>
              <LuMessageCircle aria-hidden="true" /> <span>Explique-moi</span>
            </button>
            <button type="button" className="mm__tile" onClick={run(readPage)}>
              <LuVolume2 aria-hidden="true" /> <span>Lis-moi la page</span>
            </button>
            <button type="button" className="mm__tile" onClick={run(() => tellStory(album.matches))}>
              <LuBookOpen aria-hidden="true" /> <span>Une histoire</span>
            </button>
            <button type="button" className="mm__tile" onClick={() => setView("go")}>
              <LuGlobe aria-hidden="true" /> <span>Aller quelque part</span>
            </button>
            <button type="button" className="mm__tile" onClick={() => openWardrobe("perso")}>
              <LuUserPlus aria-hidden="true" /> <span>Créer mon personnage</span>
            </button>
            <button type="button" className="mm__tile" onClick={() => openWardrobe("tenue")}>
              <LuShirt aria-hidden="true" /> <span>Vestiaire</span>
            </button>
            <button type="button" className="mm__tile" onClick={() => setView("settings")}>
              <LuSettings aria-hidden="true" /> <span>Réglages</span>
            </button>
            <button type="button" className={cx("mm__tile", m.s.narrate && "is-on")} aria-pressed={m.s.narrate} onClick={() => { update({ narrate: !m.s.narrate }); sayLabel(m.s.narrate ? "Je ne parle plus tout seul." : "D'accord, je te dis tout ce qui se passe !"); }}>
              <LuCompass aria-hidden="true" /> <span>{m.s.narrate ? "Dis-moi tout : OUI" : "Dis-moi tout : NON"}</span>
            </button>
          </div>
        ) : view === "go" ? (
          <div className="mm__tiles mm__tiles--go">
            {DESTINATIONS.map((d) => (
              <button key={d.label} type="button" className="mm__tile mm__tile--sm" onClick={() => { close(); go(d.to); window.setTimeout(() => sayLabel(`Direction : ${d.label}.`), 250); }}>
                <d.icon aria-hidden="true" /> <span>{d.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mm__settings">
            <p className="mm__label">Vitesse de la voix</p>
            <div className="chips">
              {SPEEDS.map((s, i) => (
                <button key={s.label} type="button" className={cx("chip", m.s.speed === i && "chip--on")} aria-pressed={m.s.speed === i} onClick={() => { update({ speed: i }); sample(); }}>
                  {s.label}
                </button>
              ))}
            </div>
            <VoicePanel />
            <p className="mm__label">Dis-moi tout ce qui se passe</p>
            <div className="chips">
              <button type="button" className={cx("chip", m.s.narrate && "chip--on")} aria-pressed={m.s.narrate} onClick={() => update({ narrate: true })}>Oui</button>
              <button type="button" className={cx("chip", !m.s.narrate && "chip--on")} aria-pressed={!m.s.narrate} onClick={() => update({ narrate: false })}>Non</button>
            </div>
            <p className="mm__note">Avec « Oui », il lit à voix haute chaque bouton que tu touches et explique chaque nouvelle page.</p>
            <p className="mm__label">Son caractère</p>
            <p className="mm__note">Chaque caractère a sa tenue, sa voix et sa façon de parler. Les points disent combien il parle.</p>
            <CaracList current={m.s.perso} onPick={(i) => { choosePerso(i); window.setTimeout(sample, 30); }} />
            <button type="button" className="btn btn--soft" onClick={() => { stopTalking(); hideBubble(); update({ rest: true }); }}>
              💤 {perso.name} se repose (il se cache)
            </button>
            <button type="button" className="btn btn--soft" onClick={() => { stopTalking(); sample(); }}>
              <LuVolume2 aria-hidden="true" /> Entendre un exemple
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Ball({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" width={className ? 22 : 150} height={className ? 22 : 150}>
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="#10131c" stroke-width="4" />
      <path d="M50 30 l17 12 -6 20 h-22 l-6 -20Z" fill="#10131c" />
      <path d="M50 30 V6 M67 42 L90 34 M61 62 L76 84 M39 62 L24 84 M33 42 L10 34" stroke="#10131c" stroke-width="4" />
    </svg>
  );
}


function pickTarget(): HTMLElement | null {
  const list = Array.from(document.querySelectorAll<HTMLElement>("main button, main a, .topbar button, .tabbar a, .tabbar button")).filter((e: HTMLElement) => {
    const r = e.getBoundingClientRect();
    return r.width >= 18 && r.height >= 18 && r.top >= 4 && r.bottom <= window.innerHeight - 4 && r.left >= 0 && r.right <= window.innerWidth && !e.closest(".mascot");
  });
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

/** The voice menu: choose how he speaks, test each way, and let him find the one you really hear. */
function VoicePanel() {
  const m = useMascot();
  const [asked, setAsked] = useState<Engine | null>(null);
  const [wizard, setWizard] = useState<Engine[] | null>(null);
  const [msg, setMsg] = useState("");
  const [dl, setDl] = useState<number | null>(null);
  async function getPiper() {
    setDl(0);
    setMsg("Téléchargement de la belle voix… (une seule fois, garde l'appli ouverte)");
    const ok = await piperDownload((f) => setDl(f));
    setDl(null);
    if (ok) {
      update({ piper: true, engine: "auto", auto: true });
      setMsg("Belle voix installée ! Elle marchera même sans connexion.");
      test("piper");
    } else setMsg("Impossible de télécharger la belle voix ici (pas de connexion, ou téléchargement bloqué dans cet aperçu). Réessaie depuis l'appli installée, avec internet.");
  }
  async function dropPiper() {
    stopTalking();
    await piperRemove();
    update({ piper: false });
    setMsg("Belle voix supprimée du téléphone.");
  }
  const label = (e: Engine) => (m.eng[e] === "ok" ? "Démarre" : m.eng[e] === "ko" ? "Ne marche pas ici" : "Pas encore testée");

  function test(e: Engine, queue: Engine[] | null = null) {
    setAsked(null);
    setWizard(queue);
    setMsg(`Test : ${ENGINES.find((x) => x.id === e)?.name}…`);
    testEngine(e, (ok: boolean) => {
      if (!ok) {
        setMsg("Cette voix ne démarre pas ici.");
        if (queue && queue.length > 1) window.setTimeout(() => test(queue[1], queue.slice(1)), 600);
        else {
          setWizard(null);
          setMsg(queue ? "Aucune voix n'a démarré. Vérifie le volume et le mode silencieux du téléphone." : "Cette voix ne démarre pas ici.");
        }
        return;
      }
      window.setTimeout(() => setAsked(e), 2600);
    });
  }
  function answer(e: Engine, heard: boolean) {
    update({ heard: { ...m.s.heard, [e]: heard } });
    setAsked(null);
    stopTalking();
    if (heard) {
      setMsg(`Super ! Je parlerai avec : ${ENGINES.find((x) => x.id === e)?.name}.`);
      setWizard(null);
      return;
    }
    if (wizard && wizard.length > 1) window.setTimeout(() => test(wizard[1], wizard.slice(1)), 400);
    else {
      setWizard(null);
      setMsg("D'accord. Essaie une autre voix, ou monte le volume du téléphone.");
    }
  }

  return (
    <div className="voicepanel">
      <p className="mm__label">Comment il parle</p>
      <button type="button" className="btn btn--gold" onClick={() => { const q: Engine[] = ENGINES.map((x) => x.id).filter((id) => id !== "piper" || m.s.piper); test(q[0], q); }}>
        Trouver ma voix, pas à pas
      </button>
      <p className="mm__note">Il essaie chaque voix l'une après l'autre. Tu dis « oui » à celle que tu entends : il la garde.</p>
      {msg ? <p className="mm__note voicepanel__msg" role="status">{msg}</p> : null}
      {asked ? (
        <div className="voicepanel__ask" role="group" aria-label="Tu l'entends ?">
          <strong>Tu m'entends ?</strong>
          <button type="button" className="btn btn--pitch" onClick={() => answer(asked, true)}>Oui, je t'entends</button>
          <button type="button" className="btn btn--soft" onClick={() => answer(asked, false)}>Non, rien</button>
        </div>
      ) : null}
      <div className="voicelist" role="radiogroup" aria-label="Voix">
        <div className={cx("voicerow", m.s.engine === "auto" && "voicerow--on")}>
          <button type="button" role="radio" aria-checked={m.s.engine === "auto"} className="voicerow__pick" onClick={() => update({ engine: "auto", auto: true })}>
            <strong>Automatique (conseillé)</strong>
            <em>Il choisit tout seul la meilleure voix qui marche : la voix du téléphone, la belle voix si elle est téléchargée, puis la voix robot.</em>
          </button>
        </div>
        {ENGINES.map((x) => (
          <div key={x.id} className={cx("voicerow", m.s.engine === x.id && "voicerow--on")}>
            <button type="button" role="radio" aria-checked={m.s.engine === x.id} className="voicerow__pick" onClick={() => update({ engine: x.id, auto: true })}>
              <strong>{x.name}</strong>
              <em>{x.text}</em>
              <span className={cx("voicerow__state", m.eng[x.id] === "ok" && "is-ok", m.eng[x.id] === "ko" && "is-ko")}>
                {m.s.heard[x.id] === true ? "Tu l'entends" : m.s.heard[x.id] === false ? "Tu ne l'entends pas" : label(x.id)}
              </span>
            </button>
            {x.id === "piper" && !m.s.piper ? (
              <button type="button" className="btn btn--gold voicerow__test" disabled={dl !== null} onClick={() => void getPiper()}>
                {dl === null ? "Télécharger" : `${Math.round(dl * 100)} %`}
              </button>
            ) : (
              <button type="button" className="btn btn--soft voicerow__test" onClick={() => test(x.id)}>Tester</button>
            )}
          </div>
        ))}
        <div className={cx("voicerow", !m.s.auto && "voicerow--on")}>
          <button type="button" role="radio" aria-checked={!m.s.auto} className="voicerow__pick" onClick={() => { stopTalking(); update({ auto: false }); }}>
            <strong>Voix coupée</strong>
            <em>Il écrit seulement dans la bulle.</em>
          </button>
        </div>
      </div>
      {dl !== null ? (
        <div className="voicepanel__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(dl * 100)}>
          <span style={{ width: `${Math.round(dl * 100)}%` }} />
        </div>
      ) : null}
      <button type="button" className="btn btn--soft" onClick={() => update({ heard: {} })}>Effacer mes réponses « je t'entends »</button>
      {m.s.piper ? <button type="button" className="btn btn--soft" onClick={() => void dropPiper()}>Supprimer la belle voix (libère 60 Mo)</button> : null}
    </div>
  );
}

