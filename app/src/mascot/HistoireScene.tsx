// Joue une histoire : les personnages se resserrent à l'écran, parlent avec leur voix (la bouche suit le son), puis la carte est gagnée.
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Fig } from "./Fig";
import { CARAC } from "./caractere";
import { HISTOIRES, conditionRemplie, histoire, marquerVue, useVues, type Histoire, type Ligne } from "./histoires";
import { PERSOS } from "./lines";
import { useStore } from "../store";
import { DOCTOR_LOOK, getMascot, speakAs, stopTalking, useMascot, type VoiceKey } from "./state";
import { cx } from "../util";

const nom = (k: string) => (k === "medecin" ? "Le Médecin" : PERSOS.find((p) => p.mode === k)?.name ?? k);
const wait = (ms: number) => new Promise<void>((ok) => window.setTimeout(ok, ms));
const POOL = ["excite", "poli", "pointu", "joueur", "statue"];

/** Le ballon du Jongleur : un ballon normal avec une étoile rouge, pour le reconnaître. */
const BALLE =
  '<svg viewBox="0 0 100 100" width="34" height="34"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#10131c" stroke-width="4"/><path d="M50 30 l17 12 -6 20 h-22 l-6 -20Z" fill="#10131c"/><path d="M50 30 V6 M67 42 L90 34 M61 62 L76 84 M39 62 L24 84 M33 42 L10 34" stroke="#10131c" stroke-width="4"/><path d="M50 40 l3.5 7 7.5 1 -5.5 5.3 1.3 7.5 -6.8 -3.6 -6.8 3.6 1.3 -7.5 -5.5 -5.3 7.5 -1Z" fill="#e0284f"/></svg>';

type Run = { h: Histoire; cast: string[]; map: Record<string, string>; lignes: Ligne[]; premiere: boolean };

function parler(who: string, text: string) {
  return new Promise<void>((ok) => {
    let fini = false;
    const fin = () => { if (!fini) { fini = true; ok(); } };
    if (!getMascot().s.auto) { window.setTimeout(fin, 700 + text.length * 55); return; }
    speakAs(text, who as VoiceKey, fin);
    window.setTimeout(fin, 22000);
  });
}

