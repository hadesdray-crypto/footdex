// « Mes bruitages » : each character can have his own noises, recorded with the phone's microphone
// (a scream of fear, « aïe ! », a laugh, and his very own noise). When one is recorded, it is played instead of
// the spoken words; otherwise the character speaks as usual (and the zombie growls with a sound made by the app).
import { useSyncExternalStore } from "react";
import { storageGet, storageSet } from "../util";
import { growl } from "../sound";

export type Slot = "peur" | "aie" | "joie" | "bruit";
export const SLOTS: { id: Slot; label: string; icon: string; hint: string }[] = [
  { id: "peur", label: "Cri de peur", icon: "😱", hint: "Quand il a peur du zombie" },
  { id: "aie", label: "Aïe !", icon: "🤕", hint: "Quand il tombe ou prend le ballon" },
  { id: "joie", label: "Rire de joie", icon: "😂", hint: "Quand il est content (ola, belle carte)" },
  { id: "bruit", label: "Son bruit à lui", icon: "🎵", hint: "Son petit bruit, de temps en temps" },
];
const KEY = (who: string, slot: Slot) => `footdex.bruit.${who}.${slot}`;
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

export const hasFx = (who: string, slot: Slot) => !!storageGet(KEY(who, slot));
export function clearFx(who: string, slot: Slot) {
  try {
    localStorage.removeItem(KEY(who, slot));
  } catch {
    /* fine */
  }
  changed();
}

let playing: HTMLAudioElement | null = null;
/** Plays the recorded noise of this character, if there is one. True when something is played. */
export function playFx(who: string, slot: Slot): boolean {
  const data = storageGet(KEY(who, slot));
  if (data) {
    try {
      playing?.pause();
      playing = new Audio(data);
      void playing.play().catch(() => undefined);
      return true;
    } catch {
      return false;
    }
  }
  // the zombie's own noise, made by the app when nothing was recorded
  if (who === "zombie" && slot === "bruit") {
    growl(0.9 + Math.random() * 0.5);
    return false; // the words are still said (or shown) after the growl
  }
  return false;
}

// ------------------------------------------------------------------ the recorder
export const canRecord = () => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
let rec: { r: MediaRecorder; stream: MediaStream; stop: () => void } | null = null;

/** Starts recording (3 seconds at most). `done` gets true when the noise is saved. */
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
    if (blob.size < 600) return done(false, "Trop court ! Garde le bouton appuyé pendant que tu fais le bruit.");
    const fr = new FileReader();
    fr.onload = () => {
      try {
        storageSet(KEY(who, slot), String(fr.result));
        changed();
        done(true);
      } catch {
        done(false, "Plus de place pour les bruitages.");
      }
    };
    fr.readAsDataURL(blob);
  };
  const timer = window.setTimeout(() => stopRecording(), 3000);
  rec = {
    r,
    stream,
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
