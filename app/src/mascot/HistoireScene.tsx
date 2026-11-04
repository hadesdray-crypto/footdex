// Joue une histoire : les personnages se resserrent à l'écran, parlent avec leur voix (la bouche suit le son), puis la carte est gagnée.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Fig } from "./Fig";
import { CARAC } from "./caractere";
import { HISTOIRES, conditionRemplie, histoire, marquerVue, useVues, type Histoire, type Ligne } from "./histoires";
import { PERSOS } from "./lines";
import { DOCTOR_LOOK, getMascot, speakAs, stopTalking, useMascot, type VoiceKey } from "./state";
import { cx } from "../util";

const nom = (k: string) => (k === "medecin" ? "Le Médecin" : PERSOS.find((p) => p.mode === k)?.name ?? k);
const wait = (ms: number) => new Promise<void>((ok) => window.setTimeout(ok, ms));
const POOL = ["excite", "poli", "pointu", "joueur", "statue"];

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
  const [run, setRun] = useState<Run | null>(null);
  const [speaker, setSpeaker] = useState("");
  const [sub, setSub] = useState("");
  const [fin, setFin] = useState(false);
  const token = useRef(0);
  const together = useRef<Record<string, number>>({});
  const lastVersion = useRef<Record<string, number>>({});

  function demarrer(id: string, prefer: string[], version?: number) {
    const h = histoire(id);
    if (!h || run) return;
    // the witnesses: the characters who are there (otherwise anybody), never the ones the story needs
    const libres = [...prefer, ...POOL].filter((k, i, a) => !h.fixes.includes(k) && k !== "medecin" && k !== "zombie" && a.indexOf(k) === i);
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
    void (async () => {
      await wait(900);
      for (const l of r.lignes) {
        if (token.current !== t) return;
        const who = map[l.who] ?? l.who;
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
    token.current += 1;
    stopTalking();
    setRun(null);
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
  useEffect(() => {
    const t = window.setInterval(() => {
      const s = getMascot();
      const busy = !!document.querySelector(".mm, .wd, .reveal, .majfull, .subst, .thief, .hs");
      if (run || busy || document.hidden || s.s.rest || s.evac !== 0) return;
      const present = [PERSOS[s.s.perso].mode as string, ...s.s.buddies.filter((b) => !s.away.includes(b))];
      for (const h of HISTOIRES) {
        if ((vues[h.id] ?? 0) > 0) continue;
        if (conditionRemplie(h.id, present)) {
          together.current[h.id] = (together.current[h.id] ?? 0) + 2;
          if (together.current[h.id] >= 20) { together.current[h.id] = 0; demarrer(h.id, present); return; }
        } else together.current[h.id] = 0;
      }
    }, 2000);
    return () => window.clearInterval(t);
  });

  if (!run) return null;
  const look = (k: string) => (k === "medecin" ? DOCTOR_LOOK : m.s.looks[k] ?? CARAC[k as keyof typeof CARAC].tenue);
  return createPortal(
    <div className="hs" role="dialog" aria-modal="true" aria-label={run.h.titre}>
      <div className="hs__stage">
        {run.cast.map((k) => (
          <div key={k} className={cx("hs__who", speaker === k && "is-on")} data-who={k}>
            <Fig look={look(k)} size={118} mouth={PERSOS.find((p) => p.mode === k)?.mouth ?? "smile"} talk={speaker === k} />
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
