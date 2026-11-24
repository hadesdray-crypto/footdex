// « Les gestes de Philippe » : le personnage montre lui-même les gestes du football, étape par étape, sans Internet.
// Chaque geste est une suite de poses ; on passe de l'une à l'autre en douceur. Philippe explique chaque étape.
import { useEffect, useRef, useState } from "react";
import { LuGauge, LuPlay, LuSquare } from "react-icons/lu";
import { runnerSvg } from "../mascot/runner";
import { say, useMascot, wornLook } from "../mascot/state";
import { cx } from "../util";
import { Ball } from "./pack";

type Vue = "front" | "side" | "sideL" | "back";
type Pose = {
  texte: string;
  vue: Vue;
  jx?: number; // où est le joueur (px depuis le milieu)
  bx?: number; // où est le ballon
  by?: number; // hauteur du ballon
  dx?: number; // où est le défenseur (plot)
  lgA?: string; // la jambe de devant
  lgB?: string; // la jambe de derrière
  up?: string; // le haut du corps
  arA?: string;
  arB?: string;
  tourne?: boolean; // le ballon tourne sur lui-même
  courbe?: boolean; // la trajectoire courbe est dessinée
};
type Geste = { id: string; nom: string; but?: boolean; def?: boolean; poses: Pose[] };

