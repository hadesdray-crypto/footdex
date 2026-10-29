import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuArrowLeft, LuBookMarked, LuBookOpen, LuCalendarDays, LuCompass, LuFilm, LuGlobe, LuGraduationCap, LuHouse, LuLibrary, LuMessageSquareQuote, LuPackageOpen, LuShieldCheck, LuTrophy, LuUserPlus, LuUsers, LuZap, LuMessageCircle, LuSettings, LuShirt, LuVolume2, LuX } from "react-icons/lu";
import type { Album } from "../data";
import { useOverlay } from "../ui/cards";
import { cx, dayKey } from "../util";
import { Fig } from "./Fig";
import { PERSOS } from "./lines";
import { CaracList } from "./Carac";
import { VoicePicker } from "./VoicePicker";
import { ballOpen } from "../sound";
import { piperDownload, piperRemove } from "../piper";
import { SPEEDS, choosePerso, wornLook, hasMore, askToTell, continueSpeech, explain, getMascot, greet, hideBubble, onShake, onThrown, play, readPage, sample, sayLabel, stopTalking, tellStory, testEngine, update, useMascot, warmVoice, ENGINES, androidVoices, installAndroidVoices, isApp, type Engine } from "./state";
import { Wardrobe, type Tab } from "./Wardrobe";
import { go, type Route } from "../router";
import { createActor } from "./actor";
import { ensureBall, parkBall, removeBall, spawnFootballer, whenStolen } from "./player";
import { footballOuting, type Outing } from "./footScenes";
import { runScript } from "./scripts";

const W = 74;
const H = 84;

