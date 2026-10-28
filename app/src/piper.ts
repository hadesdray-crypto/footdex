// The "belle voix" : Piper, a real French voice (fr_FR-siwis) that runs inside the phone.
// Nothing is in the app itself (the voice weighs about 60 MB): it is downloaded once, when the child
// asks for it in the menu, then kept in the phone (browser storage, OPFS) and works with no internet.
// The library comes from the jsDelivr CDN, the voice from Hugging Face. If either is blocked
// (the Claude preview, for example), every call fails quietly and the next voice takes over.

const LIB = "https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm";
export const PIPER_VOICE = "fr_FR-siwis-medium";

type Vits = {
  predict: (o: { text: string; voiceId: string }) => Promise<Blob>;
  download: (id: string, cb?: (p: { url: string; loaded: number; total: number }) => void) => Promise<void>;
  stored: () => Promise<string[]>;
  remove?: (id: string) => Promise<void>;
};

let lib: Promise<Vits> | null = null;
function load(): Promise<Vits> {
  if (!lib) {
    // A variable URL: the bundler leaves this import alone, the browser fetches it only when needed.
    const url = LIB;
    lib = (import(/* @vite-ignore */ url) as Promise<Vits>).catch((e: unknown) => {
      lib = null;
      throw e;
    });
  }
  return lib;
}

/** True when the voice is already kept in the phone (so it works offline). */
export async function piperReady(): Promise<boolean> {
  try {
    const t = await load();
    return (await t.stored()).includes(PIPER_VOICE);
  } catch {
    return false;
  }
}

/** Downloads the voice once. `progress` goes from 0 to 1. */
export async function piperDownload(progress: (f: number) => void): Promise<boolean> {
  try {
    const t = await load();
    const parts = new Map<string, [number, number]>();
    await t.download(PIPER_VOICE, (p) => {
      parts.set(p.url, [p.loaded, p.total || 1]);
      let a = 0;
      let b = 0;
      for (const [l, tot] of parts.values()) {
        a += l;
        b += tot;
      }
      progress(b ? Math.min(1, a / b) : 0);
    });
    return (await t.stored()).includes(PIPER_VOICE);
  } catch {
    return false;
  }
}

export async function piperRemove(): Promise<void> {
  try {
    await (await load()).remove?.(PIPER_VOICE);
  } catch {
    /* nothing to remove */
  }
}

/** Makes the sound of one piece of text (a WAV file in memory). Fails when the voice is not downloaded. */
export async function piperWav(text: string): Promise<Blob> {
  const t = await load();
  return t.predict({ text, voiceId: PIPER_VOICE });
}
