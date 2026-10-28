// Save Raphaël's progress (cards, stars, binder, character…) as a code to copy, and bring it back elsewhere:
// from the website to the Android app, or to a new phone. Everything Footdex keeps starts with « footdex. ».
const PREFIXE = "footdex.";
const ENTETE = "FOOTDEX1:";

function toutLire(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIXE) && !k.startsWith("footdex.maj.")) out[k] = localStorage.getItem(k) ?? "";
  }
  return out;
}
const b64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
const deb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function flux(data: Uint8Array, t: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([data as BlobPart]).stream().pipeThrough(t));
  return new Uint8Array(await out.arrayBuffer());
}

export async function creerCode(): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ v: 1, date: new Date().toISOString(), data: toutLire() }));
  if (typeof CompressionStream !== "undefined") return `${ENTETE}z${b64(await flux(json, new CompressionStream("gzip")))}`;
  return `${ENTETE}j${b64(json)}`;
}

/** Puts a saved progress back. Returns how many things were restored. */
export async function restaurerCode(code: string): Promise<number> {
  const c = code.replace(/\s+/g, "");
  if (!c.startsWith(ENTETE)) throw new Error("Ce n'est pas un code Footdex.");
  const corps = c.slice(ENTETE.length);
  const bytes = deb64(corps.slice(1));
  const json = corps[0] === "z" ? await flux(bytes, new DecompressionStream("gzip")) : bytes;
  const obj = JSON.parse(new TextDecoder().decode(json)) as { data?: Record<string, string> };
  const data = obj.data ?? {};
  let n = 0;
  for (const [k, v] of Object.entries(data)) {
    if (!k.startsWith(PREFIXE) || typeof v !== "string") continue;
    localStorage.setItem(k, v);
    n += 1;
  }
  return n;
}