/** The character: always there, in a corner. Tap for his menu, hold to move him, flick him away (he will not like it). */
export function Mascot({ album, page }: { album: Album; page: string }) {
  const m = useMascot();
  const perso = PERSOS[m.s.perso];
  const [menu, setMenu] = useState<null | "main" | "settings" | "go" | "voix">(null);
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
  const g = useRef({ down: false, mode: "wait" as "wait" | "drag" | "swipe", sx: 0, sy: 0, ox: 0, oy: 0, t0: 0, moved: 0, timer: 0, lastTap: 0, tapTimer: 0, trail: [] as { t: number; x: number; y: number }[] });

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

  // The juggler's ball: ONE ball, his own, resting at his feet. Take it from him and he runs to get it back.
  const feet = (p: { x: number; y: number }) => ({ x: p.x + W / 2, y: p.y + H - 3 });
  useEffect(() => {
    if (perso.mode !== "joueur" || m.s.rest) return;
    const f = feet(posRef.current);
    ensureBall(f.x + 20, f.y);
    whenStolen(() => wander(true));
    return () => {
      whenStolen(null);
      removeBall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perso.mode, m.s.rest]);
  useEffect(() => {
    // while you drag him, his ball stays where it was: he will go and get it when you let go
    if (perso.mode !== "joueur" || roam || drag) return;
    const f = feet(pos);
    parkBall(f.x + 20, f.y);
  }, [perso.mode, pos.x, pos.y, roam, drag]);

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
  function wander(stolen = false) {
    const st = getMascot();
    const a = act.current;
    const fab = fabRef.current;
    if (stolen && fab && !a.busy && PERSOS[st.s.perso].mode === "joueur") return footballer("stolen");
    if (a.busy || !fab || st.busy || st.talking || st.anim || menuRef.current || wardrobeRef.current || document.querySelector(".mm, .wd, .reveal")) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const here = posRef.current;
    const mode = PERSOS[getMascot().s.perso].mode;
    const finish = () => {
      a.busy = false;
      a.cancel = null;
      rootRef.current?.classList.remove("is-behind");
      if (fabRef.current) fabRef.current.style.visibility = "";
      setRoam(null);
    };
    // The juggler always goes out with his ball (player.ts): never without it.
    if (mode === "joueur") return footballer("play");
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

  /** Thrown across the room (any character): real flight with gravity, a fall, a bump, a grumble.
   *  The juggler then goes back for his ball; the others stay where they landed. */
  function throwHim(vx: number, vy: number, from?: { x: number; y: number }) {
    setMenu(null);
    hideBubble();
    const fling = { vx: Math.max(-1500, Math.min(1500, vx * 0.9)), vz: Math.max(320, Math.min(1300, -vy * 0.9)), vy: vy > 0 ? Math.min(500, vy * 0.25) : 0 };
    const strong = Math.hypot(vx, vy) > 1600;
    if (perso.mode === "joueur") return footballer("thrown", from, fling, strong);
    const a = act.current;
    const fab = fabRef.current;
    if (!fab) return;
    act.current.cancel?.();
    a.busy = true;
    const home = feet(from ?? posRef.current);
    fab.style.visibility = "hidden";
    const body = spawnFootballer(getMascot().s.look, home.x, home.y, { onTap: () => undefined, onMove: () => undefined });
    const land = () => {
      const x = body.x;
      const y = body.y;
      body.destroy();
      // he stays where he fell
      update({ fx: Math.min(1, Math.max(0, (x - W / 2 - area.l) / Math.max(1, area.r - area.l))), fy: Math.min(1, Math.max(0, (y - H + 3 - area.t) / Math.max(1, area.b - area.t))) });
      a.busy = false;
      a.cancel = null;
      if (fabRef.current) fabRef.current.style.visibility = "";
      onThrown(strong);
    };
    a.cancel = () => {
      if (!body.dead) land();
    };
    void body.fling(fling.vx, fling.vz, fling.vy).then(() => {
      if (!body.dead) land();
    });
  }

  /** The juggler goes out with his ball, plays, and comes back to his corner. */
  function footballer(why: Outing, at?: { x: number; y: number }, fling?: { vx: number; vz: number; vy: number }, strong = false) {
    const a = act.current;
    const fab = fabRef.current;
    if (!fab) return;
    a.busy = true;
    const here = at ?? posRef.current;
    const home = feet(here);
    fab.style.visibility = "hidden";
    const player = spawnFootballer(getMascot().s.look, home.x, home.y, {
      onTap: () => {
        a.cancel?.();
        window.setTimeout(() => setMenu("main"), 30);
      },
      onMove: () => undefined,
    });
    const finish = () => {
      a.busy = false;
      a.cancel = null;
      if (fabRef.current) fabRef.current.style.visibility = "";
      setRoam(null);
    };
    a.cancel = () => {
      player.destroy();
      finish();
    };
    footballOuting(player, home, why, fling)
      .catch(() => undefined)
      .finally(() => {
        if (player.dead) return;
        player.destroy();
        finish();
        // back home after being thrown: a bump on the head, and he lets you know
        if (why === "thrown") onThrown(strong);
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
    s.trail = [{ t: s.t0, x: e.clientX, y: e.clientY }];
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
    const now = performance.now();
    s.trail.push({ t: now, x: e.clientX, y: e.clientY });
    s.trail = s.trail.filter((p) => now - p.t < 110);
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
    // how fast the finger was going when it let go (px per second)
    const tr = s.trail;
    const first = tr[0];
    const lastP = tr[tr.length - 1];
    const span = first && lastP ? Math.max(16, lastP.t - first.t) : 1000;
    const rvx = first && lastP && performance.now() - lastP.t < 90 ? ((lastP.x - first.x) / span) * 1000 : 0;
    const rvy = first && lastP && performance.now() - lastP.t < 90 ? ((lastP.y - first.y) / span) * 1000 : 0;
    if (s.mode === "drag" && Math.hypot(rvx, rvy) > 700) {
      // held, then flung across the room: he flies for real
      const x = drag?.x ?? pos.x;
      const y = drag?.y ?? pos.y;
      setDrag(null);
      setDragging(false);
      throwHim(rvx, rvy, { x, y });
    } else if (s.mode === "drag") {
      const x = drag?.x ?? pos.x;
      const y = drag?.y ?? pos.y;
      // the juggler was moved without his ball: he goes back for it (spawned first, so the ball does not jump to him)
      if (perso.mode === "joueur" && Math.hypot(x - s.ox, y - s.oy) > 30) footballer("moved", { x, y });
      update({ fx: (x - area.l) / Math.max(1, area.r - area.l), fy: (y - area.t) / Math.max(1, area.b - area.t) });
      setDrag(null);
      setDragging(false);
    } else if (s.mode === "swipe") {
      const len = Math.hypot(dx, dy);
      if (len > 45 && len / dt > 0.5) {
        // every character is thrown for real: he flies with gravity, falls, gets a bump and grumbles
        const k = 1000 / dt;
        throwHim(Math.abs(rvx) + Math.abs(rvy) > 300 ? rvx : dx * k, Math.abs(rvx) + Math.abs(rvy) > 300 ? rvy : dy * k);
      } else if (false) {
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
        // double tap: opens his menu (like in the other apps); if he was telling a story, he goes on
        if (hasMore()) continueSpeech();
        else {
          stopTalking();
          setMenu("main");
        }
      } else {
        s.lastTap = now;
        s.tapTimer = window.setTimeout(() => {
          stopTalking();
          setMenu((v: null | "main" | "settings" | "go" | "voix") => (v ? null : "main"));
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
              setMenu((v: null | "main" | "settings" | "go" | "voix") => (v ? null : "main"));
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

function Menu({ view, setView, album, page, openWardrobe }: { view: "main" | "settings" | "go" | "voix"; setView: (v: null | "main" | "settings" | "go" | "voix") => void; album: Album; page: string; openWardrobe: (tab: Tab) => void }) {
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
            <strong>{view === "settings" ? "Réglages" : view === "go" ? "Aller quelque part" : view === "voix" ? "Change ma voix !" : perso.name}</strong>
            <span>{view === "settings" ? "Voix et caractère" : view === "go" ? "Touche où tu veux aller" : view === "voix" ? "Une voix pour chaque personnage" : perso.tag}</span>
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
            <button type="button" className="mm__tile mm__tile--voix" onClick={() => setView("voix")}>
              <LuMessageCircle aria-hidden="true" /> <span>Change ma voix !</span>
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
        ) : view === "voix" ? (
          <VoicePicker compact />
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
            <button type="button" className="btn btn--gold" onClick={() => setView("voix")}>Change ma voix !</button>
            <button type="button" className="btn btn--soft" onClick={() => { close(); go({ page: "reglages" }); }}>Réglages avancés de la voix (code parent)</button>
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
export function VoicePanel() {
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
      {isApp() ? <AndroidVoices /> : null}
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


/** In the Android app: the French voices of the phone, to pick the nicest. */
function AndroidVoices() {
  const m = useMascot();
  const [list, setList] = useState<{ index: number; name: string; local: boolean }[] | null>(null);
  useEffect(() => {
    void androidVoices().then(setList);
  }, []);
  const pickV = (i: number) => {
    update({ nativeVoice: i, engine: "native", auto: true });
    window.setTimeout(sample, 60);
  };
  return (
    <div className="voicepanel__android">
      <p className="mm__label">Les voix françaises du téléphone</p>
      <p className="mm__note">Touche une voix pour l'écouter : il gardera celle que tu choisis.</p>
      <div className="chips">
        <button type="button" className={cx("chip", m.s.nativeVoice < 0 && "chip--on")} onClick={() => pickV(-1)}>Celle du téléphone</button>
        {(list ?? []).map((v, k) => (
          <button key={v.index} type="button" className={cx("chip", m.s.nativeVoice === v.index && "chip--on")} onClick={() => pickV(v.index)}>
            Voix {k + 1}{v.local ? "" : " (Internet)"}
          </button>
        ))}
      </div>
      {list && !list.length ? <p className="mm__note">Une seule voix française sur ce téléphone.</p> : null}
      <button type="button" className="btn btn--soft" onClick={installAndroidVoices}>Installer de plus belles voix</button>
      <p className="mm__note">Conseil : dans les réglages d'Android, « Synthèse vocale », choisis le moteur Google et télécharge la voix française haute qualité.</p>
    </div>
  );
}