export const GESTES_PHILIPPE: Geste[] = [
  {
    id: "passement",
    nom: "Le passement de jambes",
    poses: [
      { vue: "front", texte: "Le ballon est devant tes pieds. Tu avances doucement." },
      { vue: "front", lgA: "rotate(48deg) translateY(-16px)", up: "rotate(-8deg)", texte: "Une jambe passe par-dessus le ballon, de l'intérieur vers l'extérieur, sans le toucher." },
      { vue: "front", jx: -14, up: "rotate(-12deg)", arB: "rotate(-30deg)", texte: "Ton corps penche du même côté. Le défenseur croit que tu pars par là." },
      { vue: "front", jx: -6, bx: 70, lgB: "rotate(-32deg)", up: "rotate(8deg)", arA: "rotate(30deg)", texte: "Et hop ! Avec l'extérieur de l'autre pied, tu pousses le ballon de l'autre côté." },
      { vue: "front", jx: 70, bx: 120, texte: "Tu accélères. Tu es passé !" },
    ],
  },
  {
    id: "crochet",
    nom: "Le crochet",
    def: true,
    poses: [
      { vue: "side", jx: -110, bx: -70, dx: 120, texte: "Tu cours avec le ballon, vers le défenseur." },
      { vue: "side", jx: -20, bx: 22, dx: 90, lgA: "rotate(-24deg)", lgB: "rotate(20deg)", texte: "Tu le pousses encore un peu devant toi." },
      { vue: "side", jx: 0, bx: 30, dx: 80, lgA: "rotate(-38deg)", up: "rotate(-6deg)", texte: "Tu poses l'intérieur du pied devant le ballon, pour l'arrêter net." },
      { vue: "sideL", jx: 4, bx: -14, dx: 140, lgA: "rotate(-30deg)", texte: "Tu le tires de l'autre côté et tu te retournes d'un coup." },
      { vue: "sideL", jx: -100, bx: -140, dx: 160, texte: "Tu repars dans l'autre sens. Le défenseur est parti trop loin !" },
    ],
  },
  {
    id: "feinte",
    nom: "La feinte de corps",
    poses: [
      { vue: "front", texte: "Tu arrives face au défenseur, le ballon dans les pieds." },
      { vue: "front", jx: -16, lgA: "rotate(22deg)", up: "rotate(-16deg)", arB: "rotate(-40deg)", texte: "Tu fais semblant de partir d'un côté : tes épaules et ton corps penchent fort." },
      { vue: "front", jx: -10, up: "rotate(-10deg)", texte: "Le défenseur y croit et part du même côté. Le ballon, lui, n'a pas bougé." },
      { vue: "front", jx: 0, bx: 60, lgB: "rotate(-30deg)", up: "rotate(10deg)", arA: "rotate(36deg)", texte: "Vite ! Tu pousses le ballon de l'autre côté." },
      { vue: "front", jx: 80, bx: 125, texte: "Et tu files ! Plus le défenseur y a cru, plus tu as de place." },
    ],
  },
  {
    id: "roulette",
    nom: "La roulette",
    poses: [
      { vue: "front", texte: "Le ballon est devant tes pieds." },
      { vue: "front", bx: 10, lgB: "rotate(-10deg) translateY(-12px)", texte: "Tu poses la semelle d'un pied sur le ballon." },
      { vue: "side", jx: -6, bx: -16, lgA: "rotate(-20deg) translateY(-8px)", texte: "Tu fais rouler le ballon vers toi en commençant à tourner." },
      { vue: "back", jx: -16, bx: -30, lgB: "rotate(10deg) translateY(-10px)", texte: "Te voilà de dos. L'autre pied se pose à son tour sur le ballon." },
      { vue: "sideL", jx: -40, bx: -66, lgA: "rotate(-24deg)", texte: "Il fait rouler le ballon encore plus loin. Tu finis ton tour complet." },
      { vue: "sideL", jx: -110, bx: -145, texte: "Et tu repars avec le ballon. C'était le geste préféré de Zidane !" },
    ],
  },
  {
    id: "frappe",
    nom: "La frappe du cou-de-pied",
    but: true,
    poses: [
      { vue: "side", jx: -125, bx: -50, texte: "Prends un peu d'élan, quelques pas en arrière." },
      { vue: "side", jx: -72, bx: -50, lgA: "rotate(-22deg)", lgB: "rotate(18deg)", texte: "Pose le pied d'appui juste à côté du ballon, pointé vers le but." },
      { vue: "side", jx: -72, bx: -50, lgA: "rotate(60deg)", up: "rotate(-6deg)", arB: "rotate(-50deg)", texte: "Arme ta jambe : elle part loin en arrière." },
      { vue: "side", jx: -68, bx: 60, by: 50, lgA: "rotate(-55deg)", up: "rotate(4deg)", arA: "rotate(-40deg)", texte: "Frappe le milieu du ballon avec le dessus du pied, là où il y a les lacets." },
      { vue: "side", jx: -60, bx: 150, by: 30, lgA: "rotate(-30deg)", texte: "Ta jambe continue son mouvement. Et but !" },
    ],
  },
  {
    id: "enroulee",
    nom: "La frappe enroulée",
    but: true,
    poses: [
      { vue: "side", jx: -125, bx: -50, texte: "Prends ton élan un peu en biais." },
      { vue: "side", jx: -78, bx: -50, lgA: "rotate(-22deg)", lgB: "rotate(18deg)", texte: "Pose ton pied d'appui un peu plus loin du ballon que pour une frappe normale." },
      { vue: "side", jx: -78, bx: -50, lgA: "rotate(55deg)", up: "rotate(-8deg)", arB: "rotate(-50deg)", texte: "Arme ta jambe." },
      { vue: "side", jx: -74, bx: 30, by: 80, lgA: "rotate(-50deg)", arA: "rotate(-40deg)", tourne: true, courbe: true, texte: "Frappe le côté du ballon avec l'intérieur du pied. Le ballon se met à tourner sur lui-même." },
      { vue: "side", jx: -66, bx: 150, by: 34, lgA: "rotate(-28deg)", tourne: true, courbe: true, texte: "En tournant, il fait une courbe… et rentre dans le but !" },
    ],
  },
];

const PAUSE_LENT = 700; // un peu de temps après chaque phrase