export function HistoireScene() {
  const m = useMascot();
  const vues = useVues();
  const chest = useStore().chest;
  const [run, setRun] = useState<Run | null>(null);
  const [speaker, setSpeaker] = useState("");
  const [sub, setSub] = useState("");
  const [fin, setFin] = useState(false);
  const [balle, setBalle] = useState("");
  const [sol, setSol] = useState("");
  const token = useRef(0);
  const together = useRef<Record<string, number>>({});
  const lastVersion = useRef<Record<string, number>>({});
  const dernier = useRef(0);

  function demarrer(id: string, prefer: string[], version?: number) {
    const h = histoire(id);
    if (!h || run) return;
    // the witnesses: the characters who are there (otherwise anybody), never the ones the story needs
    const libres = [...prefer, ...POOL].filter((k, i, a) => !h.fixes.includes(k) && k !== "medecin" && k !== "zombie" && !(h.id === "philippe" && k === "philippe") && a.indexOf(k) === i);
    const map: Record<string, string> = {};
    for (let i = 1; i <= h.temoins; i += 1) map[`w${i}`] = libres[(i - 1) % libres.length];
    const cast = [...new Set([...h.fixes, ...Object.values(map)])];
    const premiere = !(vues[id] > 0);
    const n = version ?? ((lastVersion.current[id] ?? -1) + 1 + Math.floor(Math.random() * Math.max(1, h.versions.length - 1))) % h.versions.length;
    lastVersion.current[id] = n;
    const r: Run = { h, cast, map, lignes: h.versions[n], premiere };
    const t = ++token.current;
    setRun(r);
    setFin(false);
    setBalle("");
    setSol("");
    void (async () => {
      await wait(900);
      for (const l of r.lignes) {
        if (token.current !== t) return;
        const who = map[l.who] ?? l.who;
        if (l.balle) setBalle(l.balle);
        if (l.sol) setSol(l.sol);
        setSpeaker(who);
        setSub(l.text);
        await parler(who, l.text);
        await wait(380);
      }
      if (token.current !== t) return;
      setSpeaker("");
      setSub("");
      marquerVue(id);
      setFin(true);
    })();
  }
  function fermer() {
    if (run && !fin) marquerVue(run.h.id); // skipped: it is in the chest anyway, and it will not start again by itself
    token.current += 1;
    stopTalking();
    setRun(null);
    setBalle("");
    setSol("");
    setSpeaker("");
    setSub("");
  }

  // « revoir » from the chest, or the test hook
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; prefer?: string[]; version?: number }>).detail;
      demarrer(d.id, d.prefer ?? [], d.version);
    };
    window.addEventListener("footdex:histoire", on);
    if (location.search.includes("essai-terrain")) (window as unknown as { __histoire?: unknown }).__histoire = (id: string, v?: number) => demarrer(id, [], v);
    return () => window.removeEventListener("footdex:histoire", on);
  });

  // together long enough: the story unlocks by itself
  // (a stable timer: it must not restart each time something is drawn, or it would never fire)
  const latest = useRef({ run, vues, chest, demarrer });
  latest.current = { run, vues, chest, demarrer };
  useEffect(() => {
    const t = window.setInterval(() => {
      const { run, vues, chest, demarrer } = latest.current;
      const s = getMascot();
      const busy = !!document.querySelector(".mm, .wd, .reveal, .majfull, .subst, .thief, .hs");
      if (run || busy || document.hidden || s.s.rest || s.evac !== 0) return;
      const present = [PERSOS[s.s.perso].mode as string, ...s.s.buddies.filter((b) => !s.away.includes(b))];
      for (const h of HISTOIRES) {
        // only the stories whose card was won in the chest; the first time as soon as they have been together a while,
        // then only now and then (at most one every ten minutes, and not every time)
        if (conditionRemplie(h.id, present, chest)) {
          together.current[h.id] = (together.current[h.id] ?? 0) + 2;
          const premiere = !(vues[h.id] > 0);
          const delai = premiere ? 20 : 60;
          if (together.current[h.id] >= delai) {
            together.current[h.id] = 0;
            if (!premiere && (Date.now() - dernier.current < 600000 || Math.random() > 0.3)) continue;
            dernier.current = Date.now();
            demarrer(h.id, present);
            return;
          }
        } else together.current[h.id] = 0;
      }
    }, 2000);
    return () => window.clearInterval(t);
  }, []);

  if (!run) return null;
  const look = (k: string) => (k === "medecin" ? DOCTOR_LOOK : m.s.looks[k] ?? CARAC[k as keyof typeof CARAC].tenue);
  return createPortal(
    <div className="hs" role="dialog" aria-modal="true" aria-label={run.h.titre}>
      <div className="hs__stage">
        {run.cast.map((k, i) => (
          <div key={k} className={cx("hs__who", speaker === k && "is-on", sol === k && "is-sol")} data-who={k} style={{ animationDelay: `${(i * 0.37) % 1}s`, "--from": i % 2 ? "70px" : "-70px" } as CSSProperties}>
            <Fig look={look(k)} size={118} mouth={PERSOS.find((p) => p.mode === k)?.mouth ?? "smile"} talk={speaker === k} cheer={fin} hurt={sol === k ? 1 : 0} wounds={sol === k ? { b: 1, legA: true, legB: false, arm: false } : undefined} />
            {balle === k ? <i className="hs__balle" aria-label="Le ballon marqué du Jongleur" dangerouslySetInnerHTML={{ __html: BALLE }} /> : null}
            {sol === k ? <b className="hs__os" aria-hidden="true">Aïe</b> : null}
            <span>{nom(k)}</span>
          </div>
        ))}
      </div>
      {m.s.bubbles && sub ? <p className="hs__sub">{sub}</p> : null}
      <div className="hs__actions">
        {fin ? (
          <>
            <p className="hs__bravo">{run.premiere ? "Bravo ! Histoire découverte : " : ""}<strong>{run.h.titre}</strong></p>
            <p className="hs__bravo hs__bravo--s">Elle est dans le coffre : tu peux la revoir quand tu veux.</p>
            <button type="button" className="btn btn--gold btn--glow" onClick={fermer}>Fermer</button>
          </>
        ) : (
          <button type="button" className="btn btn--soft" onClick={fermer}>Passer</button>
        )}
      </div>
    </div>,
    document.body,
  );
}
