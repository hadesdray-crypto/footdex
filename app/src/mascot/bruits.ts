// « Mes bruitages » : each character can have his own noises, recorded with the phone's microphone,
// one for each moment (26 moments: thrown, landing, the ball in the face, a rare card, a game won, the zombie's
// head, the cat…). When one is recorded, it is played exactly at that moment instead of the spoken words;
// otherwise the character speaks as usual (and the zombie growls with a sound made by the app).
// The recordings live in the phone's IndexedDB (much more room than localStorage), ready to play at once.
import { useSyncExternalStore } from "react";
import { storageGet } from "../util";
import { growl } from "../sound";

export type Slot =
  | "bonjour" | "lance" | "atterrit" | "aie" | "ballon" | "peur" | "joie" | "bruit" | "dodo" | "reveil"
  | "victoire" | "defaite" | "carte" | "carte_rare" | "coffre" | "ola" | "carton" | "soigne" | "merci"
  | "eternue" | "tete" | "beurk" | "chat" | "rire" | "toux" | "passe";
export type SlotInfo = { id: Slot; label: string; icon: string; hint: string; group: string };
export const SLOTS: SlotInfo[] = [
  { id: "bonjour", label: "Bonjour", icon: "👋", hint: "Quand tu le touches, quand il arrive", group: "Avec toi" },
  { id: "lance", label: "Waaah ! (lancé)", icon: "🚀", hint: "Au moment où tu le lances", group: "Avec toi" },
  { id: "atterrit", label: "Atterrissage", icon: "🛬", hint: "Quand il retombe par terre", group: "Avec toi" },
  { id: "aie", label: "Aïe !", icon: "🤕", hint: "Quand il tombe ou se cogne", group: "Avec toi" },
  { id: "ballon", label: "Ballon dans la figure", icon: "⚽", hint: "Quand le ballon le touche", group: "Avec toi" },
  { id: "dodo", label: "Il ronfle", icon: "😴", hint: "Quand il s'endort", group: "Avec toi" },
  { id: "reveil", label: "Réveil en sursaut", icon: "⏰", hint: "Quand tu le réveilles", group: "Avec toi" },
  { id: "bruit", label: "Son bruit à lui", icon: "🎵", hint: "Son petit bruit, de temps en temps", group: "Avec toi" },
  { id: "victoire", label: "Victoire !", icon: "🏆", hint: "Quand tu gagnes un jeu", group: "Jeux et cartes" },
  { id: "defaite", label: "Oh non, perdu…", icon: "😢", hint: "Quand tu perds un jeu", group: "Jeux et cartes" },
  { id: "carte", label: "Nouvelle carte", icon: "🃏", hint: "Quand une carte sort d'un paquet", group: "Jeux et cartes" },
  { id: "carte_rare", label: "Carte de ouf !", icon: "🌟", hint: "Quand une carte très rare sort", group: "Jeux et cartes" },
  { id: "coffre", label: "Le coffre s'ouvre", icon: "🧰", hint: "Quand tu ouvres le coffre au trésor", group: "Jeux et cartes" },
  { id: "ola", label: "La ola", icon: "🙌", hint: "Quand tout le monde fait la ola", group: "Jeux et cartes" },
  { id: "peur", label: "Cri de peur", icon: "😱", hint: "Quand le zombie s'approche", group: "Avec les copains" },
  { id: "joie", label: "Rire de joie", icon: "😂", hint: "Quand il est content", group: "Avec les copains" },
  { id: "rire", label: "Il se moque", icon: "🤭", hint: "Quand le zombie a peur du chat", group: "Avec les copains" },
  { id: "beurk", label: "Beurk !", icon: "🤢", hint: "Quand la tête du zombie roule", group: "Avec les copains" },
  { id: "carton", label: "Carton !", icon: "🟨", hint: "Quand l'arbitre sort un carton", group: "Avec les copains" },
  { id: "soigne", label: "Le docteur arrive", icon: "🩺", hint: "Quand le médecin vient soigner", group: "Avec les copains" },
  { id: "merci", label: "Merci !", icon: "🙏", hint: "Quand il est soigné ou réparé", group: "Avec les copains" },
  { id: "toux", label: "Dites 33 (kof kof)", icon: "🤧", hint: "Au check-up du médecin", group: "Avec les copains" },
  { id: "passe", label: "Passe !", icon: "🦶", hint: "Quand il demande le ballon", group: "Avec les copains" },
  { id: "chat", label: "Un chat !", icon: "🐈", hint: "Quand le chat du stade passe", group: "Avec les copains" },
  { id: "eternue", label: "Atchoum !", icon: "🤧", hint: "Le zombie qui éternue", group: "Le zombie" },
  { id: "tete", label: "Ma tête !", icon: "💀", hint: "Le zombie qui perd sa tête", group: "Le zombie" },
];