function Scene({ g, i, tr }: { g: Geste; i: number; tr: number }) {
  const m = useMascot();
  const look = m.s.look && wornLook();
  const p = g.poses[Math.max(0, i)];
  const vars = {
    "--tr": `${tr}ms`,
    "--jx": `${p.jx ?? 0}px`,
    "--bx": `${p.bx ?? 0}px`,
    "--by": `${-(p.by ?? 0)}px`,
    "--dx": `${p.dx ?? 120}px`,
    "--lgA": p.lgA ?? "none",
    "--lgB": p.lgB ?? "none",
    "--up": p.up ?? "none",
    "--arA": p.arA ?? "none",
    "--arB": p.arB ?? "none",
  } as Record<string, string>;
  const vue = p.vue === "sideL" ? "side" : p.vue;
  return (
    <div className={cx("ges", `ges--${g.id}`, p.vue === "sideL" && "ges--gauche", p.tourne && "ges--tourne", p.courbe && "ges--courbe")} style={vars} aria-hidden="true">
      <div className="ges__sol" />
      {g.but ? <div className="ges__but" /> : null}
      {g.but ? (
        <svg className="ges__trace" viewBox="0 0 200 100" preserveAspectRatio="none">
          <path d="M5 92 Q 90 -30 190 55" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="5 6" />
        </svg>
      ) : null}
      {g.def ? <div className="ges__def" /> : null}
      <div className="ges__joueur">
        {look ? (["front", "side", "back"] as const).map((v) => (
          <div key={v} className={cx("ges__v", vue === v && "is-on")} dangerouslySetInnerHTML={{ __html: runnerSvg(look, v) }} />
        )) : null}
      </div>
      <div className="ges__balle"><Ball /></div>
    </div>
  );
}

function UnGeste({ g, actif, onActif }: { g: Geste; actif: boolean; onActif: (on: boolean) => void }) {
  const [i, setI] = useState(-1);
  const [mode, setMode] = useState<"" | "lent" | "vite">("");
  const timers = useRef<number[]>([]);
  const stop = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setMode("");
    setI(-1);
  };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  useEffect(() => {
    if (!actif && mode) stop();
  }, [actif]);

  function lent() {
    if (mode) return stop();
    onActif(true);
    setMode("lent");
    let t = 0;
    timers.current.push(window.setTimeout(() => say(`${g.nom}. Regarde bien !`), 0));
    t += 1800;
    g.poses.forEach((p, k) => {
      timers.current.push(window.setTimeout(() => { setI(k); say(p.texte); }, t));
      t += Math.max(2600, p.texte.length * 68) + PAUSE_LENT;
    });
    timers.current.push(window.setTimeout(() => { setMode(""); setI(-1); }, t + 800));
  }

  function vite() {
    if (mode) return stop();
    onActif(true);
    setMode("vite");
    let t = 0;
    for (let tour = 0; tour < 3; tour++) {
      g.poses.forEach((_, k) => {
        timers.current.push(window.setTimeout(() => setI(k), t));
        t += k === 0 ? 650 : 420;
      });
      t += 500;
    }
    timers.current.push(window.setTimeout(() => { setMode(""); setI(-1); }, t));
  }

  return (
    <article className={cx("geste", mode && "is-joue")}>
      <h3>{g.nom}</h3>
      <Scene g={g} i={i} tr={mode === "vite" ? 330 : 650} />
      <ol className="geste__etapes">
        {g.poses.map((p, k) => (
          <li key={k} className={cx(i === k && mode !== "vite" && "is-on", mode === "lent" && i > k && "is-vu")}>
            <button type="button" className="geste__etape" onClick={() => { if (mode) stop(); onActif(true); setI(k); say(p.texte); }}>{p.texte}</button>
          </li>
        ))}
      </ol>
      <div className="geste__boutons">
        <button type="button" className={cx("btn", mode === "lent" ? "btn--soft" : "btn--gold")} onClick={lent}>
          {mode === "lent" ? <><LuSquare aria-hidden="true" /> Arrêter</> : <><LuPlay aria-hidden="true" /> Regarder avec Philippe</>}
        </button>
        <button type="button" className="btn btn--soft" onClick={vite}>
          {mode === "vite" ? <><LuSquare aria-hidden="true" /> Arrêter</> : <><LuGauge aria-hidden="true" /> En vraie vitesse</>}
        </button>
      </div>
    </article>
  );
}

/** Tous les gestes, l'un après l'autre. Un seul joue à la fois. */
export function GestesPhilippe() {
  const [actif, setActif] = useState("");
  return (
    <section className="gestes">
      <h2>Les gestes de Philippe</h2>
      <p className="note">Pas besoin d'Internet : ton personnage te montre lui-même chaque geste, étape par étape. Ensuite, essaie dehors avec un ballon !</p>
      <div className="gestes__liste">
        {GESTES_PHILIPPE.map((g) => (
          <UnGeste key={g.id} g={g} actif={actif === g.id} onActif={(on) => setActif(on ? g.id : "")} />
        ))}
      </div>
    </section>
  );
}
