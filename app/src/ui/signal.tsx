import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuCircleCheck, LuCopy, LuFlag, LuSend, LuX } from "react-icons/lu";
import { cx, storageGet, storageSet } from "../util";

type Kind = "erreur" | "info" | "idee";
const KINDS: { id: Kind; label: string; hint: string }[] = [
  { id: "erreur", label: "Une erreur", hint: "Qu'est-ce qui n'est pas juste ? Qu'est-ce qui devrait être écrit ?" },
  { id: "info", label: "Une info à ajouter", hint: "Qu'est-ce qui a changé ou qui manque ? (club, résultat, record…)" },
  { id: "idee", label: "Une idée", hint: "Qu'est-ce qui rendrait l'almanach encore mieux ?" },
];
const DAILY = 5;
const DAY_KEY = "footdex.signal.jour";

type Db = { doc(path: string): { set(data: Record<string, unknown>): Promise<void> } };

function where(): string {
  const hash = window.location.hash.replace(/^#\/?/, "") || "accueil";
  return hash.slice(0, 80);
}

function sentToday(): number {
  try {
    const [day, n] = (storageGet(DAY_KEY) ?? "").split(":");
    return day === new Date().toISOString().slice(0, 10) ? Number(n) || 0 : 0;
  } catch {
    return 0;
  }
}

/** The flag in the top bar and its sheet: lets anyone report a mistake or suggest news. Independent of every page. */
export function Signal() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("erreur");
  const [text, setText] = useState("");
  const [src, setSrc] = useState("");
  const [page, setPage] = useState("");
  const [state, setState] = useState<"edit" | "sending" | "sent" | "copy" | "limit">("edit");
  const area = useRef<HTMLTextAreaElement>(null);

  function show() {
    setPage(where());
    setState(sentToday() >= DAILY ? "limit" : "edit");
    setOpen(true);
  }
  function close() {
    setOpen(false);
    if (state === "sent" || state === "copy") {
      setText("");
      setSrc("");
    }
  }
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("noscroll");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => area.current?.focus(), 120);
    return () => {
      document.body.classList.remove("noscroll");
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  });

  const message = text.trim();
  const full = `[${KINDS.find((k) => k.id === kind)?.label}] Page : ${page}\n${message}${src.trim() ? `\nSource : ${src.trim()}` : ""}`;

  async function send() {
    if (message.length < 4 || state === "sending") return;
    setState("sending");
    try {
      const claude = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
      const db = claude?.use ? ((await claude.use("db")) as Db | null) : null;
      if (!db) {
        setState("copy");
        return;
      }
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
      await db.doc(`signalements/${id}`).set({
        type: kind,
        page,
        message: message.slice(0, 700),
        source: src.trim().slice(0, 240),
        at: new Date().toISOString(),
        statut: "nouveau",
      });
      const today = new Date().toISOString().slice(0, 10);
      storageSet(DAY_KEY, `${today}:${sentToday() + 1}`);
      setState("sent");
    } catch {
      setState("copy");
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
    } catch {
      area.current?.select();
    }
  }

  return (
    <>
      <button type="button" className="iconbtn topbar__flag" onClick={show} aria-label="Signaler une erreur ou proposer une info" title="Signaler / proposer">
        <LuFlag aria-hidden="true" />
      </button>
      {open ? createPortal(
        <div className="signal" role="dialog" aria-modal="true" aria-labelledby="signal-title">
          <button type="button" className="signal__backdrop" aria-label="Fermer" onClick={close} />
          <div className="signal__sheet">
            <span className="signal__grip" aria-hidden="true" />
            <div className="signal__head">
              <h2 id="signal-title" className="signal__title">Signaler / proposer</h2>
              <button type="button" className="iconbtn" onClick={close} aria-label="Fermer">
                <LuX aria-hidden="true" />
              </button>
            </div>
            {state === "sent" ? (
              <div className="signal__done">
                <LuCircleCheck aria-hidden="true" />
                <p className="signal__big">Merci !</p>
                <p>Ton message est bien arrivé. Il sera relu avant d'être ajouté à l'almanach.</p>
                <button type="button" className="btn btn--gold" onClick={close}>Fermer</button>
              </div>
            ) : state === "limit" ? (
              <div className="signal__done">
                <p className="signal__big">Déjà {DAILY} messages aujourd'hui</p>
                <p>Merci pour ton aide ! Reviens demain pour en envoyer d'autres.</p>
                <button type="button" className="btn btn--soft" onClick={close}>Fermer</button>
              </div>
            ) : (
              <>
                <div className="chips" role="group" aria-label="Type de message">
                  {KINDS.map((k) => (
                    <button key={k.id} type="button" className={cx("chip", kind === k.id && "chip--on")} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
                      {k.label}
                    </button>
                  ))}
                </div>
                <p className="signal__where">Page concernée : <strong>{page}</strong></p>
                <label className="signal__field">
                  <span>{KINDS.find((k) => k.id === kind)?.hint}</span>
                  <textarea ref={area} rows={4} maxLength={700} value={text} onChange={(e: { target: { value: string } }) => setText(e.target.value)} placeholder="Écris ici…" />
                </label>
                <label className="signal__field">
                  <span>Source ou lien (facultatif)</span>
                  <input type="text" maxLength={240} value={src} onChange={(e: { target: { value: string } }) => setSrc(e.target.value)} placeholder="Un article, un site…" />
                </label>
                {state === "copy" ? (
                  <p className="signal__note">L'envoi direct n'est pas possible ici. Copie ton message et envoie-le à la personne qui t'a donné l'appli.</p>
                ) : null}
                {state === "copy" ? (
                  <button type="button" className="btn btn--gold" onClick={copy}>
                    <LuCopy aria-hidden="true" /> Copier le message
                  </button>
                ) : (
                  <button type="button" className="btn btn--gold" disabled={message.length < 4 || state === "sending"} onClick={send}>
                    <LuSend aria-hidden="true" /> {state === "sending" ? "Envoi…" : "Envoyer"}
                  </button>
                )}
                <p className="signal__note">Aucun nom ni adresse e-mail n'est demandé.</p>
              </>
            )}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
