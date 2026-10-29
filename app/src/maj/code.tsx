// The parents' code: 6666 at first (the parent can change it with « Code oublié ? »). It guards the advanced settings, the screen time and the internet options.
// The child can still change his character, his costume and his voice (higher or lower) without it.
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { storageGet, storageSet } from "../util";

const CLE = "footdex.parents.code2"; // a new key: everybody starts again from 6666
const DEFAUT = "6666";
const hash = (s: string) => {
  let h = 2166136261;
  for (const c of `footdex:${s}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
};
export const codeChoisi = () => true;
export const bonCode = (c: string) => (storageGet(CLE) || hash(DEFAUT)) === hash(c.trim());
let ouvertJusqua = 0; // once typed, the code stays open for 10 minutes
export const dejaOuvert = () => Date.now() < ouvertJusqua;
const abonnes = new Set<() => void>();
const ouvrir = () => {
  ouvertJusqua = Date.now() + 10 * 60 * 1000;
  abonnes.forEach((f) => f());
};

/** Shows `children` only after the parents' code. The first time, the parent chooses it. */
export function CodeParent({ children, titre = "Pour les grands" }: { children: ReactNode; titre?: string }) {
  const [ok, setOk] = useState(dejaOuvert());
  // one code opens every locked part of the screen at once
  useEffect(() => {
    const f = () => setOk(dejaOuvert());
    abonnes.add(f);
    return () => void abonnes.delete(f);
  }, []);
  if (ok) return <>{children}</>;
  return <SaisieCode titre={titre} onOk={() => setOk(true)} />;
}

export function SaisieCode({ titre, onOk }: { titre: string; onOk: () => void }) {
  const premier = !codeChoisi();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [msg, setMsg] = useState("");
  const [oubli, setOubli] = useState(false);
  const [rep, setRep] = useState("");
  const [x, y] = useMemo(() => [23 + Math.floor(Math.random() * 40), 17 + Math.floor(Math.random() * 30)], []);
  const chiffres = (v: string) => v.replace(/\D/g, "").slice(0, 4);
  function valider() {
    if (premier || oubli) {
      if (a.length !== 4) return setMsg("Le code doit avoir 4 chiffres.");
      if (a !== b) return setMsg("Les deux codes ne sont pas pareils.");
      storageSet(CLE, hash(a));
      ouvrir();
      return onOk();
    }
    if (bonCode(a)) {
      ouvrir();
      return onOk();
    }
    setMsg("Ce n'est pas le bon code.");
    setA("");
  }
  return (
    <div className="pcode">
      <p className="pcode__title">🔒 {titre}</p>
      {oubli && rep.trim().replace(/\s/g, "") !== String(x * y) ? (
        <>
          <p className="note">Code oublié ? Pour un adulte : combien font {x} × {y} ?</p>
          <input className="pcode__in" inputMode="numeric" value={rep} onChange={(e: { target: { value: string } }) => setRep(e.target.value)} />
        </>
      ) : (
        <>
          <p className="note">{premier ? "Choisis un code parent de 4 chiffres (garde-le pour toi)." : oubli ? "Choisis un nouveau code de 4 chiffres." : "Code parent :"}</p>
          <input className="pcode__in" inputMode="numeric" type="password" autoComplete="off" value={a} placeholder="••••" onChange={(e: { target: { value: string } }) => { setA(chiffres(e.target.value)); setMsg(""); }} />
          {premier || oubli ? <input className="pcode__in" inputMode="numeric" type="password" autoComplete="off" value={b} placeholder="Encore une fois" onChange={(e: { target: { value: string } }) => { setB(chiffres(e.target.value)); setMsg(""); }} /> : null}
          <button type="button" className="btn btn--gold" disabled={a.length !== 4} onClick={valider}>{premier || oubli ? "Enregistrer le code" : "Ouvrir"}</button>
          {msg ? <p className="pcode__msg" role="alert">{msg}</p> : null}
          {!premier && !oubli ? <button type="button" className="btn btn--ghost btn--small" onClick={() => setOubli(true)}>Code oublié ?</button> : null}
        </>
      )}
    </div>
  );
}