// ------------------------------------------------------------------ the store (IndexedDB), with everything ready in memory
const DB = "footdex-bruits";
const ST = "fx";
const key = (who: string, slot: Slot) => `${who}.${slot}`;
const ready = new Map<string, HTMLAudioElement>(); // preloaded, so that it plays at the very moment
let version = 0;
const subs = new Set<() => void>();
const changed = () => {
  version += 1;
  subs.forEach((f) => f());
};
export function useBruits() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => version,
  );
}
function open(): Promise<IDBDatabase | null> {
  return new Promise((res) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch {
      res(null);
    }
  });
}
async function tx<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((res) => {
    try {
      const r = f(db.transaction(ST, mode).objectStore(ST));
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch {
      res(null);
    }
  });
}
function prepare(k: string, blob: Blob) {
  const old = ready.get(k);
  if (old) URL.revokeObjectURL(old.src);
  const a = new Audio(URL.createObjectURL(blob));
  a.preload = "auto";
  try {
    a.load();
  } catch {
    /* fine */
  }
  ready.set(k, a);
}
/** At start: loads every recording (and moves the old ones of version 30, kept in localStorage). */
async function init() {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
  for (const who of ["statue", "excite", "poli", "joueur", "pointu", "zombie", "medecin", "arbitre"])
    for (const slot of ["peur", "aie", "joie", "bruit"] as Slot[]) {
      const old = storageGet(`footdex.bruit.${who}.${slot}`);
      if (!old) continue;
      try {
        const blob = await (await fetch(old)).blob();
        await tx("readwrite", (s) => s.put(blob, key(who, slot)));
        localStorage.removeItem(`footdex.bruit.${who}.${slot}`);
      } catch {
        /* keep it for next time */
      }
    }
  const keys = (await tx("readonly", (s) => s.getAllKeys())) ?? [];
  for (const k of keys) {
    const blob = await tx<Blob>("readonly", (s) => s.get(k) as IDBRequest<Blob>);
    if (blob) prepare(String(k), blob);
  }
  changed();
}
void init();

export const hasFx = (who: string, slot: Slot) => ready.has(key(who, slot));
export function clearFx(who: string, slot: Slot) {
  const k = key(who, slot);
  const a = ready.get(k);
  if (a) URL.revokeObjectURL(a.src);
  ready.delete(k);
  void tx("readwrite", (s) => s.delete(k));
  changed();
}

/** Plays the recorded noise of this character for this moment, at once. True when something is played. */
export function playFx(who: string, slot: Slot): boolean {
  const a = ready.get(key(who, slot));
  if (a) {
    try {
      a.pause();
      a.currentTime = 0;
      void a.play().catch(() => undefined);
      return true;
    } catch {
      return false;
    }
  }
  // the zombie's own noise, made by the app when nothing was recorded
  if (who === "zombie" && slot === "bruit") growl(0.9 + Math.random() * 0.5);
  return false;
}

// ------------------------------------------------------------------ the recorder: one touch starts, one touch stops
export const canRecord = () => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
export const MAX_SECONDS = 8;
let rec: { stop: () => void } | null = null;

/** Starts recording (8 seconds at most). `done` gets true when the noise is saved. */
export async function startRecording(who: string, slot: Slot, done: (ok: boolean, why?: string) => void) {
  stopRecording();
  if (!canRecord()) return done(false, "Ce téléphone ne permet pas d'enregistrer ici.");
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    return done(false, "Le micro n'est pas autorisé. Autorise-le dans les réglages du téléphone.");
  }
  const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported?.(t));
  const r = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
  const parts: Blob[] = [];
  r.ondataavailable = (e) => e.data.size && parts.push(e.data);
  r.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(parts, { type: r.mimeType || "audio/webm" });
    if (blob.size < 600) return done(false, "Trop court ! Touche le bouton, fais le bruit, puis touche encore pour arrêter.");
    void tx("readwrite", (s) => s.put(blob, key(who, slot))).then((ok) => {
      if (ok === null) return done(false, "Impossible de garder ce bruit sur le téléphone.");
      prepare(key(who, slot), blob);
      changed();
      done(true);
    });
  };
  const timer = window.setTimeout(() => stopRecording(), MAX_SECONDS * 1000);
  rec = {
    stop: () => {
      window.clearTimeout(timer);
      if (r.state !== "inactive") r.stop();
    },
  };
  r.start();
}
export function stopRecording() {
  const x = rec;
  rec = null;
  x?.stop();
}
export const isRecording = () => !!rec;
